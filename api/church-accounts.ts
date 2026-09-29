import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  generateStrongPassword,
  generateResetPassword,
  churchCodeToAuthEmail,
  CHURCH_ACCOUNTS_COLLECTION,
  type ChurchAccountRecord,
} from '../src/services/churchAccountShared.js';

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the Vercel project environment variables.'
    );
  }

  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function getDb() {
  const app = getAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  return getFirestore(app, databaseId);
}

/**
 * Verifies the caller's Firebase ID token and confirms the Firestore profile
 * carries the superAdmin role. Without this the endpoint would let anyone
 * provision accounts on the campaign.
 */
async function requireSuperAdmin(req: VercelRequest) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return { error: 'Missing Authorization bearer token.' } as const;
  }

  const app = getAdminApp();
  let uid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(header.slice(7));
    uid = decoded.uid;
  } catch {
    return { error: 'Invalid or expired session token.' } as const;
  }

  const db = getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    return { error: 'No profile found for the signed-in account.' } as const;
  }
  if (userSnap.get('role') !== 'superAdmin') {
    return { error: 'Only a SuperAdmin can manage church accounts.' } as const;
  }

  return { uid, db };
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase();
  if (!/^CH-[A-Z0-9-]{1,24}$/.test(clean)) return null;
  return clean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let guard: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    guard = await requireSuperAdmin(req);
  } catch (err) {
    // requireSuperAdmin initialises the Admin SDK, which throws when the
    // service account env vars are missing. A throw is always a server-side
    // misconfiguration, so report it as a readable 500 rather than letting it
    // escape as an opaque FUNCTION_INVOCATION_FAILED.
    const message = err instanceof Error ? err.message : 'Authentication check failed.';
    console.error('church-accounts: admin auth guard failed:', err);
    return res.status(500).json({ error: message });
  }
  if ('error' in guard) {
    return res.status(403).json({ error: guard.error });
  }
  const { uid: actorUid, db } = guard;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'list') {
      const snap = await db.collection(CHURCH_ACCOUNTS_COLLECTION).get();
      const accounts = snap.docs.map(
        (d) => d.data() as ChurchAccountRecord
      );
      return res.status(200).json({ accounts });
    }

    if (action === 'create') {
      const churchCode = normalizeCode(body.churchCode);
      if (!churchCode) {
        return res
          .status(400)
          .json({ error: 'Church code must look like CH-KBS (letters and digits only).' });
      }

      const churchId = String(body.churchId ?? '').trim();
      const churchName = String(body.churchName ?? '').trim();
      if (!churchId || !churchName) {
        return res.status(400).json({ error: 'Church id and name are required.' });
      }

      const docId = churchCode.toLowerCase();
      const existing = await db.doc(`${CHURCH_ACCOUNTS_COLLECTION}/${docId}`).get();
      if (existing.exists) {
        return res
          .status(409)
          .json({ error: `Account ${churchCode} already exists. Reset its password instead.` });
      }

      // A random password, not generateDefaultPassword: church codes are
      // published, so a code-derived password would be guessable by anyone
      // holding the campaign roster.
      const password = generateStrongPassword();
      const email = churchCodeToAuthEmail(churchCode);
      const nowIso = new Date().toISOString();

      let userRecord;
      try {
        userRecord = await getAuth(getAdminApp()).createUser({
          email,
          password,
          emailVerified: true,
          displayName: String(body.repName ?? `${churchName} Representative`).trim(),
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/email-already-exists') {
          return res
            .status(409)
            .json({ error: `A Firebase account already exists for ${churchCode}.` });
        }
        throw err;
      }

      const record: ChurchAccountRecord = {
        churchId,
        churchName,
        churchCode,
        uid: userRecord.uid,
        loginEmail: email,
        groupId: String(body.groupId ?? '').trim(),
        groupName: String(body.groupName ?? '').trim(),
        targetSouls: Number(body.targetSouls ?? 0) || 0,
        status: 'active',
        representative: {
          name: String(body.repName ?? '').trim(),
          email: String(body.repEmail ?? '').trim().toLowerCase(),
          phone: String(body.repPhone ?? '').trim(),
          activatedAt: nowIso,
        },
        createdBy: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await db.doc(`${CHURCH_ACCOUNTS_COLLECTION}/${docId}`).set(record);
      await db.doc(`users/${userRecord.uid}`).set({
        id: userRecord.uid,
        name: record.representative?.name || `${churchName} Representative`,
        email,
        phone: record.representative?.phone || '',
        role: 'churchManager',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await db.doc(`soulWinners/${userRecord.uid}`).set({
        id: userRecord.uid,
        userId: userRecord.uid,
        zoneId: 'zone-abuja-1',
        zoneName: 'Abuja Zone 1',
        // Firestore rejects undefined field values, so store the empty string
        // rather than collapsing a blank group to undefined.
        groupId: record.groupId,
        groupName: record.groupName,
        churchId,
        churchName,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return res.status(201).json({
        account: record,
        // Returned exactly once, at creation, so the admin can hand it out.
        credentials: { churchCode, password },
      });
    }

    if (action === 'reset') {
      const churchCode = normalizeCode(body.churchCode);
      if (!churchCode) return res.status(400).json({ error: 'Invalid church code.' });

      const docId = churchCode.toLowerCase();
      const snap = await db.doc(`${CHURCH_ACCOUNTS_COLLECTION}/${docId}`).get();
      if (!snap.exists) {
        return res.status(404).json({ error: `No account found for ${churchCode}.` });
      }

      const account = snap.data() as ChurchAccountRecord;
      // An admin-supplied password wins; otherwise mint an unpredictable one.
      // Falling back to generateDefaultPassword here would return the same
      // password the account already has, making reset a silent no-op.
      const password =
        typeof body.newPassword === 'string' && body.newPassword.trim().length >= 6
          ? body.newPassword.trim()
          : generateResetPassword();

      await getAuth(getAdminApp()).updateUser(account.uid, { password });
      await snap.ref.update({ updatedAt: new Date().toISOString() });

      return res.status(200).json({ credentials: { churchCode, password } });
    }

    if (action === 'setStatus') {
      const churchCode = normalizeCode(body.churchCode);
      if (!churchCode) return res.status(400).json({ error: 'Invalid church code.' });

      const status = String(body.status ?? '');
      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Status must be active or suspended.' });
      }

      const docId = churchCode.toLowerCase();
      const snap = await db.doc(`${CHURCH_ACCOUNTS_COLLECTION}/${docId}`).get();
      if (!snap.exists) {
        return res.status(404).json({ error: `No account found for ${churchCode}.` });
      }

      const account = snap.data() as ChurchAccountRecord;
      await getAuth(getAdminApp()).updateUser(account.uid, { disabled: status === 'suspended' });
      await snap.ref.update({ status, updatedAt: new Date().toISOString() });
      await db.doc(`users/${account.uid}`).update({
        status,
        updatedAt: new Date().toISOString(),
      });

      return res.status(200).json({ churchCode, status });
    }

    if (action === 'delete') {
      const churchCode = normalizeCode(body.churchCode);
      if (!churchCode) return res.status(400).json({ error: 'Invalid church code.' });

      const docId = churchCode.toLowerCase();
      const snap = await db.doc(`${CHURCH_ACCOUNTS_COLLECTION}/${docId}`).get();
      if (!snap.exists) {
        return res.status(404).json({ error: `No account found for ${churchCode}.` });
      }

      const account = snap.data() as ChurchAccountRecord;
      await getAuth(getAdminApp()).deleteUser(account.uid);
      await snap.ref.delete();

      return res.status(200).json({ churchCode, deleted: true });
    }

    return res.status(400).json({ error: `Unknown action "${action}".` });
  } catch (err) {
    console.error('church-accounts handler error:', err);
    return res.status(500).json({ error: 'Account operation failed. See server logs.' });
  }
}
