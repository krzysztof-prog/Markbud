/**
 * Skrypt testowy: wysyła email z raportem problemów w dostawach
 * Używa Node.js 22 built-in sqlite + nodemailer z bezpośrednich ścieżek pnpm
 * Użycie: node --preserve-symlinks scripts/send-test-email.cjs
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Nodemailer z bezpośredniej ścieżki pnpm (obejście symlinków na dysku sieciowym)
const ROOT = path.resolve(__dirname, '..', '..', '..');
const nodemailer = require(path.join(ROOT, 'node_modules/.pnpm/nodemailer@6.10.1/node_modules/nodemailer'));

const DB_PATH = path.join(__dirname, '..', 'prisma', 'prod.db');
const RECIPIENT = 'krzysztof@markbud.pl';

async function main() {
  console.log('Otwieranie bazy:', DB_PATH);
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  // Pobierz gmail credentials
  const gmailEmail = db.prepare("SELECT value FROM settings WHERE key = 'gmail_email'").get();
  const gmailPassword = db.prepare("SELECT value FROM settings WHERE key = 'gmail_app_password'").get();

  if (!gmailEmail || !gmailPassword) {
    console.error('Brak konfiguracji gmail_email / gmail_app_password w tabeli settings');
    db.close();
    process.exit(1);
  }

  console.log('Gmail nadawca:', gmailEmail.value);

  // Dostawy na 14 dni do przodu
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const deliveries = db.prepare(`
    SELECT d.id, d.delivery_number, d.delivery_date, d.status
    FROM deliveries d
    WHERE d.delivery_date >= ? AND d.delivery_date <= ?
      AND d.status NOT IN ('shipped', 'delivered', 'completed')
      AND d.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM delivery_orders do2 WHERE do2.delivery_id = d.id)
    ORDER BY d.delivery_date ASC
  `).all(today.toISOString(), twoWeeks.toISOString());

  console.log(`Znaleziono ${deliveries.length} dostaw w zakresie ${fmt(today)} - ${fmt(twoWeeks)}`);

  const glassIssues = [];
  const labelIssues = [];

  for (const del of deliveries) {
    // --- SZYBY ---
    const orders = db.prepare(`
      SELECT o.order_number, o.total_glasses, o.delivered_glass_count, o.glass_order_status
      FROM delivery_orders do2
      JOIN orders o ON o.id = do2.order_id
      WHERE do2.delivery_id = ?
    `).all(del.id);

    const ordersNeedingGlass = orders.filter(o => (o.total_glasses || 0) > 0);
    const validStatuses = ['ordered', 'partial', 'complete'];
    const ordersMissing = ordersNeedingGlass.filter(o => {
      const delivered = o.delivered_glass_count || 0;
      const total = o.total_glasses || 0;
      if (delivered >= total && total > 0) return false;
      if (validStatuses.includes(o.glass_order_status || '')) return false;
      return true;
    });

    if (ordersMissing.length > 0) {
      const ordersOk = ordersNeedingGlass.length - ordersMissing.length;
      glassIssues.push({
        dn: del.delivery_number || `#${del.id}`,
        dd: del.delivery_date,
        msg: `Szyby zamówione: ${ordersOk}/${ordersNeedingGlass.length}`,
        ord: ordersMissing.map(o => o.order_number),
      });
    }

    // --- ETYKIETY ---
    const lc = db.prepare(`
      SELECT id, status, ok_count, mismatch_count, error_count, total_orders
      FROM label_checks
      WHERE delivery_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get(del.id);

    if (!lc) {
      labelIssues.push({ dn: del.delivery_number || `#${del.id}`, dd: del.delivery_date, msg: 'Etykiety nie były jeszcze sprawdzane', po: [] });
    } else if (lc.status === 'failed') {
      labelIssues.push({ dn: del.delivery_number || `#${del.id}`, dd: del.delivery_date, msg: 'Sprawdzanie etykiet nie powiodło się', po: [] });
    } else if (lc.mismatch_count > 0 || lc.error_count > 0) {
      const problems = db.prepare(`
        SELECT order_number, status FROM label_check_results
        WHERE label_check_id = ? AND status NOT IN ('OK', 'SKIPPED')
      `).all(lc.id);
      const sm = { 'MISMATCH': 'Niezgodność daty', 'NO_FOLDER': 'Brak folderu', 'NO_BMP': 'Brak pliku BMP', 'OCR_ERROR': 'Błąd OCR' };
      labelIssues.push({
        dn: del.delivery_number || `#${del.id}`, dd: del.delivery_date,
        msg: `${problems.length} etykiet ma błędy`,
        po: problems.map(p => ({ on: p.order_number, r: sm[p.status] || p.status })),
      });
    }
  }

  db.close();
  console.log(`Szyby: ${glassIssues.length} problem(ów), Etykiety: ${labelIssues.length} problem(ów)`);

  // HTML
  const html = buildHtml(deliveries.length, today, twoWeeks, glassIssues, labelIssues);

  // Wyślij
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailEmail.value, pass: gmailPassword.value },
  });

  const hasIssues = glassIssues.length > 0 || labelIssues.length > 0;
  const subject = hasIssues
    ? `AKROBUD - Problemy w dostawach (szyby: ${glassIssues.length}, etykiety: ${labelIssues.length})`
    : `AKROBUD - Raport dostaw (brak problemów)`;

  console.log(`Wysyłanie do ${RECIPIENT}...`);
  const info = await transporter.sendMail({
    from: `"AKROBUD System" <${gmailEmail.value}>`,
    to: RECIPIENT, subject, html,
  });
  console.log('Email wysłany!', info.messageId);
}

function fmt(d) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

function buildHtml(cnt, from, to, gi, li) {
  const now = fmt(new Date()), range = `${fmt(from)} - ${fmt(to)}`;
  let gs = '';
  if (gi.length > 0) {
    let r = '';
    for (const i of gi) r += `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${i.dn}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${fmt(i.dd)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.msg}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">${i.ord.join(', ')||'-'}</td></tr>`;
    gs = `<h2 style="color:#dc2626;font-size:18px;margin-top:20px;border-bottom:2px solid #dc2626;padding-bottom:8px">Brakujące zamówienia szyb (${gi.length})</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#fef2f2"><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Dostawa</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Data</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Status szyb</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b">Zlecenia bez szyb</th></tr></thead><tbody>${r}</tbody></table>`;
  }
  let ls = '';
  if (li.length > 0) {
    let r = '';
    for (const i of li) {
      if (i.po.length > 0) {
        for (let j = 0; j < i.po.length; j++) {
          r += '<tr>';
          if (j === 0) r += `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600" rowspan="${i.po.length}">${i.dn}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb" rowspan="${i.po.length}">${fmt(i.dd)}</td>`;
          r += `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.po[j].on}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#b45309">${i.po[j].r}</td></tr>`;
        }
      } else {
        r += `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${i.dn}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${fmt(i.dd)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb" colspan="2">${i.msg}</td></tr>`;
      }
    }
    ls = `<h2 style="color:#d97706;font-size:18px;margin-top:20px;border-bottom:2px solid #d97706;padding-bottom:8px">Problemy z etykietami (${li.length})</h2><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><thead><tr style="background:#fffbeb"><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Dostawa</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Data</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Zlecenie</th><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e">Problem</th></tr></thead><tbody>${r}</tbody></table>`;
  }
  const ni = gi.length === 0 && li.length === 0 ? '<p style="color:#16a34a;font-size:16px;text-align:center;padding:40px 0">Wszystkie dostawy OK - brak problemów.</p>' : '';
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#333"><div style="max-width:800px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)"><div style="background:#1a56db;color:#fff;padding:20px 30px"><h1 style="margin:0;font-size:22px">Raport problemów w dostawach</h1><p style="margin:5px 0 0;font-size:14px;opacity:.9">${now} | Zakres: ${range} | Sprawdzono: ${cnt} dostaw</p></div><div style="padding:20px 30px">${gs}${ls}${ni}</div><div style="background:#f9fafb;padding:15px 30px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">Wygenerowano automatycznie przez system AKROBUD.</div></div></body></html>`;
}

main().catch(e => { console.error('Błąd:', e); process.exit(1); });
