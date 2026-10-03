# CEAZ1 Reach Out Nigeria (RON) Soul Winning Campaign Tracker

## 📌 Project Overview
**Reach Out Nigeria (RON) Harvest Tracking System** is a real-time campaign command and soul tracking platform engineered for **Christ Embassy Abuja Zone 1 (CEAZ1)**. It tracks and visualizes soul winning metrics across **24 Groups**, **127 Churches**, and thousands of soul winners and fellowships during live campaign drives.

- **Production Live URL**: [ceaz-ron.vercel.app](https://ceaz-ron.vercel.app/)
- **Frontend Tech Stack**: React 18, Vite 8, TypeScript, Orbitron typography, Tailwind CSS & Custom Vanilla CSS design tokens.
- **Backend & Persistence**: Firebase Auth, Cloud Firestore (`reach-out-nigeria-2026`), Serverless Edge API functions (`/api/church-accounts.ts`).
- **Offline & PWA**: Vite PWA (Workbox runtime caching), IndexedDB local transaction queue (`idb`), automated background reconciliation engine.
- **Test Coverage**: 21 test suites, 130 tests passing with 100% operational test coverage.

---

## 🏗 System Architecture & Key Modules

| Module | Core Files | Responsibility |
| :--- | :--- | :--- |
| **Real-time Counter & Standings** | [`counterService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/counterService.ts), [`HomeView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/HomeView.tsx) | Live counter synchronization, snapshot streaming with polling fallback, total souls, Born Again & Holy Spirit stats. |
| **Upward Race Visualizer** | [`UpwardRaceView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/UpwardRaceView.tsx), [`UpwardRaceVisualization.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/UpwardRaceVisualization.tsx) | Dynamic leaderboards, group race progressions, target percentage animations, and tiered achievement standings. |
| **PCF Arena & Service Breakdown** | [`PCFArenaView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/PCFArenaView.tsx) | Head-to-head PCF/Fellowship arena with combined "All Services" hierarchy and distinct First/Second Service tabs. |
| **Abuja Geographic Harvest Map** | [`AbujaHarvestMapView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/AbujaHarvestMapView.tsx), [`abujaLocationsData.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/abujaLocationsData.ts) | Interactive FCT territory map rendering all 127 churches with live soul win light-up pulses and territorial metrics. |
| **Live Surge Velocity Line Graph** | [`LiveSurgeLineGraph.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/LiveSurgeLineGraph.tsx), [`surgeTimelineService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/surgeTimelineService.ts) | Real-time submission timeline, surge velocity spikes, and drill-down inspection into batch soul arrivals. |
| **Big Screen Projector Mode** | [`BigScreenDisplayModal.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/BigScreenDisplayModal.tsx) | Fullscreen auditorium display integrating live counters, group race, harvest map, surge graph, and stage announcements. |
| **Campaign Directory & Data Center** | [`DirectoryView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/directory/DirectoryView.tsx), [`directoryService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/directoryService.ts) | Multi-level directory for Groups, Churches, and Souls with high-contrast light theme, dynamic filters, CSV export, and PDF reports. |
| **Account Login Tracker** | [`AccountLoginTrackerView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/AccountLoginTrackerView.tsx), [`loginTrackerService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/loginTrackerService.ts) | Super Admin monitoring portal for 127 church representative accounts, credentials, login status, and soul totals. |
| **Smart Milestone Celebrations** | [`smartMilestoneService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/smartMilestoneService.ts), [`MilestoneCelebrationManager.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/MilestoneCelebrationManager.tsx) | Automated 25%, 50%, 75%, 100% threshold celebration engine with an administrative release queue. |
| **Event Control & Countdown** | [`EventControlView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/EventControlView.tsx), [`FullScreenCountdownModal.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/FullScreenCountdownModal.tsx) | Super Admin launch countdown timer, submission lock controls, start/end schedule management, and ticker broadcasts. |
| **Offline Sync & Reconciliation** | [`indexedDbService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/indexedDbService.ts), [`reconciliationService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/reconciliationService.ts) | Local IndexedDB persistence, offline entry queueing, and multi-source data reconciliation against official targets. |

---

## 🎯 Completed Milestones & Feature History

### Phase 1–5: Foundation, Targets & Authentication
- **Soul Record Capture**: Entry form with phone validation, name constraints, and spiritual milestones (**Born Again** and **Filled with the Holy Spirit** flags).
- **Official Target Mapping**: Hardened target allocations for all 24 Groups and 127 Churches in [`targetService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/targetService.ts) matching official zonal blueprints.
- **Role Scoping & Verification**: Role-Based Access Control enforcing permissions across 5 tiers:
  1. `superAdmin`: Full unrestricted access to event controls, target edits, login tracker, and administrative actions.
  2. `zoneManager`: Abuja Zone 1 leadership visibility across all groups and churches.
  3. `groupManager`: Scoped access strictly to assigned group and its underlying churches.
  4. `churchManager`: Scoped access strictly to assigned church and souls recorded therein.
  5. `soulWinner`: Personal soul entry, submissions history, and performance stats.
- **Duplicate Detection & Resolutions**: Algorithmic matching on Name + Phone with administrative review workflow in [`DuplicateResolutionsView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/DuplicateResolutionsView.tsx).

### Phase 6–10: Big Screen, Maps & Real-Time Visualizations
- **Big Screen Projector Mode**: Fullscreen projector view for auditoriums with zero scroll, stage announcements, and live leaderboards.
- **Abuja Harvest Geographic Map**: Dual-mode interactive SVG cartography displaying all 127 churches mapped to Abuja FCT territories with real-time flash animations on soul additions.
- **Live Surge Velocity Line Graph**: Real-time velocity analytics plotting souls per minute with drill-down modals to inspect batch timestamps.
- **Campaign Countdown Clock**: Integrated countdown modal and header ticker counting down to campaign kickoff with admin-controlled submission lockout.
- **Smart Milestone Celebrations**: Automated detection of 25%, 50%, 75%, and 100% target accomplishments with celebratory confetti and approval queues.

### Phase 11–15: PCF Arena, Zonal Church & Login Tracker
- **PCF Arena Head-to-Head**: Dedicated arena view ranking PCFs / Fellowships with dynamic filtering.
- **Service Breakdown Hierarchy**: "ALL SERVICES" tab with combined PCF standings, plus separated "First Service" and "Second Service" tabs for Zonal Church PCFs (including BITW PCFs).
- **Zonal Church Master Admin Isolation**: Privacy protection for Zonal Church administrative records.
- **Church Representative Login Tracker**: Complete audit interface tracking all 127 church representative accounts, credentials, login timestamps, and soul recording counts.
- **Reconciliation Engine**: 4-way verification between Firestore, IndexedDB, and official target constants.

### Phase 16–17: UI Modernization, Light Theme & High Contrast
- **Campaign Directory Light Theme Redesign**: Transformed [`DirectoryView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/directory/DirectoryView.tsx) from dark/muddy translucent styles into a clean, high-contrast, modern light theme:
  - Inactive tabs rendered as crisp white cards (`#ffffff`) with subtle borders (`#cbd5e1`) and dark text (`#1e293b`).
  - Search & dynamic filter container upgraded to an elevated white card with dark bold dropdown labels (`#0f172a`).
  - Data tables (Groups, Churches, Souls) equipped with light slate headers (`#f8fafc`), deep black typography (`#0f172a`), reachout green phones (`#008751`), sky-blue PCF pills, and high-contrast faith badges.
- **Action Button Standardization**: Unified top action buttons (PCF Arena, Countdown, Big Screen) into a consistent button aesthetic.
- **Orbitron Typography**: Uniform futuristic typography applied across all displays, headers, stat widgets, and race leaderboards.
- **Sidebar & Mobile Navigation**: Fixed desktop sidebar with collapsible toggle, paired with a responsive slide-out mobile drawer.

---

## 🚦 Current Operational State (Where We Are)

- **Git Branch**: `main`
- **Latest Commit**: `e7bf935` (`fix(directory): redesign Campaign Directory with high-contrast light theme for crystal-clear readability`)
- **Vercel Production Deployment**: Live and aliased at [ceaz-ron.vercel.app](https://ceaz-ron.vercel.app/)
- **Build Status**: `tsc -b && vite build` passing with 0 errors (built in ~320ms)
- **Test Suite Status**: 21 test suites, 130 passing tests (`npm test`):
  - `bulkImportFlow.test.ts`
  - `counterRace.test.ts`
  - `eventControlFlow.test.ts`
  - `fullEventSimulation.test.ts`
  - `loginTracker.test.ts`
  - `officialTargetsIntegrity.test.ts`
  - `offlineDb.test.ts`
  - `organizationHierarchy.test.ts`
  - `organizationUserAssignment.test.ts`
  - `phase15ZonalReconciliation.test.ts`
  - `phase16UxMobile.test.ts`
  - `phase17ProductionImport.test.ts`
  - `recordHierarchy.test.ts`
  - `roleScope.test.ts`
  - `securityAudit.test.ts`
  - `soulRecordingFlow.test.ts`
  - `superAdminSettingsTargets.test.ts`
  - `surgeTimelineService.test.ts`
  - `targetProgressEngine.test.ts`
  - `validation.test.ts`
  - `zonalChurchBitwPcf.test.ts`

---

## 📋 Active Priorities & Live Event Checklist

1. **Live Event Operations & Quota Monitoring**:
   - Monitor Firestore read/write consumption on the `reach-out-nigeria-2026` project during high-velocity live campaign pushes.
   - Fallback polling is enabled in [`counterService.ts`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/services/counterService.ts) to safeguard against Firestore snapshot listener quota limits.
2. **PWA Cache Invalidation Awareness**:
   - Due to aggressive service worker precaching, clients viewing previous versions should perform a hard reload (`Ctrl+Shift+R` / `Cmd+Shift+R`) to instantly fetch fresh production bundles.
3. **Real-Time Milestone Announcements**:
   - Verify Super Admin queue releases for groups/churches reaching 100% target achievement during live auditorium sessions.
4. **Data Export & Archiving**:
   - Super Admins can utilize the CSV downloads and Printable Executive Dossier in Campaign Directory for post-event leadership reporting.

---

## 📁 Key File References
- Main Application Entry: [`src/App.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/App.tsx)
- Campaign Directory: [`src/components/directory/DirectoryView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/directory/DirectoryView.tsx)
- PCF Arena View: [`src/components/public/PCFArenaView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/PCFArenaView.tsx)
- Big Screen Auditorium Modal: [`src/components/public/BigScreenDisplayModal.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/BigScreenDisplayModal.tsx)
- Abuja Harvest Map: [`src/components/public/AbujaHarvestMapView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/AbujaHarvestMapView.tsx)
- Live Surge Velocity Graph: [`src/components/public/LiveSurgeLineGraph.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/public/LiveSurgeLineGraph.tsx)
- Account Login Tracker: [`src/components/admin/AccountLoginTrackerView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/AccountLoginTrackerView.tsx)
- Event Control & Command Center: [`src/components/admin/EventControlView.tsx`](file:///Users/christembassyabujazone1/projects/ceaz-ron/src/components/admin/EventControlView.tsx)
- Firestore Security Rules: [`firestore.rules`](file:///Users/christembassyabujazone1/projects/ceaz-ron/firestore.rules)
