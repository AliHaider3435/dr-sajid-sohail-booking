export type DaySchedule = {
  active: boolean;
  startTime: string; // e.g. "15:30" (24-hour format)
  endTime: string;   // e.g. "21:00"
  label: string;     // Display label
};

export type ClinicTimingConfig = {
  monToSat: DaySchedule;
  sunday: DaySchedule;
  appointmentsPerHour: number; // e.g. 12
  slotIntervalMinutes: number; // e.g. 5 minutes for 12 per hour
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  phone: string;
  emergencyPhone: string;
  customNotice?: string;
  updatedAt: string;
};

const STORAGE_KEY = 'dr_sajid_clinic_timing_config_v1';

export const DEFAULT_CLINIC_CONFIG: ClinicTimingConfig = {
  monToSat: {
    active: true,
    startTime: '15:30', // 3:30 PM
    endTime: '21:00',   // 9:00 PM
    label: 'Monday – Saturday',
  },
  sunday: {
    active: true,
    startTime: '12:00', // 12:00 PM
    endTime: '20:00',   // 8:00 PM
    label: 'Sunday',
  },
  appointmentsPerHour: 12,
  slotIntervalMinutes: 5, // 60 mins / 12 = 5 min slots
  clinicName: 'Rahmania Medical Center, Layyah',
  clinicAddress: 'Employees Colony, Layyah',
  clinicCity: 'Layyah',
  phone: '0300 5809938',
  emergencyPhone: '0337 762873',
  customNotice: '',
  updatedAt: new Date().toISOString(),
};

/**
 * Format "15:30" to "3:30 PM"
 */
export function formatTime24to12(time24: string): string {
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr || '0', 10);
  const minute = parseInt(minuteStr || '0', 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Parses "3:30 PM" or "15:30" to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (timeStr.includes(':')) {
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    const clean = timeStr.replace(/[^\d:]/g, '');
    const [h, m] = clean.split(':').map(Number);
    let hour = h || 0;
    const min = m || 0;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    return hour * 60 + min;
  }
  return 0;
}

/**
 * Load clinic timing configuration from storage
 */
export function getClinicTimingConfig(): ClinicTimingConfig {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CLINIC_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CLINIC_CONFIG,
      ...parsed,
      monToSat: { ...DEFAULT_CLINIC_CONFIG.monToSat, ...parsed.monToSat },
      sunday: { ...DEFAULT_CLINIC_CONFIG.sunday, ...parsed.sunday },
    };
  } catch {
    return DEFAULT_CLINIC_CONFIG;
  }
}

/**
 * Save clinic timing configuration to storage and notify listeners
 */
export function saveClinicTimingConfig(config: ClinicTimingConfig): void {
  if (typeof window === 'undefined') return;
  const toSave = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  window.dispatchEvent(new CustomEvent('clinic_timing_updated', { detail: toSave }));
}

/**
 * Get schedule for a specific date (checking whether it is Sunday or Mon-Sat)
 */
export function getScheduleForDate(dateStr: string, config = getClinicTimingConfig()): DaySchedule {
  // Parse date safely
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  const dayOfWeek = dateObj.getDay(); // 0 is Sunday

  if (dayOfWeek === 0) {
    return config.sunday;
  }
  return config.monToSat;
}

/**
 * Dynamically generate time slots for a given date
 * Respects Mon-Sat (3:30 PM - 9:00 PM) vs Sunday (12:00 PM - 8:00 PM)
 * and generates 12 appointment slots per hour (every 5 mins).
 */
export function generateSlotsForDate(dateStr: string, config = getClinicTimingConfig()): string[] {
  const schedule = getScheduleForDate(dateStr, config);
  if (!schedule.active) return [];

  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);

  if (startMinutes >= endMinutes) return [];

  // Interval based on appointments per hour (e.g. 60 / 12 = 5 mins)
  const apptsPerHour = Math.max(1, config.appointmentsPerHour || 12);
  const interval = Math.max(1, Math.floor(60 / apptsPerHour));

  const slots: string[] = [];
  for (let m = startMinutes; m <= endMinutes; m += interval) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    slots.push(`${displayHour}:${String(minute).padStart(2, '0')} ${period}`);
  }

  return slots;
}

/**
 * Format human-readable summary of schedule
 */
export function getClinicScheduleSummary(config = getClinicTimingConfig()): {
  monSatSummary: string;
  sunSummary: string;
  fullSchedule: string;
} {
  const monSatStr = config.monToSat.active
    ? `Mon – Sat: ${formatTime24to12(config.monToSat.startTime)} – ${formatTime24to12(config.monToSat.endTime)}`
    : 'Mon – Sat: Closed';

  const sunStr = config.sunday.active
    ? `Sunday: ${formatTime24to12(config.sunday.startTime)} – ${formatTime24to12(config.sunday.endTime)}`
    : 'Sunday: Closed';

  return {
    monSatSummary: monSatStr,
    sunSummary: sunStr,
    fullSchedule: `${monSatStr} · ${sunStr}`,
  };
}
