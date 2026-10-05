import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { writeFileSync } from 'fs';

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

  // Fetch all records
  const snap = await getDocs(query(collection(db, 'soulWinningRecords')));
  console.log(`📦 Total records: ${snap.size}`);

  let bornAgain = 0;
  let holySpirit = 0;
  const churchCounts: Record<string, { souls: number; name: string; groupId: string; groupName: string }> = {};
  const groupCounts: Record<string, { souls: number; name: string }> = {};
  const pcfCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};

  snap.forEach(doc => {
    const d = doc.data();
    if (d.isBornAgain !== false) bornAgain++;
    if (d.isFilledWithHolySpirit !== false) holySpirit++;

    const churchId = d.churchId || 'unknown';
    const churchName = d.churchName || churchId || 'Unknown Church';
    const groupId = d.groupId || 'unknown';
    const groupName = d.groupName || groupId || 'Unknown Group';

    if (!churchCounts[churchId]) churchCounts[churchId] = { souls: 0, name: churchName, groupId, groupName };
    churchCounts[churchId].souls++;
    // Update name if we have a better one
    if (churchName !== churchId && churchName !== 'Unknown Church') {
      churchCounts[churchId].name = churchName;
    }

    if (!groupCounts[groupId]) groupCounts[groupId] = { souls: 0, name: groupName };
    groupCounts[groupId].souls++;
    if (groupName !== groupId && groupName !== 'Unknown Group') {
      groupCounts[groupId].name = groupName;
    }

    if (d.pcfName && d.pcfName.trim()) {
      const pcf = d.pcfName.trim();
      pcfCounts[pcf] = (pcfCounts[pcf] || 0) + 1;
    }

    if (d.createdAt) {
      const day = d.createdAt.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
  });

  // Sort churches by souls desc
  const topChurches = Object.entries(churchCounts)
    .sort((a, b) => b[1].souls - a[1].souls)
    .slice(0, 20)
    .map(([id, data]) => ({ id, ...data }));

  // Sort groups by souls desc
  const groupsRanked = Object.entries(groupCounts)
    .sort((a, b) => b[1].souls - a[1].souls)
    .map(([id, data]) => ({ id, ...data }));

  // Sort PCFs
  const topPcfs = Object.entries(pcfCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Sort daily
  const dailySorted = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Zonal church first/second service
  let zonalFirst = 0;
  let zonalSecond = 0;
  snap.forEach(doc => {
    const d = doc.data();
    const churchId = d.churchId || '';
    const churchName = (d.churchName || '').toLowerCase();
    if (churchId.includes('zonal-church-1') || churchName.includes('zonal church 1')) zonalFirst += 1;
    if (churchId.includes('zonal-church-2') || churchName.includes('zonal church 2')) zonalSecond += 1;
  });

  const result = {
    total: snap.size,
    target: 50000,
    bornAgain,
    holySpirit,
    groupsCount: Object.keys(groupCounts).length,
    churchesCount: Object.keys(churchCounts).length,
    topChurches,
    groupsRanked,
    topPcfs,
    daily: dailySorted,
    zonalFirst,
    zonalSecond,
  };

  writeFileSync('/tmp/ron_live_data.json', JSON.stringify(result, null, 2));
  console.log('\n📊 Summary:');
  console.log(`  Total: ${snap.size} | Born Again: ${bornAgain} | Holy Spirit: ${holySpirit}`);
  console.log(`  Groups: ${groupsRanked.length} | Churches: ${Object.keys(churchCounts).length}`);
  console.log(`  Zonal Church 1: ${zonalFirst} | Zonal Church 2: ${zonalSecond}`);
  console.log('\nTop 5 Churches:');
  topChurches.slice(0, 5).forEach((c, i) => console.log(`  ${i+1}. ${c.name} (${c.groupName}): ${c.souls}`));
  console.log('\nTop 5 Groups:');
  groupsRanked.slice(0, 5).forEach((g, i) => console.log(`  ${i+1}. ${g.name}: ${g.souls}`));
  console.log('\nTop 5 PCFs:');
  topPcfs.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. ${p.name}: ${p.count}`));
  console.log('\n✅ Data written to /tmp/ron_live_data.json');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
