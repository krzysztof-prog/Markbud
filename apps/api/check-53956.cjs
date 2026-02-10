const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        const order = await prisma.order.findUnique({
            where: { orderNumber: '53956' },
            select: {
                orderNumber: true,
                glassDeliveryDate: true,
                glassOrderNote: true,
                orderedGlassCount: true,
                deliveredGlassCount: true,
                totalGlasses: true
            }
        });

        console.log('Order 53956 in database:');
        console.log(JSON.stringify(order, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main();
