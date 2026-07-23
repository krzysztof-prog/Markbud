const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');

// Open in read-only mode to avoid WAL issues over network
const db = new DatabaseSync('a:/apps/api/prisma/prod.db', { readOnly: true });

const gmailEmail = db.prepare("SELECT value FROM settings WHERE key = 'gmail_email'").get();
const gmailPass = db.prepare("SELECT value FROM settings WHERE key = 'gmail_app_password'").get();

if (!gmailEmail || !gmailPass) {
  console.error('Brak konfiguracji Gmail w settings');
  process.exit(1);
}
console.log('Gmail:', gmailEmail.value);

const today = new Date(); today.setHours(0,0,0,0);
const rangeEnd = new Date(today); rangeEnd.setDate(rangeEnd.getDate()+14); rangeEnd.setHours(23,59,59,999);
const todayMs = today.getTime();
const rangeEndMs = rangeEnd.getTime();
console.log('Zakres:', today.toLocaleDateString('pl-PL'), '-', rangeEnd.toLocaleDateString('pl-PL'));

const deliveries = db.prepare(
  "SELECT d.id, d.delivery_number, d.delivery_date, d.status FROM deliveries d WHERE d.delivery_date >= ? AND d.delivery_date <= ? AND d.status IN ('planned','in_progress') AND d.deleted_at IS NULL ORDER BY d.delivery_date ASC"
).all(todayMs, rangeEndMs);

const deliveriesWithOrders = [];
for (const d of deliveries) {
  try {
    const oc = db.prepare("SELECT COUNT(*) as cnt FROM delivery_orders WHERE delivery_id = ?").get(d.id);
    if (oc.cnt > 0) deliveriesWithOrders.push(d);
  } catch(e) { console.warn('Skip delivery', d.id, e.message); }
}

console.log('Znaleziono', deliveriesWithOrders.length, 'dostaw z zamowieniami');

function fmtDate(d) {
  if (typeof d === 'number') d = new Date(d);
  return d.toLocaleDateString('pl-PL', {day:'2-digit',month:'2-digit',year:'numeric'});
}

const glassIssues = [];
const labelIssues = [];

for (const del of deliveriesWithOrders) {
  try {
    const orders = db.prepare(
      "SELECT o.order_number, o.total_glasses, o.delivered_glass_count, o.glass_order_status FROM delivery_orders do2 JOIN orders o ON o.id = do2.order_id WHERE do2.delivery_id = ?"
    ).all(del.id);

    const missing = orders.filter(o => {
      const t = o.total_glasses || 0;
      if (t === 0) return false;
      const d = o.delivered_glass_count || 0;
      if (d >= t) return false;
      if (['ordered','partial','complete'].includes(o.glass_order_status || '')) return false;
      return true;
    });

    if (missing.length > 0) {
      glassIssues.push({ dn: del.delivery_number || ('#' + del.id), dd: del.delivery_date, orders: missing });
    }
  } catch(e) { console.warn('Glass check skip', del.delivery_number, e.message); }

  try {
    const labelOrders = db.prepare(
      "SELECT o.order_number, o.id as order_id FROM delivery_orders do2 JOIN orders o ON o.id = do2.order_id WHERE do2.delivery_id = ?"
    ).all(del.id);

    const lp = [];
    for (const lo of labelOrders) {
      try {
        const c = db.prepare('SELECT status FROM label_checks WHERE order_id = ? ORDER BY checked_at DESC LIMIT 1').all(lo.order_id);
        if (c.length > 0 && c[0].status !== 'ok' && c[0].status !== 'OK') {
          const s = c[0].status;
          lp.push({
            on: lo.order_number,
            r: s === 'MISMATCH' ? 'Niezgodnosc etykiet' :
               s === 'NO_FOLDER' ? 'Brak folderu etykiet' :
               s === 'NO_BMP' ? 'Brak plikow BMP' :
               s === 'OCR_ERROR' ? 'Blad OCR' : s || '?'
          });
        }
      } catch(e) { /* skip single label check */ }
    }
    if (lp.length > 0) {
      labelIssues.push({ dn: del.delivery_number || ('#' + del.id), dd: del.delivery_date, problems: lp });
    }
  } catch(e) { console.warn('Label check skip', del.delivery_number, e.message); }
}

console.log('Szyby:', glassIssues.length, ', Etykiety:', labelIssues.length);

// Build HTML
let glassHtml = '';
if (glassIssues.length > 0) {
  let rows = glassIssues.map(g =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${g.dn}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${fmtDate(g.dd)}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${g.orders.length} zlecen bez zamowionych szyb</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">${g.orders.map(o => o.order_number).join(', ')}</td></tr>`
  ).join('');
  glassHtml = `<h2 style="color:#dc2626;font-size:18px;margin-top:20px;border-bottom:2px solid #dc2626;padding-bottom:8px">Brakujace zamowienia szyb (${glassIssues.length})</h2>` +
    `<table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background-color:#fef2f2">` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Dostawa</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Data</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Status szyb</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Zlecenia bez szyb</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
}

let labelHtml = '';
if (labelIssues.length > 0) {
  let rows = '';
  for (const li of labelIssues) {
    for (let i = 0; i < li.problems.length; i++) {
      const p = li.problems[i];
      rows += '<tr>' +
        (i === 0 ? `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600" rowspan="${li.problems.length}">${li.dn}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb" rowspan="${li.problems.length}">${fmtDate(li.dd)}</td>` : '') +
        `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.on}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#b45309">${p.r}</td></tr>`;
    }
  }
  labelHtml = `<h2 style="color:#d97706;font-size:18px;margin-top:20px;border-bottom:2px solid #d97706;padding-bottom:8px">Problemy z etykietami (${labelIssues.length})</h2>` +
    `<table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background-color:#fffbeb">` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Dostawa</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Data</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Zlecenie</th>` +
    `<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Problem</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
}

const noIss = (glassIssues.length === 0 && labelIssues.length === 0)
  ? '<p style="color:#16a34a;font-size:16px;text-align:center;padding:40px 0">Wszystkie dostawy OK - brak problemow.</p>' : '';

const nowStr = fmtDate(new Date());
const rangeStr = fmtDate(today) + ' - ' + fmtDate(rangeEnd);

const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#333">
<div style="max-width:800px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
<div style="background-color:#1a56db;color:#fff;padding:20px 30px">
<h1 style="margin:0;font-size:22px">Raport problemow w dostawach</h1>
<p style="margin:5px 0 0;font-size:14px;opacity:0.9">${nowStr} | Zakres: ${rangeStr} | Sprawdzono: ${deliveriesWithOrders.length} dostaw</p>
</div>
<div style="padding:20px 30px">${glassHtml}${labelHtml}${noIss}</div>
<div style="background-color:#f9fafb;padding:15px 30px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">Wygenerowano automatycznie przez system AKROBUD.</div>
</div></body></html>`;

const subject = (glassIssues.length > 0 || labelIssues.length > 0)
  ? `AKROBUD - Problemy w dostawach (szyby: ${glassIssues.length}, etykiety: ${labelIssues.length})`
  : 'AKROBUD - Raport dostaw (brak problemow)';

async function send() {
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailEmail.value, pass: gmailPass.value }
  });
  const info = await t.sendMail({
    from: `"AKROBUD System" <${gmailEmail.value}>`,
    to: 'krzysztof@markbud.pl',
    subject,
    html
  });
  console.log('Email wyslany! MessageId:', info.messageId);
}

send().catch(e => { console.error('Blad:', e); process.exit(1); });
