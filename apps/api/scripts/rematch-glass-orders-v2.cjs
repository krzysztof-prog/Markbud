/**
 * Skrypt v2: dopasowanie szyb do zleceń
 * Naprawia problem z oryginalnym skryptem (zbyt duże IN clause)
 * Przetwarza walidacje po jednej, bez transakcji batch
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Znajdź WSZYSTKIE nierozwiązane walidacje missing_production_order
  // gdzie GlassOrder nie jest usunięty
  const validations = await prisma.glassOrderValidation.findMany({
    where: {
      validationType: 'missing_production_order',
      resolved: false,
      glassOrder: { deletedAt: null },
    },
    include: {
      glassOrder: {
        select: {
          id: true,
          glassOrderNumber: true,
          expectedDeliveryDate: true,
        },
      },
    },
  });

  console.log(`Nierozwiązane walidacje (z aktywnym glass order): ${validations.length}`);

  // Zbierz unikalne orderNumbers
  const orderNumbers = [...new Set(validations.map((v) => v.orderNumber))];
  console.log(`Unikalne numery zleceń: ${orderNumbers.length}`);

  // Znajdź istniejące zlecenia - w batchu po 500 żeby uniknąć limitu IN
  const existingMap = new Map();
  const batchSize = 500;
  for (let i = 0; i < orderNumbers.length; i += batchSize) {
    const batch = orderNumbers.slice(i, i + batchSize);
    const orders = await prisma.order.findMany({
      where: { orderNumber: { in: batch } },
      select: { orderNumber: true, orderedGlassCount: true },
    });
    for (const o of orders) {
      existingMap.set(o.orderNumber, o);
    }
  }

  console.log(`Istniejące zlecenia: ${existingMap.size}`);

  const matchableValidations = validations.filter(
    (v) => existingMap.has(v.orderNumber) && v.orderedQuantity && v.orderedQuantity > 0
  );
  console.log(`Walidacje do dopasowania: ${matchableValidations.length}\n`);

  let matched = 0;
  let errors = 0;

  for (const v of matchableValidations) {
    try {
      const updateData = {
        orderedGlassCount: { increment: v.orderedQuantity },
        glassOrderStatus: 'ordered',
      };

      if (v.glassOrder && v.glassOrder.expectedDeliveryDate) {
        updateData.glassDeliveryDate = v.glassOrder.expectedDeliveryDate;
      }

      await prisma.order.update({
        where: { orderNumber: v.orderNumber },
        data: updateData,
      });

      await prisma.glassOrderValidation.update({
        where: { id: v.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: 'rematch-script-v2',
        },
      });

      matched++;
      if (matched <= 20 || matched % 50 === 0) {
        console.log(
          `✅ ${v.orderNumber}: +${v.orderedQuantity} szyb (glass: ${v.glassOrder?.glassOrderNumber || '?'})`
        );
      }
    } catch (e) {
      errors++;
      console.log(`❌ ${v.orderNumber}: ${e.message}`);
    }
  }

  console.log(`\n=== WYNIK ===`);
  console.log(`Dopasowane: ${matched}`);
  console.log(`Błędy: ${errors}`);

  // Weryfikacja najnowszych zleceń
  const checkOrders = [
    '53990', '53989', '53988', '53987', '53986', '53985',
    '53984', '53983', '53982', '53981', '53980', '53979', '53978',
  ];
  const check = await prisma.order.findMany({
    where: { orderNumber: { in: checkOrders } },
    select: {
      orderNumber: true,
      orderedGlassCount: true,
      glassOrderStatus: true,
      glassDeliveryDate: true,
    },
    orderBy: { orderNumber: 'desc' },
  });

  console.log(`\n=== WERYFIKACJA NAJNOWSZYCH ZLECEŃ ===`);
  for (const o of check) {
    const dateStr = o.glassDeliveryDate
      ? o.glassDeliveryDate.toISOString().split('T')[0]
      : '-';
    console.log(
      `  ${o.orderNumber}: szyb=${o.orderedGlassCount}, status=${o.glassOrderStatus}, dataSzyb=${dateStr}`
    );
  }

  // Ile walidacji nadal nierozwiązanych?
  const stillUnresolved = await prisma.glassOrderValidation.count({
    where: { validationType: 'missing_production_order', resolved: false },
  });
  console.log(`\nNadal nierozwiązane walidacje: ${stillUnresolved}`);
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
