import { z } from "zod";
import { CLINIC_SLOTS } from "../constants/slots.js";
import {
  isValidCalendarDate,
  getClinicTodayString,
  getClinicCurrentMinutes,
  parseSlotMinutes,
} from "../utils/datetime.js";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const bookingSchema = z
  .object({
    doctorId: z.string().trim().min(1, "Doctor ID is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: z.enum(CLINIC_SLOTS, {
      error: () => "Selected time is not a valid clinic slot",
    }),
    reason: z
      .string()
      .trim()
      .max(250, "Reason must not exceed 250 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : "General consultation")),
  })
  .superRefine((data, ctx) => {
    if (!isValidCalendarDate(data.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Invalid calendar date (e.g. non-existent day)",
      });
      return;
    }

    const todayStr = getClinicTodayString();
    if (data.date < todayStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Appointment date cannot be in the past",
      });
      return;
    }

    if (data.date === todayStr) {
      const slotMinutes = parseSlotMinutes(data.time);
      const currentMinutes = getClinicCurrentMinutes();
      if (slotMinutes <= currentMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["time"],
          message: "This slot has already passed for today",
        });
      }
    }
  });

export const doctorStatusSchema = z.object({
  status: z.enum(["completed", "cancelled"], {
    error: () => "Status must be 'completed' or 'cancelled'",
  }),
});

export const appointmentQuerySchema = z.object({
  status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({
        error: details[0]?.message || "Validation failed",
        details,
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({
        error: details[0]?.message || "Invalid query parameters",
        details,
      });
    }
    req.query = result.data;
    next();
  };
}
