import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const patient = await prisma.user.upsert({
    where: { email: "patient@aurawell.app" },
    update: {},
    create: { name: "Wassim Jebali", email: "patient@aurawell.app", password: passwordHash, role: "patient" },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@aurawell.app" },
    update: {},
    create: { name: "Dr. Elena Marsh", email: "doctor@aurawell.app", password: passwordHash, role: "doctor", specialty: "Cardiology" },
  });

  const apptCount = await prisma.appointment.count();
  if (apptCount === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const dateStr = d.toISOString().slice(0, 10);
    await prisma.appointment.create({
      data: {
        date: new Date(`${dateStr}T00:00:00.000Z`),
        time: "10:00 AM",
        reason: "Annual cardiac check-up",
        status: "upcoming",
        patientId: patient.id,
        doctorId: doctor.id,
      },
    });
  }

  console.log("Seed complete:", patient.email, "/", doctor.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
