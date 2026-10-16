import http from "node:http";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Ensure tests use the isolated test database
const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://aurawell:aurawell@localhost:5432/aurawell_test";

// src/db.js instantiates PrismaClient at module load and reads DATABASE_URL —
// so the env var must be set before importing the app (dynamic import below).
process.env.DATABASE_URL = testDbUrl;

const { app } = await import("../src/app.js");
const { signToken } = await import("../src/middleware/auth.js");
const { ensureIndexes } = await import("../prisma/ensure-indexes.js");

export const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

let server;
let baseUrl;

export async function startTestServer() {
  process.env.NODE_ENV = "test";
  await ensureIndexes(prisma);

  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve({ server, baseUrl });
    });
  });
}

export async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(async () => {
        await prisma.$disconnect();
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export async function resetDatabase() {
  await prisma.appointment.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const patient = await prisma.user.create({
    data: {
      name: "Test Patient",
      email: "patient.test@aurawell.app",
      password: passwordHash,
      role: "patient",
    },
  });

  const patientTwo = await prisma.user.create({
    data: {
      name: "Second Patient",
      email: "patient2.test@aurawell.app",
      password: passwordHash,
      role: "patient",
    },
  });

  const doctor = await prisma.user.create({
    data: {
      name: "Dr. Test Doctor",
      email: "doctor.test@aurawell.app",
      password: passwordHash,
      role: "doctor",
      specialty: "General Medicine",
    },
  });

  return {
    patient,
    patientTwo,
    doctor,
    patientToken: signToken(patient),
    patientTwoToken: signToken(patientTwo),
    doctorToken: signToken(doctor),
  };
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: data };
}
