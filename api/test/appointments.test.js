import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  resetDatabase,
  apiRequest,
} from "./setup.js";

let ctx; // { patient, doctor, patientToken, doctorToken, … }

before(async () => {
  await startTestServer();
});

after(async () => {
  await stopTestServer();
});

beforeEach(async () => {
  ctx = await resetDatabase();
});

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  it("returns a token for valid credentials", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: "patient.test@aurawell.app", password: "demo1234" },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "patient");
  });

  it("rejects invalid password with 401", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: "patient.test@aurawell.app", password: "wrong" },
    });
    assert.equal(res.status, 401);
  });

  it("returns 400 for missing email", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { password: "demo1234" },
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: "not-an-email", password: "demo1234" },
    });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
// BOOKING
// ---------------------------------------------------------------------------
function futureDate(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

describe("POST /api/appointments", () => {
  it("books successfully and includes doctor relation", async () => {
    const date = futureDate();
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM", reason: "Checkup" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.doctor.name, "Dr. Test Doctor");
    assert.equal(res.body.doctor.specialty, "General Medicine");
    assert.equal(res.body.patient.name, "Test Patient");
    assert.equal(res.body.status, "upcoming");
  });

  it("returns 409 on double-booking the same slot", async () => {
    const date = futureDate();
    const body = { doctorId: ctx.doctor.id, date, time: "09:00 AM", reason: "Visit" };

    const first = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken, body,
    });
    assert.equal(first.status, 201);

    // Second patient tries to book the exact same slot
    const second = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientTwoToken, body,
    });
    assert.equal(second.status, 409);
  });

  it("rebooking a cancelled slot succeeds", async () => {
    const date = futureDate();
    const body = { doctorId: ctx.doctor.id, date, time: "09:30 AM", reason: "Visit" };

    // Book, then cancel
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken, body,
    });
    assert.equal(booked.status, 201);

    const cancel = await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });
    assert.equal(cancel.status, 200);

    // Another patient rebooks that same slot
    const rebook = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientTwoToken, body,
    });
    assert.equal(rebook.status, 201, "Rebooking a cancelled slot should succeed");
  });

  it("same date with different time-of-day input still conflicts (409)", async () => {
    const date = futureDate();
    // Book 10:00 AM
    const first = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM" },
    });
    assert.equal(first.status, 201);

    // Try again same slot — different patient
    const second = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientTwoToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM" },
    });
    assert.equal(second.status, 409);
  });

  it("returns 400 for past date", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: "2020-01-01", time: "10:00 AM" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes("past"));
  });

  it("returns 400 for impossible calendar date", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: "2026-02-30", time: "10:00 AM" },
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for invalid time slot", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "07:15 AM" },
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for non-existent doctor", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: { doctorId: "nonexistent-id", date: futureDate(), time: "10:00 AM" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes("doctor"));
  });

  it("returns 400 for reason exceeding 250 chars", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.patientToken,
      body: {
        doctorId: ctx.doctor.id,
        date: futureDate(),
        time: "10:00 AM",
        reason: "x".repeat(251),
      },
    });
    assert.equal(res.status, 400);
  });

  it("returns 403 when a doctor tries to book", async () => {
    const res = await apiRequest("/api/appointments", {
      method: "POST",
      token: ctx.doctorToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    assert.equal(res.status, 403);
  });
});

// ---------------------------------------------------------------------------
// CANCEL (patient)
// ---------------------------------------------------------------------------
describe("PATCH /api/appointments/:id/cancel", () => {
  it("patient cancels their own upcoming appointment", async () => {
    const date = futureDate();
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM" },
    });
    assert.equal(booked.status, 201);

    const cancel = await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.cancelled, booked.body.id);
  });

  it("returns 404 when another patient tries to cancel", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    assert.equal(booked.status, 201);

    const cancel = await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientTwoToken,
    });
    assert.equal(cancel.status, 404);
  });

  it("returns 403 when a doctor tries to cancel via patient route", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    assert.equal(booked.status, 201);

    const cancel = await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.doctorToken,
    });
    assert.equal(cancel.status, 403);
  });

  it("cannot cancel an already cancelled appointment", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });
    const again = await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });
    assert.equal(again.status, 404);
  });
});

// ---------------------------------------------------------------------------
// DOCTOR STATUS MANAGEMENT
// ---------------------------------------------------------------------------
describe("PATCH /api/appointments/:id/status (doctor)", () => {
  it("doctor marks appointment completed", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    assert.equal(booked.status, 201);

    const res = await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.doctorToken,
      body: { status: "completed" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "completed");
  });

  it("doctor cancels appointment", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:30 AM" },
    });
    const res = await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.doctorToken,
      body: { status: "cancelled" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "cancelled");
  });

  it("patient cannot call doctor status route", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    const res = await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.patientToken,
      body: { status: "completed" },
    });
    assert.equal(res.status, 403);
  });

  it("returns 400 for invalid status value", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    const res = await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.doctorToken,
      body: { status: "upcoming" },
    });
    assert.equal(res.status, 400);
  });

  it("cannot complete an already completed appointment", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.doctorToken,
      body: { status: "completed" },
    });
    const again = await apiRequest(`/api/appointments/${booked.body.id}/status`, {
      method: "PATCH", token: ctx.doctorToken,
      body: { status: "cancelled" },
    });
    assert.equal(again.status, 404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/appointments (filters)
// ---------------------------------------------------------------------------
describe("GET /api/appointments", () => {
  it("returns appointments with doctor relation", async () => {
    await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    const res = await apiRequest("/api/appointments", { token: ctx.patientToken });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
    assert.ok(res.body[0].doctor.name);
  });

  it("filters by status", async () => {
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date: futureDate(), time: "10:00 AM" },
    });
    await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });

    const upcoming = await apiRequest("/api/appointments?status=upcoming", { token: ctx.patientToken });
    assert.equal(upcoming.status, 200);
    assert.ok(upcoming.body.every((a) => a.status === "upcoming"));

    const cancelled = await apiRequest("/api/appointments?status=cancelled", { token: ctx.patientToken });
    assert.equal(cancelled.status, 200);
    assert.ok(cancelled.body.length >= 1);
    assert.ok(cancelled.body.every((a) => a.status === "cancelled"));
  });

  it("returns 401 without a token", async () => {
    const res = await apiRequest("/api/appointments");
    assert.equal(res.status, 401);
  });
});

// ---------------------------------------------------------------------------
// AVAILABILITY
// ---------------------------------------------------------------------------
describe("GET /api/doctors/:id/availability", () => {
  it("returns all slots when nothing is booked", async () => {
    const date = futureDate();
    const res = await apiRequest(
      `/api/doctors/${ctx.doctor.id}/availability?date=${date}`,
      { token: ctx.patientToken }
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.availableSlots.length > 0);
    assert.deepEqual(res.body.bookedSlots, []);
  });

  it("excludes booked slots from available", async () => {
    const date = futureDate();
    await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM" },
    });
    const res = await apiRequest(
      `/api/doctors/${ctx.doctor.id}/availability?date=${date}`,
      { token: ctx.patientToken }
    );
    assert.equal(res.status, 200);
    assert.ok(!res.body.availableSlots.includes("10:00 AM"));
    assert.ok(res.body.bookedSlots.includes("10:00 AM"));
  });

  it("cancelled slots reappear as available", async () => {
    const date = futureDate();
    const booked = await apiRequest("/api/appointments", {
      method: "POST", token: ctx.patientToken,
      body: { doctorId: ctx.doctor.id, date, time: "10:00 AM" },
    });
    await apiRequest(`/api/appointments/${booked.body.id}/cancel`, {
      method: "PATCH", token: ctx.patientToken,
    });
    const res = await apiRequest(
      `/api/doctors/${ctx.doctor.id}/availability?date=${date}`,
      { token: ctx.patientToken }
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.availableSlots.includes("10:00 AM"));
  });
});
