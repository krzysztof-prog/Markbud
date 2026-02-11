/**
 * Skrypt naprawczy: Poprawia kategorię materiałów dla zleceń 53330, 53531, 53645
 *
 * Problem: Te zlecenia zostały zaimportowane starszą wersją parsera,
 * która klasyfikowała materiały jako "dodatki" zamiast "okno"
 * gdy pozycja materiału > liczba okien.
 *
 * Fix: Zmiana category z "dodatki" na "okno", powiązanie z oknem,
 * przeliczenie sum windowsMaterial i extrasValue.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORDERS_TO_FIX = [
  { orderNumber: '53330', orderId: 316, materialId: 363, windowId: 4379, material: 2788 },
  { orderNumber: '53531', orderId: 339, materialId: 423, windowId: 4439, material: 3473 },
  { orderNumber: '53645', orderId: 396, materialId: 578, windowId: 4594, material: 4701 },
];

async function main() {
  console.log('=== Fix material category dla zlecen 53330, 53531, 53645 ===\n');

  // Weryfikacja przed zmianami
  console.log('PRZED:');
  for (const fix of ORDERS_TO_FIX) {
    const order = await prisma.order.findUnique({
      where: { id: fix.orderId },
      select: { orderNumber: true, windowsMaterial: true, extrasValue: true },
    });
    const mat = await prisma.orderMaterial.findUnique({
      where: { id: fix.materialId },
      select: { category: true, orderWindowId: true },
    });
    console.log(`  ${order.orderNumber}: windowsMaterial=${order.windowsMaterial}, extrasValue=${order.extrasValue}, mat.category=${mat.category}, mat.orderWindowId=${mat.orderWindowId}`);
  }

  // Wykonaj naprawę w transakcji
  await prisma.$transaction(async (tx) => {
    for (const fix of ORDERS_TO_FIX) {
      // 1. Zmień kategorię materiału z "dodatki" na "okno" i powiąż z oknem
      await tx.orderMaterial.update({
        where: { id: fix.materialId },
        data: {
          category: 'okno',
          orderWindowId: fix.windowId,
        },
      });

      // 2. Przelicz sumy na zleceniu
      await tx.order.update({
        where: { id: fix.orderId },
        data: {
          windowsMaterial: fix.material,
          extrasValue: null, // Nie ma już materiałów "dodatki"
        },
      });

      console.log(`\n  Naprawiono ${fix.orderNumber}: category=okno, windowsMaterial=${fix.material}, extrasValue=null`);
    }
  });

  // Weryfikacja po zmianach
  console.log('\nPO:');
  for (const fix of ORDERS_TO_FIX) {
    const order = await prisma.order.findUnique({
      where: { id: fix.orderId },
      select: { orderNumber: true, windowsMaterial: true, extrasValue: true },
    });
    const mat = await prisma.orderMaterial.findUnique({
      where: { id: fix.materialId },
      select: { category: true, orderWindowId: true },
    });
    console.log(`  ${order.orderNumber}: windowsMaterial=${order.windowsMaterial}, extrasValue=${order.extrasValue}, mat.category=${mat.category}, mat.orderWindowId=${mat.orderWindowId}`);
  }

  console.log('\nGotowe!');
}

main()
  .catch((e) => {
    console.error('BLAD:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
