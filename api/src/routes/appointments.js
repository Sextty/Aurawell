import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import {
  validateBody,
  validateQuery,
  bookingSchema,
  doctorStatusSchema,
  appointmentQuerySchema,
} from "../middleware/validate.js";
import { APPOINTMENT_STATUS } from "../constants/status.js";
import { CLINIC_SLOTS } from "../constants/slots.js";
import { getClinicTodayString, parseDateToUtc, parseSlotMinutes } from "../utils/datetime.js";

const router = Router();
router.use(requireAuth);

// Patients see their own visits; doctors see everyone booked with them.
// Supports status filtering and limit pagination.
// Orders by date, then by the slot's real position in the clinic schedule —
// lexicographic `time` sorting would put "02:00 PM" before "09:30 AM".
function slotOrder(time) {
  const index = CLINIC_SLOTS.indexOf(time);
  return index === -1 ? parseSlotMinutes(time) : index;
}

router.get(
  "/",
  validateQuery(appointmentQuerySchema),
  asyncHandler(async (req, res) => {
    const { status, limit } = req.query;
    const baseWhere =
      req.user.role === "doctor" ? { doctorId: req.user.sub } : { patientId: req.user.sub };

    const where = status ? { ...baseWhere, status } : baseWhere;

    const appointments = await prisma.appointment.findMany({
      where,
      take: limit,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
      orderBy: [{ date: "asc" }],
    });
    appointments.sort(
      (a, b) =>
        a.date.toISOString().localeCompare(b.date.toISOString()) ||
        slotOrder(a.time) - slotOrder(b.time)
    );
    res.json(appointments);
  })
);

// Patients book an appointment; slot conflict returns 409, doctor relation included in response.
router.post(
  "/",
  validateBody(bookingSchema),
  asyncHandler(async (req, res) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patients can book appointments" });
    }

    const { doctorId, date, time, reason } = req.body;

    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, role: "doctor" },
      select: { id: true, name: true, specialty: true },
    });
    if (!doctor) {
      return res.status(400).json({ error: "Doctor not found" });
    }

    const normalizedDate = parseDateToUtc(date);

    try {
      const appt = await prisma.appointment.create({
        data: {
          doctorId,
          date: normalizedDate,
          time,
          reason,
          patientId: req.user.sub,
          status: APPOINTMENT_STATUS.UPCOMING,
        },
        include: {
          doctor: { select: { id: true, name: true, specialty: true } },
          patient: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(appt);
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "That slot is no longer available" });
      }
      throw err;
    }
  })
);

// Patients can cancel their own upcoming appointment on or after today.
// State change is atomic via updateMany; returns 404 if not found or not eligible.
router.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patients can cancel visits" });
    }

    const todayDate = parseDateToUtc(getClinicTodayString());

    const { count } = await prisma.appointment.updateMany({
      where: {
        id: req.params.id,
        patientId: req.user.sub,
        status: APPOINTMENT_STATUS.UPCOMING,
        date: { gte: todayDate },
      },
      data: { status: APPOINTMENT_STATUS.CANCELLED },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Appointment not found or cannot be cancelled" });
    }

    res.json({ cancelled: req.params.id });
  })
);

// Doctors can manage visits booked with them (mark completed or cancelled).
// A visit can only be marked completed once its date has arrived (date <= clinic
// today); cancelling is allowed at any time while it is upcoming.
// State change is atomic via updateMany; returns 404 if not found or not eligible.
router.patch(
  "/:id/status",
  requireRole("doctor"),
  validateBody(doctorStatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    const where = {
      id: req.params.id,
      doctorId: req.user.sub,
      status: APPOINTMENT_STATUS.UPCOMING,
    };
    if (status === APPOINTMENT_STATUS.COMPLETED) {
      where.date = { lte: parseDateToUtc(getClinicTodayString()) };
    }

    const { count } = await prisma.appointment.updateMany({
      where,
      data: { status },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Appointment not found or status cannot be updated" });
    }

    res.json({ id: req.params.id, status });
  })
);

export default router;
