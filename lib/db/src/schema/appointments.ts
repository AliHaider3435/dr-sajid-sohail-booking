import { date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clinicLocation: text("clinic_location").notNull().default("multan"),
  city: text("city").notNull().default("Multan"),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  visitType: text("visit_type").notNull().default("new-patient"),
  appointmentType: text("appointment_type").notNull().default("new-patient"),
  preferredDate: date("preferred_date", { mode: "string" }).notNull(),
  preferredTime: text("preferred_time").notNull(),
  message: text("message"),
  attachmentName: text("attachment_name"),
  status: text("status").notNull().default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({
  id: true,
  clinicLocation: true,
  city: true,
  visitType: true,
  appointmentType: true,
  status: true,
  createdAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;