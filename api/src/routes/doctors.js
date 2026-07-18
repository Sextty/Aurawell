import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const doctors = await prisma.user.findMany({
    where: { role: "doctor" },
    select: { id: true, name: true, specialty: true },
  });
  res.json(doctors);
});

export default router;
