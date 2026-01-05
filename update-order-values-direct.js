#!/usr/bin/env node

/**
 * Direct database script to update order values from Schuco deliveries
 * Bypasses API auth by using Prisma Client directly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parse EUR amount from Schuco format
 */
function parseEurAmount(amountStr) {
  if (!amountStr) return null;

  try {
    let cleaned = amountStr.replace(/€/g, '').trim();
    cleaned = cleaned.replace(/\s/g, '');
    cleaned = cleaned.replace(/,/g, '.');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch {
    return null;
  }
}

async function updateOrderValues() {
  console.log('🔄 Starting direct database update...\n');

  try {
    // Get all Schuco deliveries with order links
    const schucoLinks = await prisma.orderSchucoLink.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            valueEur: true,
          },
        },
        schucoDelivery: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    });

    console.log(`📊 Found ${schucoLinks.length} Schuco-Order links\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const link of schucoLinks) {
      const order = link.order;
      const schuco = link.schucoDelivery;

      // Skip if order already has a value
      if (order.valueEur !== null) {
        skipped++;
        continue;
      }

      // Skip if Schuco doesn't have totalAmount
      if (!schuco.totalAmount) {
        skipped++;
        continue;
      }

      // Parse EUR value
      const eurValue = parseEurAmount(schuco.totalAmount);

      if (eurValue === null) {
        console.log(`⚠️  Failed to parse amount for ${order.orderNumber}: "${schuco.totalAmount}"`);
        failed++;
        continue;
      }

      // Update order with EUR value
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { valueEur: eurValue },
        });

        console.log(`✅ ${order.orderNumber}: €${eurValue}`);
        updated++;
      } catch (error) {
        console.log(`❌ Failed to update ${order.orderNumber}:`, error.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary:');
    console.log(`   Total links: ${schucoLinks.length}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    if (updated > 0) {
      console.log('\n✨ Success! Refresh the orders page to see updated values.');
    } else if (schucoLinks.length === 0) {
      console.log('\n💡 No Schuco links found. Run Schuco sync first:');
      console.log('   POST /api/schuco/refresh');
      console.log('   POST /api/schuco/sync-links');
    } else {
      console.log('\n💡 All orders already have values or no valid amounts in Schuco.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateOrderValues();
