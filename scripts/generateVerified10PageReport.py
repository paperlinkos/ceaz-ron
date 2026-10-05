import json

with open('/tmp/ron_verified_exact_data.json') as f:
    D = json.load(f)

# Sort allChurches: souls desc, then name asc
D['allChurches'].sort(key=lambda x: (-x['souls'], x['name']))

# Sort groups: souls desc, then name asc
D['groups'].sort(key=lambda x: (-x['souls'], x['name']))

# Build PCF list from D['pcfs']
pcf_map = {}
for p in D['pcfs']:
    name = p['name']
    service = p.get('service', 'General')
    l = name.lower()
    if 'pearl' in l: name = 'Pearl PCF'; service = 'General'
    elif 'brook' in l: name = 'Brook Cell'; service = 'General'
    elif 'dunamis' in l: name = 'Dunamis Cell'; service = 'General'
    elif 'excellent' in l: name = 'Excellent Cell'; service = 'General'
    elif 'excel' in l and 'exclusive' not in l and 'exousia' not in l: name = 'Excel PCF'; service = 'General'
    elif 'lokogoma' in l: name = 'CE Lokogoma PCF'; service = 'General'
    elif 'lord' in l: name = 'Lords & Kings PCF'; service = 'General'
    elif 'fullness' in l: name = 'CE Fullness PCF'; service = 'General'

    if name not in pcf_map:
        pcf_map[name] = {'name': name, 'souls': 0, 'service': service}
    pcf_map[name]['souls'] += p['souls']
    if service != 'General':
        pcf_map[name]['service'] = service

if 'Dynamic PCF' not in pcf_map:
    pcf_map['Dynamic PCF'] = {'name': 'Dynamic PCF', 'souls': 0, 'service': 'Zonal Church 1'}

cleaned_pcfs = sorted(pcf_map.values(), key=lambda x: (-x['souls'], x['name']))
D['pcfs'] = cleaned_pcfs

# Export updated D back to json string
d_json = json.dumps(D, indent=2)

html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reach Out Nigeria 2026 — CEAZ1 Executive Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{{--g:#008751;--d:#071710;--d2:#0d2a1d;--gold:#FFD700;--sl:#f8fafc;--ink:#0f1f17;--mut:#5b6b62;--border:#e2e8f0}}
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{{font-family:Inter,Arial,sans-serif;background:#c8d0cc;color:var(--ink)}}
.page{{width:210mm;height:297mm;max-height:297mm;margin:10mm auto;position:relative;overflow:hidden;padding:11mm 14mm 15mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.25);page-break-after:always;break-after:page}}
.page:last-child{{page-break-after:auto}}
@media print{{body{{background:#fff}}.page{{margin:0;box-shadow:none}}.no-print{{display:none!important}}}}
.dark{{background:linear-gradient(160deg,var(--d) 0%,var(--d2) 100%);color:#fff}}
.o{{font-family:Orbitron,Inter,sans-serif}}
h2{{font-family:Orbitron,sans-serif;font-size:20px;font-weight:700;color:var(--d)}}
.dark h2{{color:#fff}}
.hd{{border-bottom:3px solid var(--g);padding-bottom:5px;margin-bottom:5mm;position:relative}}
.hd:after{{content:"";position:absolute;left:0;bottom:-3px;width:70px;height:3px;background:var(--gold)}}
.hd p{{font-size:10.5px;color:var(--mut);margin-top:2px}}
.ft{{position:absolute;left:14mm;right:14mm;bottom:7mm;display:flex;justify-content:space-between;font-size:8.5px;color:var(--mut);border-top:1px solid #e2e8f0;padding-top:4px}}

/* ---- COVER ---- */
.cover{{display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;gap:0}}
.cover:before{{content:"";position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(0,135,81,.35),transparent 70%);top:50mm;left:50%;transform:translateX(-50%)}}
.cover>*{{position:relative}}
.org{{font-size:11px;letter-spacing:4px;color:#9fd8bd;font-weight:600;margin-bottom:6mm}}
.cover h1{{font-family:Orbitron;font-weight:900;font-size:46px;line-height:1.1;color:#fff;text-shadow:0 0 18px #00c46a,0 0 42px #008751;margin-bottom:3mm}}
.cover h1 span{{color:var(--gold)}}
.cover .sub{{font-size:14px;color:#cfe9dc;margin-bottom:0}}
.ring-wrap{{margin:8mm 0 4mm;position:relative;width:250px;height:250px;filter:drop-shadow(0 0 14px rgba(0,200,110,.5))}}
.ring-wrap .rc{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}}
.ring-wrap b{{font-family:Orbitron;font-size:40px;font-weight:900;color:#fff}}
.ring-wrap small{{font-size:11px;color:#9fd8bd;margin-top:2px}}
.tag{{font-size:15px;font-weight:700;color:var(--gold);margin-top:2mm}}
.cmeta{{margin-top:7mm;font-size:11px;color:rgba(255,255,255,.55);line-height:2}}
.cmeta strong{{color:white}}
.cfoot{{position:absolute;bottom:10mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:8px;color:rgba(255,255,255,.4);border-top:1px solid rgba(255,255,255,.12);padding-top:8px}}

/* ---- CARDS ---- */
.cards{{display:grid;grid-template-columns:repeat(3,1fr);gap:4.5mm;margin-bottom:5mm}}
.card{{display:flex;flex-direction:column;padding:5mm 5.5mm;border-radius:8px;background:var(--sl);border-left:5px solid var(--g);position:relative;overflow:hidden}}
.card.gold{{border-left-color:var(--gold);background:linear-gradient(135deg,#fffdf0,#fff8dc)}}
.card .ic{{margin-bottom:2.5mm;display:flex;align-items:center}}
.card .ic svg{{display:block}}
.card b{{font-family:Orbitron;font-size:26px;font-weight:900;color:var(--d);display:block;line-height:1.1}}
.card span{{font-size:10.5px;color:var(--mut);margin-top:2px}}
.lead{{font-size:11.5px;line-height:1.65;color:#334;margin-bottom:5mm}}

/* ---- MONOCHROME BADGES & ICONS ---- */
.rk-badge{{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;font-family:Orbitron,sans-serif;font-size:8px;font-weight:700}}
.rk-1{{background:var(--d);color:var(--gold);border:1.5px solid var(--gold)}}
.rk-2{{background:#1b2e25;color:#e2e8f0;border:1.5px solid #cbd5e1}}
.rk-3{{background:#233b30;color:#fbd38d;border:1.5px solid #cd7f32}}
.rk-norm{{color:var(--mut);font-family:Orbitron;font-size:8.5px;font-weight:600}}
.bd-mono{{display:inline-flex;align-items:center;gap:2px;background:#0d2a1d;color:#4ade80;border:1px solid #166534;font-size:7.5px;font-weight:700;border-radius:3px;padding:1px 4px}}
.bd-mono svg{{width:8px;height:8px}}

/* ---- TABLES ---- */
table{{width:100%;border-collapse:collapse;font-size:9.5px}}
th{{background:var(--d);color:#fff;text-align:left;padding:4.5px 6px;font-weight:600;font-size:8.5px;letter-spacing:.02em}}
td{{padding:1.8px 6px;border-bottom:1px solid #eaefec;vertical-align:middle}}
.n{{text-align:right;font-variant-numeric:tabular-nums}}
td.rk{{width:9mm;text-align:center}}
.bar{{height:5px;background:#e3eae6;border-radius:3px;overflow:hidden;width:45px;display:inline-block;vertical-align:middle;margin-right:4px}}
.bar i{{display:block;height:100%;background:linear-gradient(90deg,#008751,#2fd18a);border-radius:3px}}
.pc{{display:inline-block;width:30px;text-align:right;font-weight:700;font-size:8.5px;color:var(--g)}}
tr.r1 td{{background:linear-gradient(90deg,#fff8c0,#fffef0);font-weight:600}}
tr.r2 td{{background:linear-gradient(90deg,#e3e8ee,#f5f7f9);font-weight:600}}
tr.r3 td{{background:linear-gradient(90deg,#f0d8b5,#fdf5ec);font-weight:600}}
.alt tbody tr:nth-child(even) td{{background:#f9fbf9}}

/* Group race table specific */
.gt-table th{{padding:4px 5px;font-size:8px}}
.gt-table td{{padding:1.5px 5px;height:7.8mm}}
.sub-churches{{font-size:6.8px;color:#5b6b62;margin-top:0.5px;line-height:1.15;font-weight:normal;max-height:2.4em;overflow:hidden}}
.sub-ch-grp{{font-size:6.8px;color:#5b6b62;margin-top:0.5px;line-height:1.15;font-weight:normal}}
.z-pct{{font-weight:700;color:var(--g);font-size:8.5px}}

/* Church 2-column grid (32 rows per column, zero overlap) */
.church-grid{{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm}}
.church-grid table th{{font-size:8px;padding:3.5px 5px}}
.church-grid table td{{padding:1.6px 5px;height:4.6mm}}

/* PCF 2-column grid */
.pcf-table-grid{{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm}}
.pcf-table-grid table th{{font-size:8px;padding:4px 5px}}
.pcf-table-grid table td{{padding:1.8px 5px;height:4.4mm}}
.pcf-sub{{font-size:6.8px;color:#5b6b62}}

.zon{{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}}
.zon div{{background:var(--d);color:#fff;border-radius:6px;padding:4mm;text-align:center}}
.zon b{{font-family:Orbitron;font-size:24px;color:var(--gold);display:block;margin-bottom:2px}}

/* ---- CHART ---- */
.call{{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}}
.call div{{border:2px solid var(--gold);border-radius:6px;padding:4mm 5mm;background:#fffdf0}}
.call b{{font-family:Orbitron;font-size:18px;display:block;color:var(--d)}}
.call span{{font-size:10px;color:var(--mut)}}

/* ---- MILESTONES ---- */
.dn{{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm}}
.dn>div{{text-align:center}}
.dn .w{{position:relative;width:58mm;height:58mm;margin:0 auto 5mm}}
.dn .w .c{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}}
.dn .w b{{font-family:Orbitron;font-size:28px;font-weight:900;color:var(--g)}}
.dn .w small{{font-size:10px;color:var(--mut)}}
.dn h3{{font-size:14px;font-weight:700;margin-bottom:4mm;color:var(--d)}}
.ms{{display:flex;gap:5px;justify-content:center}}
.ms span{{width:13mm;height:13mm;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-size:9px;font-weight:700;background:#e8eeea;color:#9aa8a0;border:2px dashed #c3cfc8}}
.ms span.on{{background:linear-gradient(135deg,#ffe766,#e0b400);color:#4a3a00;border:2px solid #b89500;box-shadow:0 2px 8px rgba(224,180,0,.45)}}

/* ---- TROPHY WALL (13 Achievers) ---- */
.wall{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}}
.tr{{text-align:center;border-radius:8px;padding:3.5mm 2.5mm;background:linear-gradient(160deg,var(--d),var(--d2));color:#fff;border:1.5px solid var(--gold)}}
.tr svg{{margin:0 auto 1.5mm;display:block}}
.tr h4{{font-size:10px;margin:1.5mm 0 1mm;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.tr b{{font-family:Orbitron;font-size:16px;color:var(--gold);display:block;line-height:1.1}}
.tr small{{font-size:8px;color:#9fd8bd;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}}
.tr .ach-tag{{margin-top:1.5mm;font-size:9px;color:var(--gold);font-family:Orbitron;font-weight:700}}

/* ---- CLOSING ---- */
.close{{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:0}}
.close:before{{content:"";position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(0,135,81,.25),transparent 70%);bottom:0;right:0;pointer-events:none}}
.close>*{{position:relative}}
.close q{{font-family:Orbitron;font-size:17px;line-height:1.6;max-width:155mm;quotes:none;color:#fff;margin:6mm 0 3mm}}
.close cite{{color:var(--gold);font-style:normal;font-weight:700;font-size:11px;letter-spacing:.1em;margin-bottom:8mm;display:block}}
.close p{{font-size:11.5px;color:#cfe9dc;max-width:135mm;line-height:1.8}}
.close .bignum{{font-family:Orbitron;font-size:46px;font-weight:900;color:#fff;text-shadow:0 0 20px #2fd18a;margin:6mm 0 2mm}}
.clfin{{position:absolute;bottom:10mm;left:14mm;right:14mm;font-size:9px;color:rgba(255,255,255,.45);display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);padding-top:6px}}
</style>
</head>
<body>

<!-- ====== PAGE 1: COVER ====== -->
<section class="page dark cover">
  <div class="org o">CHRIST EMBASSY ABUJA ZONE 1 (CEAZ1)</div>
  <h1>REACH OUT<br><span>NIGERIA</span> 2026</h1>
  <div class="sub">Soul Winning Campaign — Executive Report</div>

  <div class="ring-wrap" id="ring"><!-- rendered by JS --></div>
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

<!-- ====== PAGE 2: EXECUTIVE SUMMARY ====== -->
<section class="page">
  <div class="hd"><h2>Executive Summary</h2><p>Campaign results at a glance — 5 October 2026</p></div>
  <p class="lead">
    Across Christ Embassy Abuja Zone 1, 24 groups and 127 churches mobilised their soul winners
    to take the gospel to every corner of the FCT. This report captures the official verified targets,
    souls won, and performance standings across the entire zone.
  </p>
  <div class="cards" id="cards"></div>
  <div style="background:var(--d);color:#fff;border-radius:8px;padding:4.5mm 5.5mm;margin-top:3.5mm">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.14em;color:#4ade80;font-weight:800;margin-bottom:5px">Leadership Perspective</div>
    <p style="font-size:10.5px;line-height:1.65;color:rgba(255,255,255,.85)">
      With <strong style="color:#fff">18,802 souls recorded</strong> against the official campaign target of <strong style="color:#fff">50,000</strong>,
      CEAZ1 achieved <strong style="color:#4ade80">37.6%</strong> overall zonal performance.
      Zonal Church Group led the zone with <strong style="color:#fff">6,473 souls (34.4% of the Zone)</strong>, followed by Kubwa 1 Group (1,758 souls), Gwarinpa Group (1,684 souls), and Bwari Group (1,504 souls).
      Against official church targets, exactly <strong style="color:#FFD700">13 churches</strong> surpassed 100% target achievement, led by <strong style="color:#fff">CE KBS 3 (360.0%)</strong>, <strong style="color:#fff">CE Kuduru (240.0%)</strong>, <strong style="color:#fff">CE KBS 2 (180.0%)</strong>, <strong style="color:#fff">CE Chukunku (166.0%)</strong>, and <strong style="color:#fff">CE Asokoro (160.0%)</strong>.
      All 127 churches and 24 groups are fully accounted for in this report.
    </p>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Executive Summary · Page 2</span></div>
</section>

<!-- ====== PAGE 3: GROUP RACE ====== -->
<section class="page">
  <div class="hd"><h2>Group Race Standings</h2><p>All 24 groups ranked by souls won — official targets (50,000 total) and % contribution to zone</p></div>
  <table class="gt-table">
    <thead>
      <tr>
        <th style="width:8mm">Rank</th>
        <th>Group Name &amp; Member Churches</th>
        <th class="n" style="width:16mm">Souls Won</th>
        <th class="n" style="width:15mm">% of Zone</th>
        <th class="n" style="width:15mm">Target</th>
        <th style="width:24mm">% Achieved</th>
      </tr>
    </thead>
    <tbody id="gt"></tbody>
  </table>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Group Race · Page 3</span></div>
</section>

<!-- ====== PAGE 4: ALL 127 CHURCHES — PART 1 (RANKS 1-64) ====== -->
<section class="page">
  <div class="hd"><h2>All 127 Churches Standings — Part 1</h2><p>Official campaign standings (#1 to #64) — showing souls won, official target &amp; zone contribution</p></div>
  <div class="church-grid">
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>Church &amp; Group Info</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:15mm">% Target</th>
          </tr>
        </thead>
        <tbody id="ct1"></tbody>
      </table>
    </div>
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>Church &amp; Group Info</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:15mm">% Target</th>
          </tr>
        </thead>
        <tbody id="ct2"></tbody>
      </table>
    </div>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Church Leaderboard (Part 1) · Page 4</span></div>
</section>

<!-- ====== PAGE 5: ALL 127 CHURCHES — PART 2 (RANKS 65-127) ====== -->
<section class="page">
  <div class="hd"><h2>All 127 Churches Standings — Part 2</h2><p>Official campaign standings (#65 to #127) — including active and pending mobilization units</p></div>
  <div class="church-grid">
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>Church &amp; Group Info</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:15mm">% Target</th>
          </tr>
        </thead>
        <tbody id="ct3"></tbody>
      </table>
    </div>
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>Church &amp; Group Info</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:15mm">% Target</th>
          </tr>
        </thead>
        <tbody id="ct4"></tbody>
      </table>
    </div>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Church Leaderboard (Part 2) · Page 5</span></div>
</section>

<!-- ====== PAGE 6: PCF & FELLOWSHIP HIGHLIGHTS ====== -->
<section class="page">
  <div class="hd"><h2>PCF &amp; Fellowship Complete Roll Call</h2><p>All participating PCFs &amp; fellowships ranked by verified souls — including all service units</p></div>
  <div class="pcf-table-grid">
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>PCF / Fellowship</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:16mm">% Service</th>
          </tr>
        </thead>
        <tbody id="pcft1"></tbody>
      </table>
    </div>
    <div>
      <table class="alt">
        <thead>
          <tr>
            <th style="width:7mm">#</th>
            <th>PCF / Fellowship</th>
            <th class="n" style="width:14mm">Souls</th>
            <th class="n" style="width:16mm">% Service</th>
          </tr>
        </thead>
        <tbody id="pcft2"></tbody>
      </table>
    </div>
  </div>
  <div style="font-family:Orbitron;font-size:11.5px;margin:4.5mm 0 2mm;color:var(--g);font-weight:700">Zonal Church Service Breakdown</div>
  <div class="zon">
    <div><b>1,741</b>Zonal Church 1<br><small style="color:#9fd8bd;font-size:8px">Souls recorded (Service 1)</small></div>
    <div><b>3,545</b>Zonal Church 2<br><small style="color:#9fd8bd;font-size:8px">Souls recorded (Service 2)</small></div>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>PCF &amp; Fellowships · Page 6</span></div>
</section>

<!-- ====== PAGE 7: DAILY ACTIVITY ====== -->
<section class="page">
  <div class="hd"><h2>Daily Activity Surge</h2><p>Souls submitted per campaign day — Oct 1–5, 2026</p></div>
  <div id="chart" style="margin-top:5mm"></div>
  <div class="call" id="call"></div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Activity Timeline · Page 7</span></div>
</section>

<!-- ====== PAGE 8: SPIRITUAL MILESTONES ====== -->
<section class="page">
  <div class="hd"><h2>Spiritual Milestones</h2><p>Born Again and Filled with the Holy Spirit — as recorded during soul winning</p></div>
  <div class="dn" id="dn"></div>
  <div style="background:var(--d);color:#fff;border-radius:8px;padding:5mm 6mm;margin-top:6mm">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#4ade80;font-weight:800;margin-bottom:6px">Spiritual Measurement</div>
    <p style="font-size:11px;line-height:1.7;color:rgba(255,255,255,.82)">
      Of 18,802 souls recorded, <strong style="color:#fff">16,229 (86.3%)</strong> were confirmed Born Again
      and <strong style="color:#fff">12,396 (65.9%)</strong> were confirmed Filled with the Holy Spirit.
      These spiritual outcomes are tracked per soul record in the RON platform database.
    </p>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Spiritual Milestones · Page 8</span></div>
</section>

<!-- ====== PAGE 9: 100% CLUB ====== -->
<section class="page">
  <div class="hd"><h2>100% Target Achievers</h2><p>13 Churches that reached or surpassed their official campaign soul-winning target</p></div>
  <div class="wall" id="wall"></div>
  <div style="margin-top:5mm;text-align:center;padding:4mm;border-radius:10px;background:var(--d);color:#fff">
    <div style="font-family:Orbitron;font-size:22px;color:var(--gold);margin-bottom:3px">★ EVERY SOUL COUNTS ★</div>
    <div style="font-size:10px;color:rgba(255,255,255,.7)">Recognition of official target excellence — Christ Embassy Abuja Zone 1</div>
  </div>
  <div class="ft"><span>Reach Out Nigeria 2026 · CEAZ1</span><span>Target Achievers · Page 9</span></div>
</section>

<!-- ====== PAGE 10: CLOSING ====== -->
<section class="page dark close">
  <div style="font-size:40px;margin-bottom:5mm">✝</div>
  <q>"And they that be wise shall shine as the brightness of the firmament; and they that turn many to righteousness as the stars for ever and ever."</q>
  <cite>DANIEL 12:3</cite>
  <div class="bignum">18,802</div>
  <div style="color:#9fd8bd;font-size:12px;margin-bottom:6mm">Souls recorded in the CEAZ1 RON Campaign</div>
  <p>With heartfelt thanks to every soul winner, group leader, pastor, PCF leader, fellowship head, church representative and the CEAZ1 campaign coordination team whose dedication made Reach Out Nigeria 2026 possible across Abuja FCT.</p>
  <div class="clfin">
    <span>CEAZ1 RON SOUL WINNING TRACKER</span>
    <span>ceaz-ron.vercel.app</span>
    <span>5 OCTOBER 2026</span>
  </div>
</section>

<script>
// ============ REAL DATA FROM FIREBASE (ALL 127 CHURCHES & 24 GROUPS) ============
const D = {d_json};

// ============ MONOCHROME ICONS ============
const ICONS = {{
  trophy: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  dove: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  flame: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  users: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  church: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22V10l-6-6-6 6v12"/><path d="M12 2v4"/><path d="M10 4h4"/><path d="M10 22v-5a2 2 0 0 1 4 0v5"/><path d="M6 14h.01"/><path d="M18 14h.01"/></svg>`,
  chart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
}};

// ============ HELPERS ============
const f = n => n.toLocaleString('en-US');
const p1 = n => n.toFixed(1) + '%';
const bar = p => `<span class="bar"><i style="width:${{Math.min(p,100)}}%"></i></span><span class="pc">${{Math.round(p)}}%</span>`;

function svgRing(pct, sz, w, col) {{
  const r = sz/2 - w, C = 2*Math.PI*r;
  return `<svg width="${{sz}}" height="${{sz}}" viewBox="0 0 ${{sz}} ${{sz}}">
    <circle cx="${{sz/2}}" cy="${{sz/2}}" r="${{r}}" fill="none" stroke="${{col[0]}}" stroke-width="${{w}}"/>
    <circle cx="${{sz/2}}" cy="${{sz/2}}" r="${{r}}" fill="none" stroke="${{col[1]}}" stroke-width="${{w}}"
      stroke-linecap="round"
      stroke-dasharray="${{C*Math.min(pct,100)/100}} ${{C}}"
      transform="rotate(-90 ${{sz/2}} ${{sz/2}})"/>
  </svg>`;
}}

// ---- COVER RING ----
const coverPct = D.total / D.target * 100;
document.getElementById('ring').innerHTML = svgRing(coverPct, 250, 18, ['rgba(255,255,255,.12)','#19d37f'])
  + `<div class="rc"><b>${{p1(coverPct)}}</b><small>of ${{f(D.target)}} target</small></div>`;
document.getElementById('tag').textContent = f(D.total) + ' Souls Recorded';

// ---- SUMMARY CARDS (Monochrome icons) ----
document.getElementById('cards').innerHTML = [
  ['gold', ICONS.trophy, D.total, 'Total Souls Won'],
  ['', ICONS.dove, D.bornAgain, 'Born Again (86.3%)'],
  ['', ICONS.flame, D.holySpirit, 'Filled Holy Spirit (65.9%)'],
  ['', ICONS.users, D.groups.length, 'Participating Groups (24)'],
  ['', ICONS.church, D.allChurches.length, 'Official Churches (127)'],
  ['', ICONS.chart, p1(coverPct), 'Overall Target Achievement'],
].map(c => `<div class="card ${{c[0]}}"><div class="ic">${{c[1]}}</div><b>${{typeof c[2]==='number'?f(c[2]):c[2]}}</b><span>${{c[3]}}</span></div>`).join('');

// ---- GROUP RACE TABLE ----
document.getElementById('gt').innerHTML = D.groups.map((g, i) => {{
  const pct = g.pctOfTarget;
  const cls = i < 3 ? `class="r${{i+1}}"` : '';
  const rkHtml = i === 0 ? '<span class="rk-badge rk-1">1</span>' :
                 i === 1 ? '<span class="rk-badge rk-2">2</span>' :
                 i === 2 ? '<span class="rk-badge rk-3">3</span>' :
                 `<span class="rk-norm">${{i+1}}</span>`;
  
  const chStr = g.churches.map(c => `${{c.name}} (${{f(c.souls)}} &middot; ${{c.pctOfGroup.toFixed(1)}}%)`).join(' &bull; ');
  const pastorStr = g.pastor ? ` &middot; <span style="color:#008751">${{g.pastor}}</span>` : '';
  const subHtml = `<div class="sub-churches"><strong>Churches:</strong> ${{chStr}}</div>`;

  return `<tr ${{cls}}>
    <td class="rk">${{rkHtml}}</td>
    <td><b>${{g.name}}</b>${{pastorStr}}${{pct>=100?' <span class="bd-mono">'+ICONS.check+' 100%</span>':''}}${{subHtml}}</td>
    <td class="n"><b>${{f(g.souls)}}</b></td>
    <td class="n z-pct">${{g.pctOfZone.toFixed(1)}}%</td>
    <td class="n">${{f(g.target)}}</td>
    <td>${{bar(pct)}}</td>
  </tr>`;
}}).join('');

// ---- ALL 127 CHURCHES SPLIT CLEANLY ACROSS PAGE 4 & PAGE 5 ----
// Part 1: Churches 1-64 (32 in col 1, 32 in col 2)
const chPart1_col1 = D.allChurches.slice(0, 32);
const chPart1_col2 = D.allChurches.slice(32, 64);

// Part 2: Churches 65-127 (32 in col 1, 31 in col 2)
const chPart2_col1 = D.allChurches.slice(64, 96);
const chPart2_col2 = D.allChurches.slice(96, 127);

function renderChurchRows(list, startIdx) {{
  return list.map((c, i) => {{
    const idx = startIdx + i + 1;
    const pct = c.pctOfTarget;
    const rkHtml = idx === 1 ? '<span class="rk-badge rk-1">1</span>' :
                   idx === 2 ? '<span class="rk-badge rk-2">2</span>' :
                   idx === 3 ? '<span class="rk-badge rk-3">3</span>' :
                   `<span class="rk-norm">${{idx}}</span>`;
    const checkBadge = pct >= 100 ? `<span class="bd-mono">${{ICONS.check}} ${{Math.round(pct)}}%</span>` :
                       c.souls === 0 ? `<span style="color:#94a3b8;font-size:7.5px">0%</span>` :
                       `<span class="pc" style="font-size:7.5px">${{Math.round(pct)}}%</span>`;
    return `<tr>
      <td class="rk">${{rkHtml}}</td>
      <td>
        <b>${{c.name}}</b>
        <div class="sub-ch-grp">${{c.groupName}} &middot; Target: ${{f(c.target)}} &middot; ${{c.pctOfZone.toFixed(1)}}% Zone</div>
      </td>
      <td class="n"><b>${{c.souls > 0 ? f(c.souls) : '<span style="color:#94a3b8">0</span>'}}</b></td>
      <td class="n">${{checkBadge}}</td>
    </tr>`;
  }}).join('');
}}

document.getElementById('ct1').innerHTML = renderChurchRows(chPart1_col1, 0);
document.getElementById('ct2').innerHTML = renderChurchRows(chPart1_col2, 32);
document.getElementById('ct3').innerHTML = renderChurchRows(chPart2_col1, 64);
document.getElementById('ct4').innerHTML = renderChurchRows(chPart2_col2, 96);

// ---- PCF LEADERS TABLE (ALL PCFs including 0 souls, 2 columns) ----
const pcfHalf = Math.ceil(D.pcfs.length / 2);
const pcfCol1 = D.pcfs.slice(0, pcfHalf);
const pcfCol2 = D.pcfs.slice(pcfHalf);

const s1Total = D.zonalFirst || 1741;
const s2Total = D.zonalSecond || 3545;

function renderPcfRows(list, startIdx) {{
  return list.map((p, i) => {{
    const idx = startIdx + i + 1;
    const rkHtml = idx === 1 ? '<span class="rk-badge rk-1">1</span>' :
                   idx === 2 ? '<span class="rk-badge rk-2">2</span>' :
                   idx === 3 ? '<span class="rk-badge rk-3">3</span>' :
                   `<span class="rk-norm">${{idx}}</span>`;
    
    // Calculate % of corresponding service
    let pctOfSvc = 0;
    if (p.service === 'Zonal Church 1') pctOfSvc = (p.souls / s1Total) * 100;
    else if (p.service === 'Zonal Church 2') pctOfSvc = (p.souls / s2Total) * 100;
    else pctOfSvc = (p.souls / D.total) * 100;

    return `<tr>
      <td class="rk">${{rkHtml}}</td>
      <td>
        <b>${{p.name}}</b>
        <div class="pcf-sub">${{p.service}}</div>
      </td>
      <td class="n"><b>${{p.souls > 0 ? f(p.souls) : '<span style="color:#94a3b8">0</span>'}}</b></td>
      <td class="n" style="font-size:7.5px;font-weight:700;color:${{p.souls > 0 ? 'var(--g)' : '#94a3b8'}}">${{pctOfSvc.toFixed(1)}}%</td>
    </tr>`;
  }}).join('');
}}

document.getElementById('pcft1').innerHTML = renderPcfRows(pcfCol1, 0);
document.getElementById('pcft2').innerHTML = renderPcfRows(pcfCol2, pcfHalf);

// ---- DAILY CHART ----
(function(){{
  const d = D.daily, W=640, H=280, m=40;
  const M = Math.max(...d.map(x=>x.count));
  const xi = i => m + i*(W-2*m)/(d.length-1);
  const yi = v => H-m - v/M*(H-2*m-10);
  const pk = d.indexOf(d.reduce((a,b)=>a.count>b.count?a:b));

  let s = `<svg viewBox="0 0 ${{W}} ${{H}}" width="100%">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#008751" stop-opacity=".3"/>
    <stop offset="1" stop-color="#008751" stop-opacity="0"/>
  </linearGradient></defs>`;

  for(let k=0;k<=4;k++){{
    const v=M*k/4;
    s+=`<line x1="${{m}}" x2="${{W-m}}" y1="${{yi(v)}}" y2="${{yi(v)}}" stroke="#e2e8f0"/>
    <text x="${{m-6}}" y="${{yi(v)+4}}" font-size="9" fill="#5b6b62" text-anchor="end">${{Math.round(v).toLocaleString()}}</text>`;
  }}

  const pts = d.map((v,i)=>xi(i)+','+yi(v.count)).join(' ');
  s += `<polygon points="${{xi(0)}},${{H-m}} ${{pts}} ${{xi(d.length-1)}},${{H-m}}" fill="url(#lg)"/>
  <polyline points="${{pts}}" fill="none" stroke="#008751" stroke-width="3" stroke-linejoin="round"/>`;

  d.forEach((v,i)=>{{
    const isPeak = i===pk;
    s+=`<circle cx="${{xi(i)}}" cy="${{yi(v.count)}}" r="${{isPeak?7:4}}" fill="${{isPeak?'#FFD700':'#008751'}}" stroke="#fff" stroke-width="2"/>
    <text x="${{xi(i)}}" y="${{H-m+16}}" font-size="9" fill="#5b6b62" text-anchor="middle">${{v.date}}</text>
    <text x="${{xi(i)}}" y="${{yi(v.count)-11}}" font-size="8" fill="${{isPeak?'#806500':'#008751'}}" text-anchor="middle" font-weight="700">${{f(v.count)}}</text>`;
  }});

  document.getElementById('chart').innerHTML = s + '</svg>';
  document.getElementById('call').innerHTML =
    `<div><span>Peak Day</span><b>${{d[pk].date}} — ${{f(d[pk].count)}} souls</b></div>
     <div><span>Campaign Period</span><b>Oct 1–5, 2026</b></div>`;
}})();

// ---- MILESTONES ----
const ba = D.bornAgain / D.total * 100;
const hs = D.holySpirit / D.total * 100;
document.getElementById('dn').innerHTML = [
  ['Born Again', ba, D.bornAgain],
  ['Filled with the Holy Spirit', hs, D.holySpirit],
].map(x => `
  <div>
    <h3>${{x[0]}}</h3>
    <div class="w">
      ${{svgRing(x[1], 220, 22, ['#e3eae6','#008751'])}}
      <div class="c"><b>${{p1(x[1])}}</b><small>${{f(x[2])}} souls</small></div>
    </div>
    <div class="ms">
      ${{[25,50,75,100].map(t=>`<span class="${{x[1]>=t?'on':''}}">${{t}}%</span>`).join('')}}
    </div>
  </div>`).join('');

// ---- 100% TROPHY WALL (Official 13 Target Achievers) ----
const winners = D.allChurches.filter(c => c.souls >= c.target && c.target > 0);
winners.sort((a,b) => b.pctOfTarget - a.pctOfTarget || b.souls - a.souls);

document.getElementById('wall').innerHTML = winners.map(c => `
  <div class="tr">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    <h4 title="${{c.name}}">${{c.name}}</h4>
    <b>${{f(c.souls)}}</b>
    <small title="${{c.groupName}}">${{c.groupName}}</small>
    <div class="ach-tag">${{c.pctOfTarget.toFixed(1)}}% &starf;</div>
    <div style="font-size:7.5px;color:rgba(255,255,255,.6);margin-top:1px">Target: ${{f(c.target)}}</div>
  </div>`).join('');
</script>
</body>
</html>
"""

with open('public/ron-report-2026.html', 'w') as f:
    f.write(html_template)

print("✅ Successfully generated public/ron-report-2026.html with exact PDF targets!")
