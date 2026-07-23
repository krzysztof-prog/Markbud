/**
 * Jednorazowy skrypt - wysyła pełny raport emailowy o problemach w dostawach
 * Użycie: node scripts/send-delivery-alert.cjs
 */
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

function formatDate(date) {
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw' });
}

async function main() {
  // 1. Pobierz konfigurację
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['gmail_email', 'gmail_app_password', 'email_alert_recipients'] } },
  });
  const map = new Map(settings.map(s => [s.key, s.value]));
  const email = map.get('gmail_email');
  const pass = map.get('gmail_app_password');
  const recipients = (map.get('email_alert_recipients') || '').split(',').map(e => e.trim()).filter(e => e.includes('@'));

  if (!email || !pass) { console.error('Brak konfiguracji SMTP'); process.exit(1); }
  if (recipients.length === 0) { console.error('Brak odbiorców'); process.exit(1); }

  console.log('Nadawca:', email);
  console.log('Odbiorcy:', recipients.join(', '));

  // 2. Pobierz dostawy na 14 dni
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  twoWeeks.setHours(23, 59, 59, 999);

  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: { gte: today, lte: twoWeeks },
      status: { in: ['planned', 'in_progress'] },
      deletedAt: null,
      deliveryOrders: { some: {} },
    },
    orderBy: { deliveryDate: 'asc' },
    include: {
      deliveryOrders: {
        include: {
          order: {
            select: {
              orderNumber: true,
              totalGlasses: true,
              deliveredGlassCount: true,
              glassOrderStatus: true,
            },
          },
        },
      },
    },
  });

  console.log(`\nSprawdzam ${deliveries.length} dostaw (${formatDate(today)} - ${formatDate(twoWeeks)})...\n`);

  // 3. Sprawdź problemy ze szybami
  const glassIssues = [];
  for (const d of deliveries) {
    const missingGlass = d.deliveryOrders.filter(dord => {
      const total = dord.order.totalGlasses ?? 0;
      if (total === 0) return false;
      const delivered = dord.order.deliveredGlassCount ?? 0;
      if (delivered >= total) return false;
      const validStatuses = ['ordered', 'partial', 'complete'];
      if (validStatuses.includes(dord.order.glassOrderStatus ?? '')) return false;
      return true;
    });

    if (missingGlass.length > 0) {
      glassIssues.push({
        deliveryNumber: d.deliveryNumber || '#' + d.id,
        deliveryDate: d.deliveryDate,
        orders: missingGlass.map(dord => dord.order.orderNumber),
      });
    }
  }

  // 4. Sprawdź problemy z etykietami (z bazy LabelCheck)
  const labelIssues = [];
  for (const d of deliveries) {
    const checks = await prisma.labelCheck.findMany({
      where: { deliveryId: d.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (checks.length > 0 && (checks[0].mismatchCount > 0 || checks[0].errorCount > 0)) {
      // Pobierz szczegóły z LabelCheckResult
      const results = await prisma.labelCheckResult.findMany({
        where: { labelCheckId: checks[0].id, status: { not: 'OK' } },
        select: { orderNumber: true, status: true, errorMessage: true, expectedDate: true, detectedDate: true },
      });
      const statusLabels = {
        MISMATCH: 'Błędna data',
        NO_FOLDER: 'Brak folderu',
        NO_BMP: 'Brak zdjęć',
        OCR_ERROR: 'Błąd OCR',
        SKIPPED: 'Kształt',
      };
      labelIssues.push({
        deliveryNumber: d.deliveryNumber || '#' + d.id,
        deliveryDate: d.deliveryDate,
        problems: results.map(r => {
          let reason = statusLabels[r.status] || r.status;
          if (r.status === 'MISMATCH') {
            // Pokaż wykrytą datę przez OCR
            if (r.detectedDate) {
              reason += ' (wykryta: ' + formatDate(r.detectedDate) + ')';
            }
          }
          return { orderNumber: r.orderNumber, reason };
        }),
      });
    }
  }

  console.log(`Problemy ze szybami: ${glassIssues.length} dostaw`);
  console.log(`Problemy z etykietami: ${labelIssues.length} dostaw`);

  if (glassIssues.length === 0 && labelIssues.length === 0) {
    console.log('\nBrak problemów - email NIE zostanie wysłany.');
    await prisma.$disconnect();
    return;
  }

  // 5. Zbuduj HTML
  let glassHtml = '';
  if (glassIssues.length > 0) {
    let rows = glassIssues.map(gi =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${gi.deliveryNumber}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatDate(gi.deliveryDate)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${gi.orders.join(', ')}</td>
      </tr>`
    ).join('');

    glassHtml = `
      <h2 style="color:#dc2626;font-size:18px;margin-top:20px;border-bottom:2px solid #dc2626;padding-bottom:8px;">
        Brakujące zamówienia szyb (${glassIssues.length})
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#fef2f2;">
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b;">Dostawa</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b;">Data dostawy</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fecaca;font-size:13px;color:#991b1b;">Zlecenia bez szyb</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  let labelHtml = '';
  if (labelIssues.length > 0) {
    let rows = '';
    for (const li of labelIssues) {
      if (li.problems.length > 0) {
        for (let i = 0; i < li.problems.length; i++) {
          rows += `<tr>
            ${i === 0 ? `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;" rowspan="${li.problems.length}">${li.deliveryNumber}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;" rowspan="${li.problems.length}">${formatDate(li.deliveryDate)}</td>` : ''}
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${li.problems[i].orderNumber}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#b45309;">${li.problems[i].reason}</td>
          </tr>`;
        }
      } else {
        rows += `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${li.deliveryNumber}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatDate(li.deliveryDate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;" colspan="2">Problem z etykietami</td>
        </tr>`;
      }
    }

    labelHtml = `
      <h2 style="color:#d97706;font-size:18px;margin-top:20px;border-bottom:2px solid #d97706;padding-bottom:8px;">
        Problemy z etykietami (${labelIssues.length})
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#fffbeb;">
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e;">Dostawa</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e;">Data dostawy</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e;">Zlecenie</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fde68a;font-size:13px;color:#92400e;">Problem</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const nowStr = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  const rangeStr = `${formatDate(today)} - ${formatDate(twoWeeks)}`;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><title>Raport dostaw MARKBUD</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#333;">
  <div style="max-width:800px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1a56db;color:#fff;padding:20px 30px;">
      <h1 style="margin:0;font-size:22px;">Raport problemów w dostawach</h1>
      <p style="margin:5px 0 0;font-size:14px;opacity:0.9;">
        ${nowStr} | Zakres: ${rangeStr} | Sprawdzono: ${deliveries.length} dostaw
      </p>
    </div>
    <div style="padding:20px 30px;">
      ${glassHtml}
      ${labelHtml}
    </div>
    <div style="background:#f9fafb;padding:15px 30px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      Wygenerowano automatycznie przez system MARKBUD.
    </div>
  </div>
</body>
</html>`;

  // 6. Wyślij email
  const subject = `MARKBUD - Problemy w dostawach (szyby: ${glassIssues.length}, etykiety: ${labelIssues.length})`;
  console.log(`\nWysyłanie emaila: "${subject}"...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email, pass: pass },
  });

  const info = await transporter.sendMail({
    from: `"MARKBUD System" <${email}>`,
    to: recipients.join(', '),
    subject,
    html,
  });

  console.log('Email wysłany! MessageId:', info.messageId);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
