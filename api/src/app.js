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
        // Reject the request with 403 (not a thrown 500) via the guard below.
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Disallowed origins get an explicit 403 with a clear message instead of
// silently missing CORS headers.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin) && !allowedOrigins.includes("*")) {
    return res.status(403).json({ error: `Origin ${origin} is not allowed by CORS` });
  }
  next();
});

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/doctors", doctors);
app.use("/api/appointments", appointments);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
