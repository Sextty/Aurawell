import express from "express";
import cors from "cors";
import { prisma } from "./db.js";
import auth from "./routes/auth.js";
import doctors from "./routes/doctors.js";
import appointments from "./routes/appointments.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/doctors", doctors);
app.use("/api/appointments", appointments);

const port = parseInt(process.env.PORT || "4400", 10);
app.listen(port, "0.0.0.0", () => console.log(`Aurawell API on :${port}`));

process.on("SIGTERM", () => prisma.$disconnect().then(() => process.exit(0)));
