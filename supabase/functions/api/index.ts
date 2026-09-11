import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CreateAppointmentBody = z.object({
  clinicLocation: z.enum(["multan", "layyah", "dg-khan"]),
  city: z.string().min(2),
  patientName: z.string().min(2),
  phone: z.string().min(7),
  email: z
    .string()
    .email()
    .or(z.literal(""))
    .nullable()
    .optional(),
  appointmentType: z.enum([
    "new-patient",
    "follow-up",
    "emergency-consultation",
  ]),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  message: z.string().max(500).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
});

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
      address:
        "Ahmad Clinics, Al-Kareem Center, Nishtar Road, Multan",
      mapsUrl:
        "https://maps.google.com/maps?hl=en&gl=pk&um=1&ie=UTF-8&fb=1&entry=s&sa=X&ftid=0x393b33635472cbbf:0xb310c5afb8c46340",

      schedule: [
        {
          days: "Monday, Wednesday, Thursday & Friday",
          hours: "5:00 PM – 7:00 PM",
          note: "Clinic",
        },
        {
          days: "Saturday",
          hours: "2:00 PM – 3:00 PM",
          note: "Clinic",
        },
        {
          days: "Friday",
          hours: "7:00 PM – 8:00 PM",
          note: "Online consultation",
        },
      ],

      slots: [
        "5:00 PM",
        "5:15 PM",
        "5:30 PM",
        "5:45 PM",
        "6:00 PM",
        "6:15 PM",
        "6:30 PM",
        "6:45 PM",
      ],
    },

    {
      id: "dg-khan",
      name: "Khadija Hospital, Dera Ghazi Khan",
      city: "DG Khan",
      address:
        "Bank Islami wali gali, near KFC Hotel, opposite DHQ Hospital, Dera Ghazi Khan",
      mapsUrl:
        "https://maps.app.goo.gl/THSNESnMQAEt2qpa6?g_st=awb",

      schedule: [
        {
          days: "First & third Tuesday of every month",
          hours: "2:00 PM – 6:00 PM",
          note: "Clinic",
        },
      ],

      slots: [
        "2:00 PM",
        "2:15 PM",
        "2:30 PM",
        "2:45 PM",
        "3:00 PM",
        "3:15 PM",
        "3:30 PM",
        "3:45 PM",
        "4:00 PM",
        "4:15 PM",
        "4:30 PM",
        "4:45 PM",
        "5:00 PM",
        "5:15 PM",
        "5:30 PM",
        "5:45 PM",
      ],
    },

    {
      id: "layyah",
      name: "Kharl Medical Complex, Layyah",
      city: "Layyah",
      address:
        "Clinic of Dr Sajjad Kharl, opposite DHQ Hospital, Layyah",
      mapsUrl:
        "https://maps.google.com/?q=Kharl+Medical+Complex+Layyah",

      schedule: [
        {
          days: "Second & fourth Sunday of every month",
          hours: "9:00 AM – 6:00 PM",
          note: "Endoscopic brain & spine clinic",
        },
      ],

      slots: [
        "9:00 AM",
        "9:15 AM",
        "9:30 AM",
        "9:45 AM",
        "10:00 AM",
        "10:15 AM",
        "10:30 AM",
        "10:45 AM",
        "11:00 AM",
        "11:15 AM",
        "11:30 AM",
        "11:45 AM",
        "12:00 PM",
        "12:15 PM",
        "12:30 PM",
        "12:45 PM",
        "1:00 PM",
        "1:15 PM",
        "1:30 PM",
        "1:45 PM",
        "2:00 PM",
        "2:15 PM",
        "2:30 PM",
        "2:45 PM",
        "3:00 PM",
        "3:15 PM",
        "3:30 PM",
        "3:45 PM",
        "4:00 PM",
        "4:15 PM",
        "4:30 PM",
        "4:45 PM",
        "5:00 PM",
        "5:15 PM",
        "5:30 PM",
        "5:45 PM",
      ],
    },
  ],

  appointmentTypes: [
    {
      value: "new-patient",
      label: "New patient",
      description:
        "Your first consultation with Dr. Kharal.",
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

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function serializeAppointment(
  appointment: Record<string, unknown>,
) {
  return {
    id: appointment.id,
    clinicLocation:
      appointment.clinic_location || "multan",
    city: appointment.city || "Multan",
    patientName: appointment.patient_name,
    phone: appointment.phone,
    email: appointment.email ?? null,
    visitType:
      appointment.visit_type || "new-patient",
    appointmentType:
      appointment.appointment_type ||
      appointment.visit_type ||
      "new-patient",
    preferredDate: appointment.preferred_date,
    preferredTime: appointment.preferred_time,
    message: appointment.message ?? null,
    attachmentName:
      appointment.attachment_name ?? null,
    status:
      appointment.status || "requested",
    createdAt: appointment.created_at,
  };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");

const supabaseServiceRoleKey = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

/**
 * Checks whether the request contains the server-side
 * Supabase service-role key.
 *
 * This is ONLY used for protected admin operations.
 * Never expose the service-role key in the frontend.
 */
function isAdminRequest(req: Request): boolean {
  const adminKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!adminKey) {
    return false;
  }

  const apiKey = req.headers.get("apikey");
  const authorization =
    req.headers.get("authorization");

  return (
    apiKey === adminKey ||
    authorization === `Bearer ${adminKey}`
  );
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )
    : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (!supabaseAdmin) {
    return jsonResponse(
      {
        error:
          "Server configuration error: Supabase credentials are missing.",
      },
      500,
    );
  }

  const url = new URL(req.url);

  let path = url.pathname;

  const functionPrefix =
    "/functions/v1/api";

  if (path.startsWith(functionPrefix)) {
    path = path.slice(functionPrefix.length);
  }

  if (path.startsWith("/api/")) {
    path = path.slice(4);
  }

  if (path === "") {
    path = "/";
  }

  console.log(
    `API request: ${req.method} ${path}`,
  );

  // ------------------------------------------
  // HEALTH CHECK
  // ------------------------------------------

  if (
    req.method === "GET" &&
    (
      path === "/" ||
      path === "/healthz" ||
      path === "/api/healthz"
    )
  ) {
    return jsonResponse({
      status: "ok",
    });
  }

  // ------------------------------------------
  // APPOINTMENT AVAILABILITY
  // ------------------------------------------

  if (
    req.method === "GET" &&
    path === "/appointments/availability"
  ) {
    return jsonResponse(availability);
  }

  // ------------------------------------------
  // LIST APPOINTMENTS - ADMIN ONLY
  // ------------------------------------------

  if (
    req.method === "GET" &&
    path === "/appointments"
  ) {
    if (!isAdminRequest(req)) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    console.log(
      "Fetching appointment requests",
    );

    const { data, error } =
      await supabaseAdmin
        .from("appointments")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Failed to fetch appointments:",
        error,
      );

      return jsonResponse(
        {
          error:
            "Failed to fetch appointments",
        },
        500,
      );
    }

    return jsonResponse(
      (data || []).map(serializeAppointment),
    );
  }

  // ------------------------------------------
  // CREATE APPOINTMENT
  // ------------------------------------------

  if (
    req.method === "POST" &&
    path === "/appointments"
  ) {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON request body",
        },
        400,
      );
    }

    const parsed =
      CreateAppointmentBody.safeParse(body);

    if (!parsed.success) {
      console.warn(
        "Invalid appointment request:",
        parsed.error.message,
      );

      return jsonResponse(
        {
          error: parsed.error.message,
        },
        400,
      );
    }

    const appointmentData = {
      clinic_location:
        parsed.data.clinicLocation,

      city: parsed.data.city,

      patient_name:
        parsed.data.patientName,

      phone:
        parsed.data.phone,

      email:
        parsed.data.email || null,

      visit_type:
        parsed.data.appointmentType,

      appointment_type:
        parsed.data.appointmentType,

      preferred_date:
        parsed.data.preferredDate,

      preferred_time:
        parsed.data.preferredTime,

      message:
        parsed.data.message || null,

      attachment_name:
        parsed.data.attachmentName || null,
    };

    const { data, error } =
      await supabaseAdmin
        .from("appointments")
        .insert(appointmentData)
        .select("*")
        .single();

    if (error) {
      console.error(
        "Failed to create appointment:",
        error,
      );

      return jsonResponse(
        {
          error:
            "Failed to create appointment",
        },
        500,
      );
    }

    console.log(
      `Appointment request created: ${data.id}`,
    );

    return jsonResponse(
      serializeAppointment(data),
      201,
    );
  }

  // ------------------------------------------
  // 404
  // ------------------------------------------

  return jsonResponse(
    {
      error: "Not found",
    },
    404,
  );
});