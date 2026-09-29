# Reach Out Nigeria (RON) — Soul Winning Campaign Tracker

Real-time soul-winning tracker for the CEAZ1 Reach Out Nigeria campaign: entry forms,
duplicate detection, target tracking, leaderboards, and the upward race visualizer.

**Stack:** React 19 + TypeScript + Vite (PWA) · Firebase Auth + Cloud Firestore · Vercel

---

## How access works

There is **no sign-up**. A SuperAdmin provisions every account, then hands the
representative their credentials out of band.

| Role | Username | Where it comes from |
| --- | --- | --- |
| Church Representative | `CH-KBS` (Church Code) | Created in **SuperAdmin → User Management → Create Account** |
| Group / Zone / Super Admin | email address | Created directly in the Firebase console |

A Church Code is mapped to a synthetic Firebase Auth email behind the scenes
(`CH-KBS` → `ch-kbs@ron.org`, see `src/services/churchAccountShared.ts`), so the
representative only ever types their Church Code and password. The password is the
standard `CEAZ1@<CHURCHCODE>` format and is displayed **exactly once**, at creation or
reset. Forgot it? The rep asks their zonal admin to reset it from the same panel.

Because the mapping is deterministic, treat these passwords as shared-secret-only.
Anyone who knows a church code can guess its password, so the accounts are only as
private as the distribution channel. A SuperAdmin can suspend any account instantly.

---

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run lint
```

In dev builds only (`import.meta.env.DEV`), a **Dev Role Switcher** appears in the
bottom-left for previewing any role without a real account. It is tree-shaken out of
production builds.

---

## Deploying to Vercel

### 1. Firebase: enable Email/Password sign-in

Authentication → Sign-in method → enable **Email/Password**.

### 2. Firebase: add your domain

Authentication → Settings → **Authorized domains** → add your Vercel domain
(e.g. `your-app.vercel.app`). Without this, sign-in fails in production.

### 3. Create a service account

Firebase console → Project Settings → **Service accounts** → *Generate new private key*.

Set these in the Vercel project (**Settings → Environment Variables**). All three are
**secret — never commit them**:

| Variable | Value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | your Firebase project id |
| `FIREBASE_CLIENT_EMAIL` | from the downloaded JSON (`client_email`) |
| `FIREBASE_PRIVATE_KEY` | from the downloaded JSON (`private_key`) — paste with real newlines |
| `FIRESTORE_DATABASE_ID` | the named Firestore database, if you use a non-default one |

`FIREBASE_SERVICE_ACCOUNT` is intentionally not used: splitting the key into
`EMAIL` + `PRIVATE_KEY` avoids the escaping problems that break JSON-in-an-env-var.

### 4. Deploy

Push to `main`; Vercel builds with `npm run build` and serves `dist/`.
The `api/church-accounts.ts` serverless function is deployed automatically.

### 5. Deploy the security rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Architecture notes

**Account provisioning is server-side only.** The browser cannot create Firebase Auth
users, so `api/church-accounts.ts` uses the Admin SDK. Every request is authorised by
verifying the caller's Firebase ID token and then confirming `users/{uid}.role ==
'superAdmin'` in Firestore — the endpoint cannot be used to escalate privilege.

**No role data is trusted from the client.** `isRoleVerified` only becomes true after
`onAuthStateChanged` resolves *and* the profile has been read from Firestore. Editing
`localStorage` grants nothing; `firestore.rules` independently re-derives the role
server-side on every request.

**Passwords are never stored or transmitted to the client.** They live only in Firebase
Auth. The CSV export deliberately omits them.

| Area | Location |
| --- | --- |
| Auth provider | `src/context/AuthContext.tsx` |
| Provisioning endpoint | `api/church-accounts.ts` |
| Code/email/password mapping | `src/services/churchAccountShared.ts` |
| Client account calls | `src/services/churchAccountService.ts` |
| Admin account panel | `src/components/admin/UserManagementView.tsx` |
| Security rules | `firestore.rules` |
