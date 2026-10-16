import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function ensureIndexes(client = prisma) {
  // Pre-existing duplicate active slots would make CREATE UNIQUE INDEX fail
  // (crash-looping the container). Detect them, surface them, and skip the
  // index so the API stays up until the data is cleaned up manually.
  const duplicates = await client.$queryRawUnsafe(`
    SELECT "doctorId", "date", "time", COUNT(*)::int AS count
    FROM "Appointment"
    WHERE "status" <> 'cancelled'
    GROUP BY "doctorId", "date", "time"
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length > 0) {
    console.error("WARNING: duplicate active appointments found — unique index NOT created:");
    for (const dup of duplicates) {
      console.error(`  doctor=${dup.doctorId} date=${JSON.stringify(dup.date)} time=${dup.time} (x${dup.count})`);
    }
    console.error("Manually resolve these rows, then restart to create the index.");
    return { created: false, duplicates };
  }

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_doctorId_date_time_active_idx"
    ON "Appointment" ("doctorId", "date", "time")
    WHERE "status" <> 'cancelled';
  `);
  console.log("Indexes verified: Appointment_doctorId_date_time_active_idx");
  return { created: true, duplicates: [] };
}

if (process.argv[1] && process.argv[1].endsWith("ensure-indexes.js")) {
  ensureIndexes()
    .catch((err) => {
      console.error("Failed to ensure indexes:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
