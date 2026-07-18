import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Patients see their own visits; doctors see everyone booked with them.
router.get("/", async (req, res) => {
  const where = req.user.role === "doctor" ? { doctorId: req.user.sub } : { patientId: req.user.sub };
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { name: true } },
      doctor: { select: { name: true, specialty: true } },
    },
    orderBy: { date: "asc" },
  });
  res.json(appointments);
});

// Patients book; the doctor+date+time slot is enforced unique at the DB level
// so two patients can never double-book the same doctor.
router.post("/", async (req, res) => {
  if (req.user.role !== "patient") return res.status(403).json({ error: "Only patients can book appointments" });
  const { doctorId, date, time, reason } = req.body;
  if (!doctorId || !date || !time) return res.status(400).json({ error: "doctorId, date, time required" });

  try {
    const appt = await prisma.appointment.create({
      data: { doctorId, date: new Date(date), time, reason: reason || "General consultation", patientId: req.user.sub },
    });
    res.status(201).json(appt);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "That slot is no longer available" });
    throw err;
  }
});

router.patch("/:id/cancel", async (req, res) => {
  const { count } = await prisma.appointment.updateMany({
    where: { id: req.params.id, patientId: req.user.sub },
    data: { status: "cancelled" },
  });
  if (count === 0) return res.status(404).json({ error: "not found" });
  res.json({ cancelled: req.params.id });
});

export default router;
