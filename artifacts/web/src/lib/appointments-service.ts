export type AppointmentRecord = {
  id: string | number;
  patientName: string;
  phone: string;
  email?: string | null;
  clinicLocation: string;
  city: string;
  appointmentType: 'new-patient' | 'follow-up' | 'emergency-consultation';
  preferredDate: string;
  preferredTime: string;
  message?: string | null;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  attachmentName?: string | null;
  attachmentData?: string | null; // Base64 data URL or remote URL
  attachmentType?: string | null; // e.g. "image/jpeg", "application/pdf"
  attachmentSize?: string | null; // e.g. "1.2 MB"
  createdAt: string;
};

const STORAGE_KEY = 'dr_sajid_appointments_records_v1';

const INITIAL_APPOINTMENTS: AppointmentRecord[] = [
  {
    id: 101,
    patientName: 'Kashif Ali',
    phone: '0301 7894561',
    email: 'kashif.ali@gmail.com',
    clinicLocation: 'layyah',
    city: 'Layyah',
    appointmentType: 'new-patient',
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTime: '4:15 PM',
    message: 'Persistent lower back pain radiating down the left leg for 3 months. MRI scan attached.',
    status: 'requested',
    attachmentName: 'lumbar_mri_report.jpg',
    attachmentType: 'image/jpeg',
    attachmentSize: '450 KB',
    attachmentData: '/images/mri-brain-scan.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 102,
    patientName: 'Zainab Noor',
    phone: '0304 9871234',
    email: 'zainab.n@yahoo.com',
    clinicLocation: 'layyah',
    city: 'Layyah',
    appointmentType: 'follow-up',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferredTime: '5:30 PM',
    message: 'Post-operative follow up check after endoscopic spinal consultation.',
    status: 'confirmed',
    attachmentName: 'prescription_summary.pdf',
    attachmentType: 'application/pdf',
    attachmentSize: '210 KB',
    attachmentData: null,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 103,
    patientName: 'Shahid Mehmood',
    phone: '0333 4455667',
    email: null,
    clinicLocation: 'layyah',
    city: 'Layyah',
    appointmentType: 'new-patient',
    preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    preferredTime: '6:00 PM',
    message: 'Frequent severe headaches and dizziness, requesting neurological evaluation.',
    status: 'requested',
    attachmentName: null,
    attachmentType: null,
    attachmentSize: null,
    attachmentData: null,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getStoredAppointments(): AppointmentRecord[] {
  if (typeof window === 'undefined') return INITIAL_APPOINTMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
      return INITIAL_APPOINTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_APPOINTMENTS;
  }
}

export function saveStoredAppointments(appointments: AppointmentRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  window.dispatchEvent(new CustomEvent('appointments_updated', { detail: appointments }));
}

export function addStoredAppointment(
  appointment: Omit<AppointmentRecord, 'id' | 'createdAt' | 'status'> & {
    id?: string | number;
    status?: AppointmentRecord['status'];
  }
): AppointmentRecord {
  const current = getStoredAppointments();
  const newRecord: AppointmentRecord = {
    ...appointment,
    id: appointment.id || `app-${Date.now()}`,
    status: appointment.status || 'requested',
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...current];
  saveStoredAppointments(updated);
  return newRecord;
}

export function updateAppointmentStatus(
  id: string | number,
  status: AppointmentRecord['status']
): void {
  const current = getStoredAppointments();
  const updated = current.map((item) =>
    String(item.id) === String(id) ? { ...item, status } : item
  );
  saveStoredAppointments(updated);
}

export function deleteStoredAppointment(id: string | number): void {
  const current = getStoredAppointments();
  const updated = current.filter((item) => String(item.id) !== String(id));
  saveStoredAppointments(updated);
}

/**
 * Counts how many appointments are booked for a given date and slot
 */
export function countAppointmentsForSlot(dateStr: string, slotStr: string): number {
  const all = getStoredAppointments();
  return all.filter(
    (a) =>
      a.preferredDate === dateStr &&
      a.preferredTime.toLowerCase() === slotStr.toLowerCase() &&
      a.status !== 'cancelled'
  ).length;
}
