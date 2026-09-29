import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, SoulWinnerProfile, AccountStatus, UserRole } from '../types/auth';
import type { AdminAuditLog, AdminAuditAction } from '../types/adminAudit';
import { generateUUID } from '../utils/uuid';

const LOCAL_USER_PROFILE_KEY = 'ron_user_profile';
const LOCAL_SOUL_WINNER_PROFILE_KEY = 'ron_soul_winner_profile';

/** Save profile to local storage for instant offline access */
function cacheLocalProfiles(userProfile: UserProfile, soulWinnerProfile?: SoulWinnerProfile | null) {
  try {
    localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(userProfile));
    if (soulWinnerProfile) {
      localStorage.setItem(LOCAL_SOUL_WINNER_PROFILE_KEY, JSON.stringify(soulWinnerProfile));
    }
  } catch (err) {
    console.warn('Failed to cache user profile locally:', err);
  }
}

/** Get cached profile from local storage when offline */
export function getCachedLocalProfiles(): {
  userProfile: UserProfile | null;
  soulWinnerProfile: SoulWinnerProfile | null;
} {
  try {
    const userStr = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
    const swStr = localStorage.getItem(LOCAL_SOUL_WINNER_PROFILE_KEY);
    return {
      userProfile: userStr ? JSON.parse(userStr) : null,
      soulWinnerProfile: swStr ? JSON.parse(swStr) : null,
    };
  } catch {
    return { userProfile: null, soulWinnerProfile: null };
  }
}

/** Clear cached local profiles on logout */
export function clearCachedProfiles() {
  localStorage.removeItem(LOCAL_USER_PROFILE_KEY);
  localStorage.removeItem(LOCAL_SOUL_WINNER_PROFILE_KEY);
}

/** Helper: Write administrative audit log entry to Firestore */
export async function writeAdminAuditLog(
  action: AdminAuditAction,
  actorId: string,
  targetId: string,
  details?: string
): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const logId = generateUUID();
    const logEntry: AdminAuditLog = {
      id: logId,
      action,
      actorId,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'adminAuditLogs', logId), logEntry);
  } catch {
    // Silent catch for unauthenticated offline or unit test contexts
  }
}

/** Create new user profile in Firestore */
export async function createUserProfile(
  profile: UserProfile,
  soulWinnerData?: Partial<SoulWinnerProfile>
): Promise<void> {
  const docRef = doc(db, 'users', profile.id);
  await setDoc(docRef, profile, { merge: true });

  const swProfile: SoulWinnerProfile = {
    id: profile.id,
    userId: profile.id,
    zoneId: soulWinnerData?.zoneId || 'zone-abuja-1',
    zoneName: soulWinnerData?.zoneName || 'Abuja Zone 1',
    groupId: soulWinnerData?.groupId,
    groupName: soulWinnerData?.groupName,
    churchId: soulWinnerData?.churchId,
    churchName: soulWinnerData?.churchName,
    pcfId: soulWinnerData?.pcfId,
    pcfName: soulWinnerData?.pcfName,
    status: profile.status,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };

  const swRef = doc(db, 'soulWinners', profile.id);
  await setDoc(swRef, swProfile, { merge: true });

  cacheLocalProfiles(profile, swProfile);
}

/** Fetch user profile from Firestore or local cache */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!navigator.onLine) {
    const cached = getCachedLocalProfiles();
    if (cached.userProfile?.id === userId) return cached.userProfile;
  }

  try {
    const docRef = doc(db, 'users', userId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as UserProfile;
      const cached = getCachedLocalProfiles();
      cacheLocalProfiles(data, cached.soulWinnerProfile);
      return data;
    }
  } catch (err) {
    console.warn('Error fetching user profile from Firestore:', err);
  }

  const cached = getCachedLocalProfiles();
  return cached.userProfile?.id === userId ? cached.userProfile : null;
}

/** Fetch Soul Winner hierarchy profile from Firestore or local cache */
export async function fetchSoulWinnerProfile(userId: string): Promise<SoulWinnerProfile | null> {
  if (!navigator.onLine) {
    const cached = getCachedLocalProfiles();
    if (cached.soulWinnerProfile?.userId === userId) return cached.soulWinnerProfile;
  }

  try {
    const docRef = doc(db, 'soulWinners', userId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as SoulWinnerProfile;
      const cached = getCachedLocalProfiles();
      if (cached.userProfile) {
        cacheLocalProfiles(cached.userProfile, data);
      }
      return data;
    }
  } catch (err) {
    console.warn('Error fetching soul winner profile from Firestore:', err);
  }

  const cached = getCachedLocalProfiles();
  return cached.soulWinnerProfile?.userId === userId ? cached.soulWinnerProfile : null;
}

/** Fetch all registered users for SuperAdmin management */
export async function getAllUsers(): Promise<UserProfile[]> {
  if (!navigator.onLine) {
    const cached = getCachedLocalProfiles();
    return cached.userProfile ? [cached.userProfile] : [];
  }
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    console.warn('Error fetching users collection from Firestore:', err);
    return [];
  }
}

/** Fetch all SoulWinner hierarchy profiles */
export async function getAllSoulWinnerProfiles(): Promise<SoulWinnerProfile[]> {
  if (!navigator.onLine) return [];
  try {
    const snap = await getDocs(collection(db, 'soulWinners'));
    return snap.docs.map((d) => d.data() as SoulWinnerProfile);
  } catch (err) {
    console.warn('Error fetching soul winners collection from Firestore:', err);
    return [];
  }
}

/** Admin helper: Assign hierarchy (PCF -> Church -> Group -> Zone) to a user */
export async function assignSoulWinnerHierarchy(
  userId: string,
  assignment: {
    pcfId: string;
    churchId: string;
    groupId: string;
    zoneId: string;
    pcfName?: string;
    churchName?: string;
    groupName?: string;
    zoneName?: string;
  },
  actorId: string = 'superAdmin'
): Promise<void> {
  const nowIso = new Date().toISOString();
  const newStatus: AccountStatus = 'active';

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: newStatus,
    updatedAt: nowIso,
  });

  const swRef = doc(db, 'soulWinners', userId);
  await updateDoc(swRef, {
    ...assignment,
    status: newStatus,
    updatedAt: nowIso,
  });

  const cached = getCachedLocalProfiles();
  if (cached.userProfile?.id === userId) {
    cached.userProfile.status = newStatus;
    const updatedSw: SoulWinnerProfile = {
      ...(cached.soulWinnerProfile || {
        id: userId,
        userId,
        createdAt: nowIso,
      }),
      ...assignment,
      status: newStatus,
      updatedAt: nowIso,
    };
    cacheLocalProfiles(cached.userProfile, updatedSw);
  }

  await writeAdminAuditLog(
    'user_assigned',
    actorId,
    userId,
    `Assigned to PCF ${assignment.pcfName || assignment.pcfId}`
  );
}

/** Admin helper: Reassign user to a new hierarchy location */
export async function reassignUserHierarchy(
  userId: string,
  assignment: {
    pcfId?: string;
    churchId?: string;
    groupId?: string;
    zoneId?: string;
    pcfName?: string;
    churchName?: string;
    groupName?: string;
    zoneName?: string;
  },
  actorId: string = 'superAdmin'
): Promise<void> {
  const nowIso = new Date().toISOString();

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { updatedAt: nowIso });

  const swRef = doc(db, 'soulWinners', userId);
  await updateDoc(swRef, {
    ...assignment,
    updatedAt: nowIso,
  });

  await writeAdminAuditLog(
    'user_reassigned',
    actorId,
    userId,
    `Reassigned to new organizational structure.`
  );
}

/** Admin helper: Update user status (active, pendingAssignment, suspended, disabled) */
export async function updateUserStatus(
  userId: string,
  newStatus: AccountStatus,
  actorId: string = 'superAdmin'
): Promise<void> {
  const nowIso = new Date().toISOString();

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: newStatus,
    updatedAt: nowIso,
  });

  const swRef = doc(db, 'soulWinners', userId);
  await updateDoc(swRef, {
    status: newStatus,
    updatedAt: nowIso,
  });

  const action: AdminAuditAction =
    newStatus === 'suspended'
      ? 'user_suspended'
      : newStatus === 'active'
      ? 'user_reactivated'
      : 'organization_updated';

  await writeAdminAuditLog(action, actorId, userId, `Status changed to ${newStatus}`);
}

/** Admin helper: Change user role */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  actorId: string = 'superAdmin'
): Promise<void> {
  const nowIso = new Date().toISOString();

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: nowIso,
  });

  await writeAdminAuditLog('role_changed', actorId, userId, `Role changed to ${newRole}`);
}

/** Admin helper: Fetch admin audit logs */
export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  try {
    const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AdminAuditLog);
  } catch (err) {
    console.warn('Error fetching admin audit logs:', err);
    return [];
  }
}
