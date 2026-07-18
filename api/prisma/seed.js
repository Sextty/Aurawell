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
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 4);
    await prisma.appointment.create({
      data: {
        date: upcoming,
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
