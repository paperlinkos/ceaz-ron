import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

// Normalization functions from PCFArenaView
function formatPCFName(rawIdOrName?: string): string | null {
  if (!rawIdOrName) return null;
  let s = rawIdOrName.trim();
  if (!s || s === '—' || s.toLowerCase() === 'none' || s.toLowerCase() === '(no pcf)') return null;

  if (s.toLowerCase().startsWith('pcf-')) {
    s = s.replace(/^pcf-(?:zc[12]-)?/i, '');
  }

  const lower = s.toLowerCase();
  if (lower === 'huois' || lower === 'huios' || lower.includes('huois') || lower.includes('huios')) {
    return 'Huios PCF';
  }
  if (lower === 'bitw' || lower.includes('bitw')) {
    return 'BITW PCF';
  }
  if (lower === 'pre-eminent' || lower === 'preeminent') {
    return 'Pre-eminent PCF';
  }
  if (lower === 'men-of-valor' || lower === 'men of valor' || lower === 'men of valour' || lower.includes('men of valo')) {
    return 'Men of Valor PCF';
  }
  if (lower === 'city-of-light' || lower === 'city of light') {
    return 'City of Light PCF';
  }
  if (lower === 'phenomenal' || lower.includes('phenomenal')) {
    return 'Phenomenal Grace PCF';
  }
  if (lower === 'exclusive' || lower === 'exclusive pcf') {
    return 'Exclusive PCF';
  }
  if (lower === 'virtuous-pillars' || lower.includes('virtuous pillars')) {
    return 'Virtuous Pillars PCF';
  }
  if (lower === 'amazing-women' || lower.includes('amazing women')) {
    return 'Amazing Women PCF';
  }
  if (lower === 'limitless-grace' || lower.includes('limitless grace')) {
    return 'Limitless Grace PCF';
  }
  if (lower === 'prime-haven' || lower.includes('prime haven')) {
    return 'Prime Haven PCF';
  }
  if (lower === 'gracious-haven' || lower.includes('gracious haven')) {
    return 'Gracious Haven PCF';
  }
  if (lower === 'great-grace' || lower.includes('great grace')) {
    return 'Great Grace PCF';
  }
  if (lower === 'extravagant-grace' || lower.includes('extravagant grace')) {
    return 'Extravagant Grace PCF';
  }
  if (lower === 'creative-outreach' || lower.includes('creative outreach')) {
    return 'Creative Outreach PCF';
  }
  if (lower === 'elite-haven' || lower.includes('elite haven')) {
    return 'Elite Haven PCF';
  }
  if (lower === 'anointed-champions' || lower.includes('anointed champion')) {
    return 'Anointed Champions PCF';
  }
  if (lower === 'radiant-ladies' || lower.includes('radiant ladies')) {
    return 'Radiant Ladies PCF';
  }
  if (lower === 'business-strategic' || lower.includes('business strategic')) {
    return 'Business Strategic PCF';
  }
  if (lower === 'light-bearers' || lower.includes('light bearers')) {
    return 'Light Bearers PCF';
  }
  if (lower === 'vibrant-generation' || lower.includes('vibrant generation')) {
    return 'Vibrant Generation PCF';
  }
  if (lower === 'luxuriant-growth' || lower.includes('luxuriant growth')) {
    return 'Luxuriant Growth PCF';
  }
  if (lower === 'medical' || lower.includes('medical')) {
    return 'Medical PCF';
  }
  if (lower === 'kinging' || lower.includes('kinging')) {
    return 'Kinging PCF';
  }
  if (lower === 'supernatural' || lower.includes('supernatural')) {
    return 'Supernatural PCF';
  }
  if (lower === 'favour' || lower === 'favor' || lower.includes('favour') || lower.includes('favor')) {
    return 'Favour PCF';
  }
  if (lower === 'exousia' || lower.includes('exousia')) {
    return 'Exousia PCF';
  }
  if (lower === 'makarios' || lower.includes('makarios')) {
    return 'Makarios PCF';
  }
  if (lower === 'oasis' || lower.includes('oasis')) {
    return 'Oasis PCF';
  }
  if (lower === 'executives' || lower.includes('executives')) {
    return 'Executives PCF';
  }
  if (lower === 'relevant' || lower.includes('relevant')) {
    return 'Relevant PCF';
  }
  if (lower === 'chesed' || lower.includes('chesed')) {
    return 'Chesed PCF';
  }
  if (lower === 'rhema' || lower.includes('rhema')) {
    return 'Rhema PCF';
  }
  if (lower === 'insight' || lower.includes('insight')) {
    return 'Insight PCF';
  }
  if (lower === 'gracious' || lower === 'gracious pcf') {
    return 'Gracious PCF';
  }
  if (lower === 'royalties' || lower.includes('royalties')) {
    return 'Royalties PCF';
  }
  if (lower === 'harvesters' || lower.includes('harvesters')) {
    return 'Harvesters PCF';
  }
  if (lower === 'legal' || lower.includes('legal')) {
    return 'Legal PCF';
  }
  if (lower === 'stars' || lower.includes('stars')) {
    return 'Stars PCF';
  }
  if (lower === 'banah' || lower.includes('banah')) {
    return 'Banah PCF';
  }
  if (lower === 'iconic' || lower.includes('iconic')) {
    return 'Iconic PCF';
  }
  if (lower === 'boundless' || lower.includes('boundless')) {
    return 'Boundless PCF';
  }

  // Already ends with PCF
  if (lower.endsWith('pcf')) {
    return s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const title = s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `${title} PCF`;
}

function extractRecordPCF(d: any): { pcfName: string; service: string } | null {
  const raw = (d.pcfName && d.pcfName.trim()) || (d.pcfId && d.pcfId.trim()) || '';
  let pcfName = formatPCFName(raw);
  if (!pcfName && d.notes) {
    const match = d.notes.match(/(?:pcf|unit):\s*([^\n,;]+)/i);
    if (match) pcfName = formatPCFName(match[1]);
  }
  if (!pcfName) return null;

  let service = 'General';
  const pid = (d.pcfId || '').toLowerCase();
  const cid = (d.churchId || '').toLowerCase();
  const cname = (d.churchName || '').toLowerCase();
  if (pid.startsWith('pcf-zc1-') || cid.includes('zonal-church-1') || cname.includes('zonal church 1')) {
    service = 'Zonal Church 1';
  } else if (pid.startsWith('pcf-zc2-') || cid.includes('zonal-church-2') || cname.includes('zonal church 2')) {
    service = 'Zonal Church 2';
  }
  return { pcfName, service };
}

// Group targets from default targets
const DEFAULT_GROUP_TARGETS: Record<string, number> = {
  'grp-zonal-church': 8000,
  'grp-kubwa-1': 2500,
  'grp-gwarinpa': 2500,
  'grp-bwari': 2000,
  'grp-gwagwalada-2': 2000,
  'grp-strategic-zonal': 2000,
  'grp-wuye-1': 2000,
  'grp-kuje': 2000,
  'grp-karmo': 2000,
  'grp-heavenly-phantheon': 2000,
  'grp-dei-dei': 2000,
  'grp-new-horizon': 2000,
  'grp-wealthy-place': 2000,
  'grp-airport-road': 2000,
  'grp-gwagwalada-1': 2000,
  'grp-dawaki': 2000,
  'grp-wuye-2': 2000,
  'grp-dutse-makaranta': 2000,
  'grp-kubwa-2': 2000,
  'grp-byazhin': 2000,
  'grp-lokogoma': 2000,
  'grp-teens-church': 2000,
  'grp-city-church': 2000,
  'grp-fruitful-vine': 2000,
};

async function main() {
  await signInWithEmailAndPassword(auth, 'zonal-admin@ron.org', 'Ceaz1@2026');
  console.log('✅ Authenticated');

  const snap = await getDocs(collection(db, 'soulWinningRecords'));
  console.log(`📦 Fetched ${snap.size} records`);

  let bornAgain = 0;
  let holySpirit = 0;
  let zonalFirst = 0;
  let zonalSecond = 0;

  const groupData: Record<string, {
    id: string;
    name: string;
    souls: number;
    target: number;
    churches: Record<string, { id: string; name: string; souls: number; target: number }>;
  }> = {};

  const pcfAgg: Record<string, { name: string; souls: number; service: string }> = {};
  const dailyCounts: Record<string, number> = {};

  snap.forEach(doc => {
    const d = doc.data();
    if (d.isBornAgain !== false) bornAgain++;
    if (d.isFilledWithHolySpirit !== false) holySpirit++;

    const churchId = d.churchId || 'unknown';
    const churchName = d.churchName || churchId || 'Unknown Church';
    const groupId = d.groupId || 'unknown';
    const groupName = d.groupName || groupId || 'Unknown Group';

    if (churchId.includes('zonal-church-1') || (churchName && churchName.toLowerCase().includes('zonal church 1'))) {
      zonalFirst++;
    }
    if (churchId.includes('zonal-church-2') || (churchName && churchName.toLowerCase().includes('zonal church 2'))) {
      zonalSecond++;
    }

    if (!groupData[groupId]) {
      groupData[groupId] = {
        id: groupId,
        name: groupName,
        souls: 0,
        target: DEFAULT_GROUP_TARGETS[groupId] || 2000,
        churches: {},
      };
    }
    groupData[groupId].souls++;
    if (groupName !== groupId && groupName !== 'Unknown Group') {
      groupData[groupId].name = groupName;
    }

    if (!groupData[groupId].churches[churchId]) {
      let churchTarget = 500;
      if (churchId.includes('zonal-church-1') || churchId.includes('zonal-church-2')) churchTarget = 5000;
      else if (churchId.includes('gwarinpa-1') || churchId.includes('kubwa') || churchId.includes('lingual')) churchTarget = 1000;

      groupData[groupId].churches[churchId] = {
        id: churchId,
        name: churchName,
        souls: 0,
        target: churchTarget,
      };
    }
    groupData[groupId].churches[churchId].souls++;
    if (churchName !== churchId && churchName !== 'Unknown Church') {
      groupData[groupId].churches[churchId].name = churchName;
    }

    // PCF extraction
    const pcfInfo = extractRecordPCF(d);
    if (pcfInfo) {
      const key = pcfInfo.pcfName;
      if (!pcfAgg[key]) {
        pcfAgg[key] = { name: pcfInfo.pcfName, souls: 0, service: pcfInfo.service };
      }
      pcfAgg[key].souls++;
      if (pcfInfo.service !== 'General') {
        pcfAgg[key].service = pcfInfo.service;
      }
    }

    if (d.createdAt) {
      const day = d.createdAt.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
  });

  const totalSouls = snap.size;

  // Process groups and their churches
  const sortedGroups = Object.values(groupData)
    .sort((a, b) => b.souls - a.souls)
    .map(g => {
      const churchesList = Object.values(g.churches)
        .sort((a, b) => b.souls - a.souls)
        .map(c => ({
          ...c,
          pctOfGroup: g.souls > 0 ? (c.souls / g.souls) * 100 : 0,
          pctOfTarget: c.target > 0 ? (c.souls / c.target) * 100 : 0,
        }));
      return {
        id: g.id,
        name: g.name,
        souls: g.souls,
        target: g.target,
        pctOfZone: (g.souls / totalSouls) * 100,
        pctOfTarget: (g.souls / g.target) * 100,
        churchCount: churchesList.length,
        churches: churchesList,
      };
    });

  // All churches flat list
  const allChurchesFlat: any[] = [];
  sortedGroups.forEach(g => {
    g.churches.forEach(c => {
      allChurchesFlat.push({
        id: c.id,
        name: c.name,
        groupId: g.id,
        groupName: g.name,
        souls: c.souls,
        target: c.target,
        pctOfGroup: c.pctOfGroup,
        pctOfZone: (c.souls / totalSouls) * 100,
        pctOfTarget: c.pctOfTarget,
      });
    });
  });
  allChurchesFlat.sort((a, b) => b.souls - a.souls);

  // PCFs ranked
  const sortedPcfs = Object.values(pcfAgg)
    .sort((a, b) => b.souls - a.souls);

  const dailySorted = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: label, count };
    });

  const output = {
    total: totalSouls,
    target: 50000,
    bornAgain,
    holySpirit,
    zonalFirst,
    zonalSecond,
    groups: sortedGroups,
    allChurches: allChurchesFlat,
    pcfs: sortedPcfs,
    daily: dailySorted,
  };

  writeFileSync('/tmp/ron_full_exact_data.json', JSON.stringify(output, null, 2));
  console.log(`\n✅ Generated full exact data!`);
  console.log(`Total: ${totalSouls}`);
  console.log(`Total Groups: ${sortedGroups.length}`);
  console.log(`Total Churches: ${allChurchesFlat.length}`);
  console.log(`Total PCFs with souls: ${sortedPcfs.length}`);
  console.log('\nTop 15 PCFs:');
  sortedPcfs.slice(0, 15).forEach((p, i) => console.log(`  ${i+1}. ${p.name} (${p.service}): ${p.souls}`));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
