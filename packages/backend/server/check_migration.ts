
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const migrationName = 'CreateIndexerTables1745211351719';
    const migration = await prisma.dataMigration.findFirst({
        where: {
            name: migrationName,
        },
    });

    if (migration) {
        console.log(`Migration ${migrationName} found:`, migration);
    } else {
        console.log(`Migration ${migrationName} NOT found.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
