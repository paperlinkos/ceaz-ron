import { readFileSync, writeFileSync } from 'fs';

const targetContent = readFileSync('src/services/targetService.ts', 'utf8');
const orgContent = readFileSync('src/services/organizationService.ts', 'utf8');
const d = JSON.parse(readFileSync('/tmp/ron_full_exact_data.json', 'utf8'));

// 1. Extract official church targets from OFFICIAL_TARGET_MAP
const churchTargetMatches = targetContent.matchAll(/\{\s*orgId:\s*\x27([^\x27]+)\x27,\s*level:\s*\x27church\x27,\s*target:\s*(\d+)\s*\}/g);
const targetMap = new Map<string, number>();
for (const m of churchTargetMatches) {
  targetMap.set(m[1], parseInt(m[2], 10));
}

// 1b. Extract official GROUP targets from OFFICIAL_TARGET_MAP
const groupTargetMatches = targetContent.matchAll(/\{\s*orgId:\s*\x27([^\x27]+)\x27,\s*level:\s*\x27group\x27,\s*target:\s*(\d+)\s*\}/g);
const groupTargetMap = new Map<string, number>();
for (const m of groupTargetMatches) {
  groupTargetMap.set(m[1], parseInt(m[2], 10));
}

// 2. Extract groups
const groupsMatch = orgContent.match(/export const DEFAULT_GROUPS: Group\[\] = (\[[\s\S]*?\]);/);
const defaultGroups = eval(groupsMatch[1]);
const groupMap = new Map<string, string>();
defaultGroups.forEach((g: any) => groupMap.set(g.id, g.name));

// 3. Extract all 127 churches
const churchesMatch = orgContent.match(/export const DEFAULT_CHURCHES: Church\[\] = (\[[\s\S]*?\]);/);
const defaultChurches = eval(churchesMatch[1]);

// Map recorded souls
const soulMap = new Map<string, number>();
d.allChurches.forEach((c: any) => soulMap.set(c.id, c.souls));

const all127Churches = defaultChurches.map((c: any) => {
  const souls = soulMap.get(c.id) || 0;
  const target = targetMap.get(c.id) ?? 100;
  const groupName = groupMap.get(c.groupId) || "Unknown Group";
  const pctOfTarget = target > 0 ? (souls / target) * 100 : 0;
  const pctOfZone = d.total > 0 ? (souls / d.total) * 100 : 0;
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    groupId: c.groupId,
    groupName,
    souls,
    target,
    pctOfTarget,
    pctOfZone,
  };
});

// Sort churches by souls won desc, then name asc
all127Churches.sort((a: any, b: any) => b.souls - a.souls || a.name.localeCompare(b.name));

// Rebuild groups with churches
const groupChurchMap = new Map<string, any[]>();
all127Churches.forEach((c: any) => {
  if (!groupChurchMap.has(c.groupId)) groupChurchMap.set(c.groupId, []);
  groupChurchMap.get(c.groupId)!.push(c);
});

// Ensure all 24 groups are present
defaultGroups.forEach((g: any) => {
  const existing = d.groups.find((dg: any) => dg.id === g.id);
  if (!existing) {
    d.groups.push({ id: g.id, name: g.name, souls: 0, target: groupTargetMap.get(g.id) ?? 0, pctOfTarget: 0, pctOfZone: 0, churches: [] });
  }
});

// Update d.groups with official targets and complete church lists
d.groups.forEach((g: any) => {
  const officialGroupTarget = groupTargetMap.get(g.id);
  if (officialGroupTarget !== undefined) {
    g.target = officialGroupTarget;
  }
  g.pctOfTarget = g.target > 0 ? (g.souls / g.target) * 100 : 0;
  g.pctOfZone = d.total > 0 ? (g.souls / d.total) * 100 : 0;

  const chs = groupChurchMap.get(g.id) || [];
  chs.sort((a: any, b: any) => b.souls - a.souls || a.name.localeCompare(b.name));
  g.churches = chs.map((c: any) => ({
    id: c.id,
    name: c.name,
    souls: c.souls,
    target: c.target,
    pctOfGroup: g.souls > 0 ? (c.souls / g.souls) * 100 : 0,
    pctOfTarget: c.pctOfTarget,
  }));
});

// Sort groups by souls desc
d.groups.sort((a: any, b: any) => b.souls - a.souls || a.name.localeCompare(b.name));

// Top 10 Groups
const top10Groups = d.groups.slice(0, 10);

// Top 20 Churches
const top20Churches = all127Churches.slice(0, 20);

// PCF clean consolidation
const pcfMap = new Map<string, { name: string; souls: number; service: string }>();

d.pcfs.forEach((p: any) => {
  let name = p.name;
  let service = p.service;
  const l = name.toLowerCase();

  if (l.includes("pearl")) { name = "Pearl PCF"; service = "General"; }
  else if (l.includes("brook")) { name = "Brook Cell"; service = "General"; }
  else if (l.includes("dunamis")) { name = "Dunamis Cell"; service = "General"; }
  else if (l.includes("excellent")) { name = "Excellent Cell"; service = "General"; }
  else if (l.includes("excel") && !l.includes("exclusive") && !l.includes("exousia")) { name = "Excel PCF"; service = "General"; }
  else if (l.includes("lokogoma")) { name = "CE Lokogoma PCF"; service = "General"; }
  else if (l.includes("lord")) { name = "Lords & Kings PCF"; service = "General"; }
  else if (l.includes("fullness")) { name = "CE Fullness PCF"; service = "General"; }

  if (!pcfMap.has(name)) {
    pcfMap.set(name, { name, souls: 0, service });
  }
  const item = pcfMap.get(name)!;
  item.souls += p.souls;
  if (service !== "General") item.service = service;
});

const cleanedPcfs = Array.from(pcfMap.values()).sort((a, b) => b.souls - a.souls || a.name.localeCompare(b.name));

// 4. Top 10 PCFs (both churches combined)
const top10Pcfs = cleanedPcfs.slice(0, 10);

// 5. Top 5 PCFs both churches
const top5PcfChurch1 = cleanedPcfs.filter(p => p.service === "Zonal Church 1").slice(0, 5);
const top5PcfChurch2 = cleanedPcfs.filter(p => p.service === "Zonal Church 2").slice(0, 5);

const f = (n: number) => (n ?? 0).toLocaleString('en-US');
const zcgSouls = d.groups.find((g: any) => g.id === 'grp-zonal-church')?.souls || 0;
const zcgPct = d.total > 0 ? ((zcgSouls / d.total) * 100).toFixed(1) : '0';
const zonalPct = ((d.total / 50000) * 100).toFixed(1);
const baPct = d.total > 0 ? ((d.bornAgain / d.total) * 100).toFixed(1) : '0';
const hsPct = d.total > 0 ? ((d.holySpirit / d.total) * 100).toFixed(1) : '0';

const s1Total = d.zonalFirst || 1747;
const s2Total = d.zonalSecond || 3545;

const exportData = {
  total: d.total,
  target: 50000,
  bornAgain: d.bornAgain,
  holySpirit: d.holySpirit,
  zonalFirst: s1Total,
  zonalSecond: s2Total,
  top10Groups,
  top20Churches,
  top10Pcfs,
  top5PcfChurch1,
  top5PcfChurch2,
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reach Out Nigeria 2026 — Executive Summary Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--g:#008751;--d:#071710;--d2:#0d2a1d;--gold:#FFD700;--sl:#f8fafc;--ink:#0f1f17;--mut:#5b6b62;--border:#e2e8f0}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,Arial,sans-serif;background:#c8d0cc;color:var(--ink)}
.page{width:210mm;height:297mm;max-height:297mm;margin:10mm auto;position:relative;overflow:hidden;padding:12mm 14mm 16mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.25);page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto}
@media print{body{background:#fff}.page{margin:0;box-shadow:none}.no-print{display:none!important}}
.dark{background:linear-gradient(160deg,var(--d) 0%,var(--d2) 100%);color:#fff}
.o{font-family:Orbitron,Inter,sans-serif}
h2{font-family:Orbitron,sans-serif;font-size:19px;font-weight:700;color:var(--d)}
.dark h2{color:#fff}
.hd{border-bottom:3px solid var(--g);padding-bottom:5px;margin-bottom:5mm;position:relative}
.hd:after{content:"";position:absolute;left:0;bottom:-3px;width:70px;height:3px;background:var(--gold)}
.hd p{font-size:10px;color:var(--mut);margin-top:2px}
.dark .hd p{color:rgba(255,255,255,.65)}
.ft{position:absolute;bottom:8mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:8px;color:#8a9990;border-top:1px solid #eaefec;padding-top:6px}
.dark .ft{color:rgba(255,255,255,.4);border-top-color:rgba(255,255,255,.1)}

/* ---- COVER ---- */
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 20mm}
.org{font-size:13px;letter-spacing:.22em;color:var(--gold);margin-bottom:5mm;font-weight:700}
.cover h1{font-family:Orbitron,sans-serif;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:.02em;margin-bottom:3mm}
.cover h1 span{color:var(--gold)}
.sub{font-size:15px;color:#9fd8bd;margin-bottom:9mm;font-weight:500;letter-spacing:.04em}
.ring-wrap{position:relative;width:250px;height:250px;margin:0 auto 7mm}
.ring-wrap svg{transform:rotate(-90deg)}
.rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rc b{font-family:Orbitron;font-size:48px;font-weight:900;color:#fff;line-height:1}
.rc small{font-size:11px;color:#9fd8bd;margin-top:4px;letter-spacing:.06em}
.tag{display:inline-block;background:#008751;color:#fff;font-family:Orbitron;font-size:13px;font-weight:700;padding:7px 22px;border-radius:24px;letter-spacing:.08em;margin-bottom:8mm}
.cmeta{font-size:10px;color:rgba(255,255,255,.7);line-height:1.7;margin-top:2mm}
.cmeta strong{color:#fff}
.cfoot{position:absolute;bottom:10mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:8px;color:rgba(255,255,255,.4);border-top:1px solid rgba(255,255,255,.12);padding-top:8px}

/* ---- CARDS ---- */
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:4mm}
.card{display:flex;flex-direction:column;padding:4.5mm 5mm;border-radius:8px;background:var(--sl);border-left:5px solid var(--g);position:relative;overflow:hidden}
.card.gold{border-left-color:var(--gold);background:linear-gradient(135deg,#fffdf0,#fff8dc)}
.card .ic{margin-bottom:2mm;display:flex;align-items:center}
.card .ic svg{display:block}
.card b{font-family:Orbitron;font-size:24px;font-weight:900;color:var(--d);display:block;line-height:1.1}
.card span{font-size:10px;color:var(--mut);margin-top:2px}
.lead{font-size:11px;line-height:1.6;color:#334;margin-bottom:4mm}

/* ---- BADGES & ICONS ---- */
.rk-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-family:Orbitron,sans-serif;font-size:8.5px;font-weight:700}
.rk-1{background:var(--d);color:var(--gold);border:1.5px solid var(--gold)}
.rk-2{background:#1b2e25;color:#e2e8f0;border:1.5px solid #cbd5e1}
.rk-3{background:#233b30;color:#fbd38d;border:1.5px solid #cd7f32}
.rk-norm{color:var(--mut);font-family:Orbitron;font-size:9px;font-weight:600}
.bd-mono{display:inline-flex;align-items:center;gap:2px;background:#0d2a1d;color:#4ade80;border:1px solid #166534;font-size:7.5px;font-weight:700;border-radius:3px;padding:1px 4px}
.bd-mono svg{width:8px;height:8px}

/* ---- TABLES ---- */
table{width:100%;border-collapse:collapse;font-size:9.5px}
th{background:var(--d);color:#fff;text-align:left;padding:5.5px 7px;font-weight:600;font-size:8.5px;letter-spacing:.02em}
td{padding:4.5px 7px;border-bottom:1px solid #eaefec;vertical-align:middle}
.n{text-align:right;font-variant-numeric:tabular-nums}
td.rk{width:10mm;text-align:center}
.bar{height:5px;background:#e3eae6;border-radius:3px;overflow:hidden;width:48px;display:inline-block;vertical-align:middle;margin-right:4px}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#008751,#2fd18a);border-radius:3px}
.pc{display:inline-block;width:32px;text-align:right;font-weight:700;font-size:8.5px;color:var(--g)}
tr.r1 td{background:linear-gradient(90deg,#fff8c0,#fffef0);font-weight:600}
tr.r2 td{background:linear-gradient(90deg,#e3e8ee,#f5f7f9);font-weight:600}
tr.r3 td{background:linear-gradient(90deg,#f0d8b5,#fdf5ec);font-weight:600}
.alt tbody tr:nth-child(even) td{background:#f9fbf9}

.sub-churches{font-size:7.5px;color:#5b6b62;margin-top:1.5px;line-height:1.25;font-weight:normal}
.sub-ch-grp{font-size:7.5px;color:#5b6b62;margin-top:1px;font-weight:normal}
.z-pct{font-weight:700;color:var(--g);font-size:9px}

/* DOUGHNUTS */
.dn{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm;margin-top:3.5mm}
.dn>div{background:var(--sl);border-radius:8px;padding:3.5mm 4mm;text-align:center}
.dn h3{font-family:Orbitron;font-size:11px;margin-bottom:2mm;color:var(--d)}
.dn .w{position:relative;width:130px;height:130px;margin:0 auto 2mm}
.dn .w svg{transform:rotate(-90deg)}
.dn .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.dn .c b{font-family:Orbitron;font-size:24px;color:var(--d);line-height:1}
.dn .c small{font-size:9px;color:var(--mut);margin-top:2px}
.ms{display:flex;justify-content:center;gap:2mm;margin-top:2mm}
.ms span{font-family:Orbitron;font-size:7.5px;padding:1px 5px;border-radius:3px;background:#e3eae6;color:var(--mut)}
.ms span.on{background:var(--g);color:#fff;font-weight:700}

.zon{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm;margin-top:3.5mm}
.zon div{background:var(--d);color:#fff;border-radius:6px;padding:3.5mm 4mm;text-align:center}
.zon b{font-family:Orbitron;font-size:20px;color:var(--gold);display:block;margin-bottom:1px}

/* Side-by-side PCF Tables */
.pcf-dual-grid{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm;margin-top:3mm}
.pcf-box{background:var(--sl);border-radius:8px;padding:3.5mm 4mm;border:1px solid #e2e8f0}
.pcf-box-title{font-family:Orbitron;font-size:11px;font-weight:700;color:var(--d);margin-bottom:2.5mm;display:flex;justify-content:space-between;align-items:center}
.pcf-box-title span{font-size:8px;color:var(--g);font-weight:600;font-family:Inter}

/* CLOSING */
.close{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 24mm}
.close q{font-size:16px;line-height:1.6;color:var(--gold);font-style:italic;margin-bottom:3mm;max-width:160mm}
.close cite{font-family:Orbitron;font-size:10px;letter-spacing:.18em;color:#9fd8bd;margin-bottom:10mm;display:block}
.bignum{font-family:Orbitron;font-size:68px;font-weight:900;color:#fff;line-height:1;margin-bottom:2mm}
.close p{font-size:11px;line-height:1.75;color:rgba(255,255,255,.8);max-width:150mm;margin-bottom:8mm}
.clfin{display:flex;justify-content:space-between;width:100%;max-width:160mm;font-size:8.5px;color:rgba(255,255,255,.4);border-top:1px solid rgba(255,255,255,.15);padding-top:8px}
</style>
</head>
<body>

<!-- ====== PAGE 1: COVER ====== -->
<section class="page dark cover">
  <div class="org o">CHRIST EMBASSY ABUJA ZONE 1 (CEAZ1)</div>
  <h1>REACH OUT<br><span>NIGERIA</span> 2026</h1>
  <div class="sub">Soul Winning Campaign — Executive Summary Report</div>

  <div class="ring-wrap" id="ring"></div>
  <div class="tag" id="tag"></div>

  <div class="cmeta">
    <strong>Campaign:</strong> Reach Out Nigeria 2026<br>
    <strong>Organised by:</strong> Christ Embassy Abuja Zone 1<br>
    <strong>Report Date:</strong> 5 October 2026 &nbsp;|&nbsp; <strong>Zonal Target:</strong> 50,000 Souls
  </div>

  <div class="cfoot">
    <span>CEAZ1 · RON SOUL WINNING TRACKER</span>
    <span>ceaz-ron.vercel.app</span>
    <span>CONFIDENTIAL LEADERSHIP REPORT</span>
  </div>
</section>

<!-- ====== PAGE 2: 1. GENERAL ====== -->
<section class="page">
  <div class="hd">
    <h2>1. General Overview &amp; Headline Results</h2>
    <p>Campaign performance at a glance — verified souls, targets, spiritual outcomes &amp; service distribution</p>
  </div>

  <p class="lead">
    Across Christ Embassy Abuja Zone 1, 24 groups and 127 churches mobilised soul winners
    to take the gospel to every corner of the FCT. This executive summary captures key results
    from the CEAZ1 RON tracker platform.
  </p>

  <div class="cards" id="cards"></div>

  <div style="background:var(--d);color:#fff;border-radius:8px;padding:3.8mm 5mm;margin-top:2mm;margin-bottom:3.5mm">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.14em;color:#4ade80;font-weight:800;margin-bottom:3px">Leadership Perspective</div>
    <p style="font-size:10px;line-height:1.6;color:rgba(255,255,255,.85)">
      With <strong style="color:#fff">${f(d.total)} souls recorded</strong> against a campaign goal of 50,000,
      CEAZ1 has achieved <strong style="color:#4ade80">${zonalPct}%</strong> of its overall zonal target.
      Zonal Church Group leads all groups with <strong style="color:#fff">${f(zcgSouls)} souls (${zcgPct}% of the Zone)</strong>,
      while churches across the zone including Zonal Church 2 (<strong>101.3%</strong>),
      CE Kuduru (<strong>328.0%</strong>), and CE KBS (<strong>109.3%</strong>)
      have surpassed their assigned individual church targets.
    </p>
  </div>

  <div class="hd" style="margin-top:2mm;margin-bottom:2.5mm;border-bottom-width:2px">
    <h2 style="font-size:14px">Spiritual Milestones &amp; Service Units</h2>
    <p>Confirmed spiritual impact and Zonal Church service split</p>
  </div>

  <div class="dn" id="dn"></div>

  <div class="zon">
    <div><b>${f(s1Total)}</b>Zonal Church 1<br><small style="color:#9fd8bd;font-size:8px">Souls recorded (Service 1)</small></div>
    <div><b>${f(s2Total)}</b>Zonal Church 2<br><small style="color:#9fd8bd;font-size:8px">Souls recorded (Service 2)</small></div>
  </div>

  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>1. General · Page 2</span></div>
</section>

<!-- ====== PAGE 3: 2. TOP 10 GROUPS ====== -->
<section class="page">
  <div class="hd">
    <h2>2. Top 10 Groups Standings</h2>
    <p>The 10 leading groups ranked by verified souls won — including member churches and % of Zone contribution</p>
  </div>

  <table class="alt">
    <thead>
      <tr>
        <th style="width:10mm">Rank</th>
        <th>Group Name &amp; Member Churches</th>
        <th class="n" style="width:20mm">Souls Won</th>
        <th class="n" style="width:18mm">% of Zone</th>
        <th class="n" style="width:18mm">Target</th>
        <th style="width:30mm">% Achieved</th>
      </tr>
    </thead>
    <tbody id="gt"></tbody>
  </table>

  <div style="background:#fffdf0;border:1.5px solid var(--gold);border-radius:7px;padding:3mm 4.5mm;margin-top:4mm;display:flex;justify-content:space-between;align-items:center">
    <div>
      <b style="font-family:Orbitron;font-size:11px;color:var(--d);display:block">TOP 10 GROUPS HARVEST SHARE</b>
      <span style="font-size:9.5px;color:var(--mut)">The top 10 groups account for the vast majority of all souls won in the campaign.</span>
    </div>
    <div style="text-align:right">
      <b style="font-family:Orbitron;font-size:18px;color:var(--g)">85.0%</b>
      <span style="font-size:8px;color:var(--mut);display:block">16,076 / 18,907 souls</span>
    </div>
  </div>

  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>2. Top 10 Groups · Page 3</span></div>
</section>

<!-- ====== PAGE 4: 3. TOP 20 CHURCHES ====== -->
<section class="page">
  <div class="hd">
    <h2>3. Top 20 Churches Standings</h2>
    <p>The 20 leading churches across CEAZ1 ranked by souls won — showing group affiliation, targets &amp; % contribution</p>
  </div>

  <table class="alt">
    <thead>
      <tr>
        <th style="width:9mm">#</th>
        <th>Church &amp; Group Affiliation</th>
        <th class="n" style="width:18mm">Souls Won</th>
        <th class="n" style="width:18mm">Target</th>
        <th class="n" style="width:22mm">% Target</th>
        <th class="n" style="width:18mm">% of Zone</th>
      </tr>
    </thead>
    <tbody id="ct"></tbody>
  </table>

  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>3. Top 20 Churches · Page 4</span></div>
</section>

<!-- ====== PAGE 5: 4 & 5. PCF STANDINGS ====== -->
<section class="page">
  <div class="hd">
    <h2>4. Top 10 PCFs (Both Churches Combined)</h2>
    <p>Unified ranking of the 10 leading PCFs / Fellowships across both Service 1 &amp; Service 2</p>
  </div>

  <table class="alt" style="margin-bottom:4mm">
    <thead>
      <tr>
        <th style="width:9mm">#</th>
        <th>PCF / Fellowship</th>
        <th style="width:34mm">Church / Service Unit</th>
        <th class="n" style="width:20mm">Souls Won</th>
        <th class="n" style="width:24mm">% of Service</th>
      </tr>
    </thead>
    <tbody id="pcft10"></tbody>
  </table>

  <div class="hd" style="border-bottom-width:2px;margin-bottom:3mm;padding-bottom:3px">
    <h2 style="font-size:14px">5. Top 5 PCFs by Church (Service Breakdown)</h2>
    <p>Top 5 ranking PCFs / Fellowships for Church 1 (Service 1) and Church 2 (Service 2)</p>
  </div>

  <div class="pcf-dual-grid">
    <!-- Church 1 Top 5 -->
    <div class="pcf-box">
      <div class="pcf-box-title">
        <span>• Church 1 (Zonal Church 1)</span>
        <span>${f(s1Total)} Total</span>
      </div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>PCF Name</th>
            <th class="n" style="width:15mm">Souls</th>
            <th class="n" style="width:16mm">% Svc</th>
          </tr>
        </thead>
        <tbody id="pcfc1"></tbody>
      </table>
    </div>

    <!-- Church 2 Top 5 -->
    <div class="pcf-box">
      <div class="pcf-box-title">
        <span>• Church 2 (Zonal Church 2)</span>
        <span>${f(s2Total)} Total</span>
      </div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>PCF Name</th>
            <th class="n" style="width:15mm">Souls</th>
            <th class="n" style="width:16mm">% Svc</th>
          </tr>
        </thead>
        <tbody id="pcfc2"></tbody>
      </table>
    </div>
  </div>

  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>4 &amp; 5. PCF Standings · Page 5</span></div>
</section>

<!-- ====== PAGE 6: CLOSING ====== -->
<section class="page dark close">
  <div style="font-size:40px;margin-bottom:5mm">✝</div>
  <q>And they that be wise shall shine as the brightness of the firmament; and they that turn many to righteousness as the stars for ever and ever.</q>
  <cite>DANIEL 12:3</cite>
  <div class="bignum">${f(d.total)}</div>
  <div style="color:#9fd8bd;font-size:12px;margin-bottom:8mm">Souls recorded in the CEAZ1 RON Campaign</div>
  <p>With heartfelt thanks to every soul winner, group leader, pastor, PCF leader, fellowship head, church representative and the CEAZ1 campaign coordination team whose dedication made Reach Out Nigeria 2026 possible across Abuja FCT.</p>
  <div class="clfin">
    <span>CEAZ1 RON SOUL WINNING TRACKER</span>
    <span>ceaz-ron.vercel.app</span>
    <span>5 OCTOBER 2026</span>
  </div>
</section>

<script>
const D = ${JSON.stringify(exportData, null, 2)};

// ============ ICONS ============
const ICONS = {
  trophy: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>\`,
  dove: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>\`,
  flame: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>\`,
  users: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\`,
  church: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22V10l-6-6-6 6v12"/><path d="M12 2v4"/><path d="M10 4h4"/><path d="M10 22v-5a2 2 0 0 1 4 0v5"/><path d="M6 14h.01"/><path d="M18 14h.01"/></svg>\`,
  chart: \`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>\`,
  check: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>\`
};

const f = n => n.toLocaleString('en-US');
const p1 = n => n.toFixed(1) + '%';
const bar = p => \`<span class="bar"><i style="width:\${Math.min(p,100)}%"></i></span><span class="pc">\${Math.round(p)}%</span>\`;

function svgRing(pct, sz, w, col) {
  const r = sz/2 - w, C = 2*Math.PI*r;
  return \`<svg width="\${sz}" height="\${sz}" viewBox="0 0 \${sz} \${sz}">
    <circle cx="\${sz/2}" cy="\${sz/2}" r="\${r}" fill="none" stroke="\${col[0]}" stroke-width="\${w}"/>
    <circle cx="\${sz/2}" cy="\${sz/2}" r="\${r}" fill="none" stroke="\${col[1]}" stroke-width="\${w}"
      stroke-linecap="round"
      stroke-dasharray="\${C*Math.min(pct,100)/100} \${C}"
      transform="rotate(-90 \${sz/2} \${sz/2})"/>
  </svg>\`;
}

// ---- COVER RING ----
const coverPct = D.total / D.target * 100;
document.getElementById('ring').innerHTML = svgRing(coverPct, 250, 18, ['rgba(255,255,255,.12)','#19d37f'])
  + \`<div class="rc"><b>\${p1(coverPct)}</b><small>of \${f(D.target)} target</small></div>\`;
document.getElementById('tag').textContent = f(D.total) + ' Souls Recorded';

// ---- SUMMARY CARDS ----
document.getElementById('cards').innerHTML = [
  ['gold', ICONS.trophy, D.total, 'Total Souls Won'],
  ['', ICONS.chart, p1(coverPct), 'Zonal Target Progress'],
  ['', ICONS.dove, D.bornAgain, 'Born Again (' + ((D.bornAgain/D.total)*100).toFixed(1) + '%)'],
  ['', ICONS.flame, D.holySpirit, 'Filled Holy Spirit (' + ((D.holySpirit/D.total)*100).toFixed(1) + '%)'],
  ['', ICONS.users, 24, 'Participating Groups'],
  ['', ICONS.church, 127, 'Official Churches'],
].map(c => \`<div class="card \${c[0]}"><div class="ic">\${c[1]}</div><b>\${typeof c[2]==='number'?f(c[2]):c[2]}</b><span>\${c[3]}</span></div>\`).join('');

// ---- SPIRITUAL DOUGHNUTS ----
const ba = D.bornAgain / D.total * 100;
const hs = D.holySpirit / D.total * 100;
document.getElementById('dn').innerHTML = [
  ['Born Again', ba, D.bornAgain],
  ['Filled with Holy Spirit', hs, D.holySpirit],
].map(x => \`
  <div>
    <h3>\${x[0]}</h3>
    <div class="w">
      \${svgRing(x[1], 130, 14, ['#e3eae6','#008751'])}
      <div class="c"><b>\${p1(x[1])}</b><small>\${f(x[2])} souls</small></div>
    </div>
    <div class="ms">
      \${[25,50,75,100].map(t=>\`<span class="\${x[1]>=t?'on':''}">\${t}%</span>\`).join('')}
    </div>
  </div>\`).join('');

// ---- TOP 10 GROUPS TABLE ----
document.getElementById('gt').innerHTML = D.top10Groups.map((g, i) => {
  const pct = g.pctOfTarget;
  const cls = i < 3 ? \`class="r\${i+1}"\` : '';
  const rkHtml = i === 0 ? '<span class="rk-badge rk-1">1</span>' :
                 i === 1 ? '<span class="rk-badge rk-2">2</span>' :
                 i === 2 ? '<span class="rk-badge rk-3">3</span>' :
                 \`<span class="rk-norm">\${i+1}</span>\`;
  
  const chStr = g.churches.map(c => \`\${c.name} (\${f(c.souls)})\`).join(' &bull; ');
  const subHtml = \`<div class="sub-churches"><strong>Member Churches:</strong> \${chStr}</div>\`;

  return \`<tr \${cls}>
    <td class="rk">\${rkHtml}</td>
    <td><b>\${g.name}</b>\${pct>=100?' <span class="bd-mono">'+ICONS.check+' 100%</span>':''}\${subHtml}</td>
    <td class="n"><b>\${f(g.souls)}</b></td>
    <td class="n z-pct">\${g.pctOfZone.toFixed(1)}%</td>
    <td class="n">\${f(g.target)}</td>
    <td>\${bar(pct)}</td>
  </tr>\`;
}).join('');

// ---- TOP 20 CHURCHES TABLE ----
document.getElementById('ct').innerHTML = D.top20Churches.map((c, i) => {
  const pct = c.pctOfTarget;
  const cls = i < 3 ? \`class="r\${i+1}"\` : '';
  const rkHtml = i === 0 ? '<span class="rk-badge rk-1">1</span>' :
                 i === 1 ? '<span class="rk-badge rk-2">2</span>' :
                 i === 2 ? '<span class="rk-badge rk-3">3</span>' :
                 \`<span class="rk-norm">\${i+1}</span>\`;
  
  const checkBadge = pct >= 100 ? \`<span class="bd-mono">\${ICONS.check} \${Math.round(pct)}%</span>\` :
                     \`<span class="pc">\${Math.round(pct)}%</span>\`;

  return \`<tr \${cls}>
    <td class="rk">\${rkHtml}</td>
    <td>
      <b>\${c.name}</b>
      <div class="sub-ch-grp">\${c.groupName}</div>
    </td>
    <td class="n"><b>\${f(c.souls)}</b></td>
    <td class="n">\${f(c.target)}</td>
    <td class="n">\${checkBadge}</td>
    <td class="n z-pct">\${c.pctOfZone.toFixed(1)}%</td>
  </tr>\`;
}).join('');

// ---- TOP 10 PCFS (COMBINED) ----
document.getElementById('pcft10').innerHTML = D.top10Pcfs.map((p, i) => {
  const cls = i < 3 ? \`class="r\${i+1}"\` : '';
  const rkHtml = i === 0 ? '<span class="rk-badge rk-1">1</span>' :
                 i === 1 ? '<span class="rk-badge rk-2">2</span>' :
                 i === 2 ? '<span class="rk-badge rk-3">3</span>' :
                 \`<span class="rk-norm">\${i+1}</span>\`;
  
  let pctOfSvc = 0;
  if (p.service === 'Zonal Church 1') pctOfSvc = (p.souls / D.zonalFirst) * 100;
  else if (p.service === 'Zonal Church 2') pctOfSvc = (p.souls / D.zonalSecond) * 100;
  else pctOfSvc = (p.souls / D.total) * 100;

  return \`<tr \${cls}>
    <td class="rk">\${rkHtml}</td>
    <td><b>\${p.name}</b></td>
    <td style="color:#5b6b62;font-size:8.5px">\${p.service}</td>
    <td class="n"><b>\${f(p.souls)}</b></td>
    <td class="n" style="font-weight:700;color:var(--g)">\${pctOfSvc.toFixed(1)}%</td>
  </tr>\`;
}).join('');

// ---- TOP 5 PCFS CHURCH 1 ----
document.getElementById('pcfc1').innerHTML = D.top5PcfChurch1.map((p, i) => {
  const pct = (p.souls / D.zonalFirst) * 100;
  return \`<tr>
    <td class="rk" style="font-family:Orbitron;font-size:8px;color:var(--mut)">\${i+1}</td>
    <td><b>\${p.name}</b></td>
    <td class="n"><b>\${f(p.souls)}</b></td>
    <td class="n" style="font-weight:700;color:var(--g);font-size:8px">\${pct.toFixed(1)}%</td>
  </tr>\`;
}).join('');

// ---- TOP 5 PCFS CHURCH 2 ----
document.getElementById('pcfc2').innerHTML = D.top5PcfChurch2.map((p, i) => {
  const pct = (p.souls / D.zonalSecond) * 100;
  return \`<tr>
    <td class="rk" style="font-family:Orbitron;font-size:8px;color:var(--mut)">\${i+1}</td>
    <td><b>\${p.name}</b></td>
    <td class="n"><b>\${f(p.souls)}</b></td>
    <td class="n" style="font-weight:700;color:var(--g);font-size:8px">\${pct.toFixed(1)}%</td>
  </tr>\`;
}).join('');
</script>
</body>
</html>
`;

writeFileSync('/Users/christembassyabujazone1/projects/ceaz-ron/public/ron-summary-report-2026.html', html);
writeFileSync('/Users/christembassyabujazone1/projects/ceaz-ron/public/ron-report-2026.html', html);
console.log('✅ Generated 6-page Executive Summary Report successfully!');
