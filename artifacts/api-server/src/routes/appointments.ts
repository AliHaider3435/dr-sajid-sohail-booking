import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  CreateAppointmentResponse,
  GetAppointmentAvailabilityResponse,
  ListAppointmentsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const availability = {
  clinicName: "Neuro Tower Multan",
  phone: "+92 337 7628073",
  hours: [
    { day: "Monday", hours: "5:30 PM – 9:00 PM" },
    { day: "Tuesday", hours: "5:30 PM – 9:00 PM" },
    { day: "Wednesday", hours: "5:30 PM – 9:00 PM" },
    { day: "Thursday", hours: "5:30 PM – 9:00 PM" },
    { day: "Friday", hours: "5:30 PM – 9:00 PM" },
    { day: "Saturday", hours: "5:30 PM – 9:00 PM" },
    { day: "Sunday", hours: "By appointment" },
  ],
  visitTypes: [
    {
      value: "new-consultation",
      label: "New patient consultation",
      duration: "30–45 min",
    },
    { value: "follow-up", label: "Follow-up visit", duration: "20–30 min" },
    {
      value: "second-opinion",
      label: "Second opinion",
      duration: "30–45 min",
    },
    {
      value: "spine-consultation",
      label: "Brain & spine consultation",
      duration: "30–45 min",
    },
  ],
};

function serializeAppointment(appointment: typeof appointmentsTable.$inferSelect) {
  return {
    ...appointment,
    createdAt: appointment.createdAt.toISOString(),
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  req.log.info("Fetching appointment requests");
  const appointments = await db
    .select()
    .from(appointmentsTable)
    .orderBy(desc(appointmentsTable.createdAt));

  res.json(ListAppointmentsResponse.parse(appointments.map(serializeAppointment)));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid appointment request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      patientName: parsed.data.patientName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      visitType: parsed.data.visitType,
      preferredDate: parsed.data.preferredDate,
      preferredTime: parsed.data.preferredTime,
      message: parsed.data.message,
    })
    .returning();

  req.log.info({ appointmentId: appointment.id }, "Appointment request created");
  res.status(201).json(CreateAppointmentResponse.parse(serializeAppointment(appointment)));
});

router.get("/appointments/availability", (_req, res): void => {
  res.json(GetAppointmentAvailabilityResponse.parse(availability));
});

export default router;