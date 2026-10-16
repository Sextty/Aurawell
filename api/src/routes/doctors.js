import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { CLINIC_SLOTS } from "../constants/slots.js";
import {
  isValidCalendarDate,
  getClinicTodayString,
  getClinicCurrentMinutes,
  parseSlotMinutes,
  parseDateToUtc,
} from "../utils/datetime.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const doctors = await prisma.user.findMany({
      where: { role: "doctor" },
      select: { id: true, name: true, specialty: true },
      orderBy: { name: "asc" },
    });
    res.json(doctors);
  })
);

router.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== "string" || !isValidCalendarDate(date)) {
      return res.status(400).json({ error: "Valid date query parameter (YYYY-MM-DD) is required" });
    }

    const doctor = await prisma.user.findFirst({
      where: { id, role: "doctor" },
      select: { id: true, name: true, specialty: true },
    });
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const todayStr = getClinicTodayString();
    if (date < todayStr) {
      return res.json({
        doctorId: id,
        date,
        allSlots: CLINIC_SLOTS,
        bookedSlots: [],
        availableSlots: [],
      });
    }

    const normalizedDate = parseDateToUtc(date);
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        date: normalizedDate,
        status: { not: "cancelled" },
      },
      select: { time: true },
    });

    const bookedSet = new Set(existingAppointments.map((a) => a.time));
    const currentMinutes = getClinicCurrentMinutes();

    const availableSlots = CLINIC_SLOTS.filter((slot) => {
      if (bookedSet.has(slot)) return false;
      if (date === todayStr) {
        const slotMinutes = parseSlotMinutes(slot);
        if (slotMinutes <= currentMinutes) return false;
      }
      return true;
    });

    res.json({
      doctorId: id,
      date,
      allSlots: CLINIC_SLOTS,
      bookedSlots: Array.from(bookedSet),
      availableSlots,
    });
  })
);

export default router;
