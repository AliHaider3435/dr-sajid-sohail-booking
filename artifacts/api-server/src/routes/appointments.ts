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
  phone: "+92 337 7628073",
  emergencyPhone: "0337 762873",
  whatsappMessage: [
    "Assalam o Alaikum",
    "Welcome to Dr Iqbal Ahmad Kharal Neurosurgery Clinics.",
    "Please choose your clinic:",
    "1. Multan",
    "2. Layyah",
    "3. DG Khan",
    "Reply with 1, 2, or 3.",
  ],
  clinics: [
    {
      id: "multan",
      name: "Neuro Tower Multan",
      city: "Multan",
      address: "Ahmad Clinics, Al-Kareem Center, Nishtar Road, Multan",
      mapsUrl:
        "https://maps.google.com/maps?hl=en&gl=pk&um=1&ie=UTF-8&fb=1&entry=s&sa=X&ftid=0x393b33635472cbbf:0xb310c5afb8c46340",
      schedule: [
        { days: "Monday, Wednesday, Thursday & Friday", hours: "5:00 PM – 7:00 PM", note: "Clinic" },
        { days: "Saturday", hours: "2:00 PM – 3:00 PM", note: "Clinic" },
        { days: "Friday", hours: "7:00 PM – 8:00 PM", note: "Online consultation" },
      ],
      slots: [
        "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
        "6:00 PM", "6:15 PM", "6:30 PM", "6:45 PM",
      ],
    },
    {
      id: "dg-khan",
      name: "Khadija Hospital, Dera Ghazi Khan",
      city: "DG Khan",
      address:
        "Bank Islami wali gali, near KFC Hotel, opposite DHQ Hospital, Dera Ghazi Khan",
      mapsUrl: "https://maps.app.goo.gl/THSNESnMQAEt2qpa6?g_st=awb",
      schedule: [
        {
          days: "First & third Tuesday of every month",
          hours: "2:00 PM – 6:00 PM",
          note: "Clinic",
        },
      ],
      slots: [
        "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
        "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM",
        "4:00 PM", "4:15 PM", "4:30 PM", "4:45 PM",
        "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
      ],
    },
    {
      id: "layyah",
      name: "Kharl Medical Complex, Layyah",
      city: "Layyah",
      address:
        "Clinic of Dr Sajjad Kharl, opposite DHQ Hospital, Layyah",
      mapsUrl: "https://maps.google.com/?q=Kharl+Medical+Complex+Layyah",
      schedule: [
        {
          days: "Second & fourth Sunday of every month",
          hours: "9:00 AM – 6:00 PM",
          note: "Endoscopic brain & spine clinic",
        },
      ],
      slots: [
        "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM",
        "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
        "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
        "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
        "1:00 PM", "1:15 PM", "1:30 PM", "1:45 PM",
        "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
        "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM",
        "4:00 PM", "4:15 PM", "4:30 PM", "4:45 PM",
        "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
      ],
    },
  ],
  appointmentTypes: [
    {
      value: "new-patient",
      label: "New patient",
      description: "Your first consultation with Dr. Kharal.",
    },
    {
      value: "follow-up",
      label: "Follow-up patient",
      description: "A review after a previous consultation or procedure.",
    },
    {
      value: "emergency-consultation",
      label: "Emergency consultation",
      description: "For urgent concerns; call the emergency number for immediate help.",
    },
  ],
} as const;

function serializeAppointment(appointment: typeof appointmentsTable.$inferSelect) {
  return {
    ...appointment,
    createdAt: appointment.createdAt.toISOString(),
    clinicLocation: appointment.clinicLocation || "multan",
    city: appointment.city || "Multan",
    appointmentType: appointment.appointmentType || appointment.visitType || "new-patient",
    attachmentName: appointment.attachmentName || null,
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

  req.log.info({ appointmentId: appointment.id }, "Appointment request created");
  res.status(201).json(CreateAppointmentResponse.parse(serializeAppointment(appointment)));
});

router.get("/appointments/availability", (_req, res): void => {
  res.json(GetAppointmentAvailabilityResponse.parse(availability));
});

export default router;