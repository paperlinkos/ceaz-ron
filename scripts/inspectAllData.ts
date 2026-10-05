import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCI-c6KnqdWtPl6mw1wMD08e3KuU6IzVPQ",
  authDomain: "reach-out-nigeria-2026.firebaseapp.com",
  projectId: "reach-out-nigeria-2026",
  storageBucket: "reach-out-nigeria-2026.firebasestorage.app",
  messagingSenderId: "284559020579",
  appId: "1:284559020579:web:6647f823fc8e410e1c1796",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  await signInWithEmailAndPassword(auth, 'zonal-admin@ron.org', 'Ceaz1@2026');
  console.log('✅ Authenticated');

  // Check pcfs collection
  const pcfSnap = await getDocs(collection(db, 'pcfs'));
  console.log(`📦 pcfs collection count: ${pcfSnap.size}`);
  pcfSnap.forEach(d => {
    console.log('PCF doc:', d.id, d.data());
  });

  // Check targets collection
  const targetSnap = await getDocs(collection(db, 'targets'));
  console.log(`📦 targets collection count: ${targetSnap.size}`);
  const pcfTargets: any[] = [];
  targetSnap.forEach(d => {
    const data = d.data();
    if (data.level === 'pcf') pcfTargets.push({ id: d.id, ...data });
  });
  console.log(`PCF targets count: ${pcfTargets.length}`);
  if (pcfTargets.length) console.log('Sample PCF targets:', pcfTargets.slice(0, 5));

  // Inspect soulWinningRecords fields related to PCF
  const snap = await getDocs(collection(db, 'soulWinningRecords'));
  console.log(`📦 soulWinningRecords count: ${snap.size}`);

  let withPcfId = 0;
  let withPcfName = 0;
  const pcfIdCounts: Record<string, number> = {};
  const pcfNameCounts: Record<string, number> = {};
  const samplePcfRecords: any[] = [];

  // Also collect all church and group distributions
  const churchSouls: Record<string, { name: string; groupId: string; groupName: string; souls: number }> = {};
  const groupSouls: Record<string, { name: string; souls: number; churches: Record<string, { name: string; souls: number }> }> = {};

  snap.forEach(doc => {
    const d = doc.data();
    if (d.pcfId) {
      withPcfId++;
      pcfIdCounts[d.pcfId] = (pcfIdCounts[d.pcfId] || 0) + 1;
    }
    if (d.pcfName) {
      withPcfName++;
      const pName = d.pcfName.trim();
      pcfNameCounts[pName] = (pcfNameCounts[pName] || 0) + 1;
    }
    if ((d.pcfId || d.pcfName) && samplePcfRecords.length < 5) {
      samplePcfRecords.push({ id: doc.id, pcfId: d.pcfId, pcfName: d.pcfName, churchId: d.churchId, churchName: d.churchName });
    }

    // church & group
    const cid = d.churchId || 'unknown';
    const cname = d.churchName || cid;
    const gid = d.groupId || 'unknown';
    const gname = d.groupName || gid;

    if (!churchSouls[cid]) churchSouls[cid] = { name: cname, groupId: gid, groupName: gname, souls: 0 };
    churchSouls[cid].souls++;
    if (cname && cname !== cid) churchSouls[cid].name = cname;

    if (!groupSouls[gid]) groupSouls[gid] = { name: gname, souls: 0, churches: {} };
    groupSouls[gid].souls++;
    if (gname && gname !== gid) groupSouls[gid].name = gname;

    if (!groupSouls[gid].churches[cid]) groupSouls[gid].churches[cid] = { name: cname, souls: 0 };
    groupSouls[gid].churches[cid].souls++;
    if (cname && cname !== cid) groupSouls[gid].churches[cid].name = cname;
  });

  console.log(`withPcfId: ${withPcfId}, withPcfName: ${withPcfName}`);
  console.log('pcfIdCounts:', pcfIdCounts);
  console.log('Top pcfNameCounts:', Object.entries(pcfNameCounts).sort((a,b) => b[1]-a[1]).slice(0, 15));
  console.log('Sample PCF records:', samplePcfRecords);

  // Check churches collection
  const churchSnap = await getDocs(collection(db, 'churches'));
  console.log(`📦 churches collection count: ${churchSnap.size}`);

  // Check groups collection
  const groupSnap = await getDocs(collection(db, 'groups'));
  console.log(`📦 groups collection count: ${groupSnap.size}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
