import express from "express";
import cors from "cors";
import auth from "./routes/auth.js";
import doctors from "./routes/doctors.js";
import appointments from "./routes/appointments.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

const app = express();

// Trust proxy for Nginx in Docker setup
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/doctors", doctors);
app.use("/api/appointments", appointments);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
