# CEAZ1 Reach Out Nigeria (RON) Soul Winning Campaign Tracker

## 📌 Project Overview
**Reach Out Nigeria (RON) Harvest Tracking System** is a real-time tracking application built for managing soul-winning records, group/church targets, leaderboards, upward race visualizer, and duplicate resolution during campaign events.

- **Frontend Tech Stack**: React (Vite), TypeScript, Tailwind CSS / Custom CSS (Monochrome theme with vibrant milestone progression accents).
- **Backend & Database**: Firebase Auth, Cloud Firestore (`reach-out-nigeria-2026`).

---

## 🎯 Completed Requirements & Features

### 1. Soul Winning Entry Form
- Integrated **Born Again** and **Filled with The Spirit** status toggles on soul submission forms.
- Input validation and length bounds (`maxLength` limits on names, phone numbers, and location details) to prevent overflow or malicious payloads.

### 2. Duplicate Detection & Resolutions Tab
- Automated algorithm detecting duplicate souls by matching **First Name** and **Phone Number**.
- Dedicated **Resolutions Tab** in the SuperAdmin dashboard to review duplicate flags and mark false positives as unique.
- Asynchronous persistence of resolved pairs to the `adminDuplicateResolutions` collection in Firestore.

### 3. Target Management & Official PDF Mapping
- Preserved exact official target allocations for **20 Groups** and **98 Churches** based on the official campaign blueprint in `targetService.ts` (`OFFICIAL_TARGET_MAP`).
- Frontend SuperAdmin Settings view allows SuperAdmins to dynamically update target figures, milestones, and campaign event rules from the UI.

### 4. UI & Theme Standardization
- Unified monochrome design language across all administrative, public, and leader dashboards.
- Progression/milestone indicators retain vivid accent colors for visual contrast.
- Corrected Church Name and Code visibility in race and leaderboard displays.

### 5. Security & Authorization
- **Dev Role Switcher**: Strictly restricted to local development environments (`import.meta.env.DEV`).
- **Role Verification**: Admin components require `isRoleVerified` (verified against live Firestore profiles on auth state change).
- **Firestore Security Rules**: Fully rewritten and deployed to production (`reach-out-nigeria-2026`). Gated document access for soul records, user profiles, targets, and resolution documents.

---

## 📋 Pending Tasks & Future Roadmap

### 1. Production Firestore Composite Indexes
- As dataset volume grows during live campaigns, composite indexes for multi-field queries (e.g., filtering soul records by `churchId` + `createdAt` descending) should be defined and deployed via `firestore.indexes.json`.

### 2. Real-Time Push Notifications & Celebrations
- Trigger instant sound effects, screen flashes, or notifications on the Big Screen visualizer when a Church or Group hits major milestone thresholds (e.g. 25%, 50%, 75%, 100%).

### 3. Data Export & Analytics Reporting
- Add one-click export (CSV / Excel / PDF) for SuperAdmins and Group Leaders to download soul winning reports, church breakdowns, and contact lists.

### 4. Bulk User & Leader Management UI
- Build a SuperAdmin management panel for creating, assigning, or updating Church and Group Leader accounts in bulk without requiring direct Firestore console edits.

### 5. Offline Support & Sync Resilience
- Add PWA / offline caching so soul winning entries captured in low-connectivity zones queue locally and sync automatically when internet connectivity restores.

---

## 🛠 Project Structure & Key Files
- [`src/App.tsx`](file:///Users/christembassyabujazone1/projects/RON-harvest/src/App.tsx) — Main app layout, routing, and role-gated navigation.
- [`src/context/AuthContext.tsx`](file:///Users/christembassyabujazone1/projects/RON-harvest/src/context/AuthContext.tsx) — Auth provider and live `isRoleVerified` check.
- [`src/services/targetService.ts`](file:///Users/christembassyabujazone1/projects/RON-harvest/src/services/targetService.ts) — Official targets map and target lookup logic.
- [`src/services/duplicateDetectionService.ts`](file:///Users/christembassyabujazone1/projects/RON-harvest/src/services/duplicateDetectionService.ts) — Duplicate matching engine and Firestore resolution hooks.
- [`firestore.rules`](file:///Users/christembassyabujazone1/projects/RON-harvest/firestore.rules) — Production Firestore security rules.
