import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Count by changeType
    const groupedData = await prisma.schucoDelivery.groupBy({
      by: ['changeType'],
      _count: {
        changeType: true,
      },
    });

    console.log('\n=== Change Type Distribution ===');
    groupedData.forEach(item => {
      console.log(`${item.changeType || 'null'}: ${item._count.changeType}`);
    });

    // Get recent deliveries with changeType
    const recent = await prisma.schucoDelivery.findMany({
      orderBy: { orderDateParsed: 'desc' },
      take: 10,
      select: {
        orderNumber: true,
        orderDate: true,
        changeType: true,
        changedAt: true,
      },
    });

    console.log('\n=== Recent 10 Deliveries ===');
    recent.forEach(d => {
      console.log(`${d.orderNumber} | ${d.orderDate} | changeType: ${d.changeType || 'null'} | changedAt: ${d.changedAt?.toISOString() || 'null'}`);
    });

    // Get last successful fetch
    const lastSuccess = await prisma.schucoFetchLog.findFirst({
      where: { status: 'success' },
      orderBy: { startedAt: 'desc' },
    });

    console.log('\n=== Last SUCCESSFUL Fetch ===');
    if (lastSuccess) {
      console.log(`Started: ${lastSuccess.startedAt.toISOString()}`);
      console.log(`Trigger: ${lastSuccess.triggerType}`);
      console.log(`New: ${lastSuccess.newRecords || 0}, Updated: ${lastSuccess.updatedRecords || 0}, Unchanged: ${lastSuccess.unchangedRecords || 0}`);
      console.log(`Total: ${lastSuccess.recordsCount || 0}`);
    } else {
      console.log('No successful fetch found');
    }

    // Get last 5 fetch logs
    const fetchLogs = await prisma.schucoFetchLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    console.log('\n=== Last 5 Fetch Logs ===');
    if (fetchLogs.length > 0) {
      fetchLogs.forEach((log, idx) => {
        console.log(`\n[${idx + 1}] Started: ${log.startedAt.toISOString()}`);
        console.log(`    Status: ${log.status}`);
        console.log(`    Trigger: ${log.triggerType}`);
        console.log(`    New: ${log.newRecords || 0}, Updated: ${log.updatedRecords || 0}, Unchanged: ${log.unchangedRecords || 0}`);
        console.log(`    Total: ${log.recordsCount || 0}`);
        if (log.errorMessage) {
          console.log(`    Error: ${log.errorMessage}`);
        }
      });
    } else {
      console.log('No fetch logs found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
