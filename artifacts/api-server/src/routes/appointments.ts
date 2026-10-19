import { Router, type Request, type Response } from "express";
import { desc } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  CreateAppointmentResponse,
  GetAppointmentAvailabilityResponse,
  ListAppointmentsResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router = Router();

const availability = {
  phone: "0300 5809938",
  emergencyPhone: "0337 762873",
  whatsappMessage: [
    "Assalam o Alaikum",
    "Welcome to Dr Sajid Sohail Neurosurgery Clinics.",
    "Your clinic location is Layyah.",
    "Reply BOOK to start an appointment request.",
  ],
  clinics: [
    {
      id: "layyah",
      name: "Rahmania Medical Center, Layyah",
      city: "Layyah",
      address:
        "Employees Colony, Layyah",
      mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=30.9723221%2C70.9651555",
      schedule: [
        {
          days: "Daily",
          hours: "4:00 PM – 8:00 PM",
          note: "Endoscopic brain & spine clinic",
        },
      ],
      slots: [
        "4:00 PM",
        "4:15 PM",
        "4:30 PM",
        "4:45 PM",
        "5:00 PM",
        "5:15 PM",
        "5:30 PM",
        "5:45 PM",
        "6:00 PM",
        "6:15 PM",
        "6:30 PM",
        "6:45 PM",
        "7:00 PM",
        "7:15 PM",
        "7:30 PM",
        "7:45 PM",
        "8:00 PM",
      ],
    },
  ],
  appointmentTypes: [
    {
      value: "new-patient",
      label: "New patient",
      description: "Your first consultation with Dr. Sajid Sohail.",
    },
    {
      value: "follow-up",
      label: "Follow-up patient",
      description:
        "A review after a previous consultation or procedure.",
    },
    {
      value: "emergency-consultation",
      label: "Emergency consultation",
      description:
        "For urgent concerns; call the emergency number for immediate help.",
    },
  ],
} as const;

function serializeAppointment(
  appointment: typeof appointmentsTable.$inferSelect,
) {
  return {
    ...appointment,
    createdAt: appointment.createdAt.toISOString(),
    clinicLocation: appointment.clinicLocation || "layyah",
    city: appointment.city || "Layyah",
    appointmentType:
      appointment.appointmentType ||
      appointment.visitType ||
      "new-patient",
    attachmentName: appointment.attachmentName || null,
  };
}

router.get(
  "/appointments",
  async (_req: Request, res: Response): Promise<void> => {
    logger.info("Fetching appointment requests");

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .orderBy(desc(appointmentsTable.createdAt));

    res.json(
      ListAppointmentsResponse.parse(
        appointments.map(serializeAppointment),
      ),
    );
  },
);

router.post(
  "/appointments",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateAppointmentBody.safeParse(req.body);

    if (!parsed.success) {
      logger.warn(
        { errors: parsed.error.message },
        "Invalid appointment request",
      );

      res.status(400).json({
        error: parsed.error.message,
      });

      return;
    }

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        clinicLocation: parsed.data.clinicLocation,
        city: parsed.data.city,
        patientName: parsed.data.patientName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        visitType: parsed.data.appointmentType,
        appointmentType: parsed.data.appointmentType,
        preferredDate: parsed.data.preferredDate,
        preferredTime: parsed.data.preferredTime,
        message: parsed.data.message,
        attachmentName: parsed.data.attachmentName,
      })
      .returning();

    logger.info(
      { appointmentId: appointment.id },
      "Appointment request created",
    );

    res
      .status(201)
      .json(
        CreateAppointmentResponse.parse(
          serializeAppointment(appointment),
        ),
      );
  },
);

router.get(
  "/appointments/availability",
  (_req: Request, res: Response): void => {
    res.json(
      GetAppointmentAvailabilityResponse.parse(availability),
    );
  },
);

export default router;