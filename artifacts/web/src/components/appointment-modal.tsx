import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getListAppointmentsQueryKey,
  useCreateAppointment,
  type AppointmentInput,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ShieldCheck,
  X,
  Paperclip,
  FileText,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { clinicCopy, copy, type ClinicId, type Language } from '@/lib/i18n';
import {
  getClinicTimingConfig,
  generateSlotsForDate,
  getScheduleForDate,
  formatTime24to12,
  type ClinicTimingConfig,
  type TimeSlot,
} from '@/lib/clinic-timing-service';
import { addStoredAppointment, countAppointmentsForSlot } from '@/lib/appointments-service';

type ClinicSchedule = { days: string; hours: string; note: string | null };
type Clinic = {
  id: string;
  name: string;
  city: string;
  address: string;
  mapsUrl: string;
  schedule: ClinicSchedule[];
  slots: string[];
};
type AppointmentAvailability = {
  phone: string;
  emergencyPhone: string;
  clinics: Clinic[];
};

const schema = z.object({
  patientName: z.string().min(2, 'Please enter your full name.'),
  phone: z.string().min(7, 'Please enter a reachable phone number.'),
  preferredDate: z.string().min(1, 'Please choose an available date.'),
  preferredTime: z.string().min(1, 'Please choose a time slot.'),
  message: z.string().max(500, 'Please keep this note under 500 characters.').optional(),
});

type FormValues = z.infer<typeof schema>;

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('en-PK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function upcomingDates() {
  const today = new Date();
  const result: string[] = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    result.push(formatDateInput(date));
  }
  return result;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs font-medium text-[#b94b42]">{message}</p> : null;
}

export function AppointmentModal({
  open,
  onClose,
  availability,
  language = 'en',
}: {
  open: boolean;
  onClose: () => void;
  availability?: AppointmentAvailability;
  language?: Language;
}) {
  const queryClient = useQueryClient();
  const createAppointment = useCreateAppointment();
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const text = copy[language];

  // Dynamic timing config loaded from local store / admin
  const [timingConfig, setTimingConfig] = useState<ClinicTimingConfig>(getClinicTimingConfig());

  // Attachment upload state
  const [attachment, setAttachment] = useState<{
    name: string;
    type: string;
    size: string;
    dataUrl: string;
  } | null>(null);
  const [fileError, setFileError] = useState('');

  const dates = upcomingDates();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientName: '',
      phone: '',
      preferredDate: dates[0] || '',
      preferredTime: '',
      message: '',
    },
  });

  const selectedDate = form.watch('preferredDate') || dates[0] || '';
  const dateSchedule = getScheduleForDate(selectedDate, timingConfig);

  // Dynamic slot generation for the selected date
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    const config = getClinicTimingConfig();
    setTimingConfig(config);
    if (selectedDate) {
      const generated = generateSlotsForDate(selectedDate, config);
      setAvailableSlots(generated);
    }
  }, [selectedDate, open]);

  // Listen to clinic timing updates from admin
  useEffect(() => {
    const handleTimingUpdate = (e: any) => {
      if (e.detail) {
        setTimingConfig(e.detail);
        if (selectedDate) {
          setAvailableSlots(generateSlotsForDate(selectedDate, e.detail));
        }
      }
    };
    window.addEventListener('clinic_timing_updated', handleTimingUpdate);
    return () => window.removeEventListener('clinic_timing_updated', handleTimingUpdate);
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setStep(1);
      setAttachment(null);
      setFileError('');
      form.reset({
        patientName: '',
        phone: '',
        preferredDate: dates[0] || '',
        preferredTime: '',
        message: '',
      });
    }
  }, [form, open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    // Check size limit: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds 10MB limit. Please upload a smaller file or image.');
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: sizeFormatted,
        dataUrl: (event.target?.result as string) || '',
      });
    };
    reader.onerror = () => {
      setFileError('Failed to read file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const nextStep = async () => {
    if (await form.trigger(['preferredDate', 'preferredTime'])) setStep(2);
  };

  const onSubmit = (values: FormValues) => {
    // 1. Save directly into persistent appointment storage (visible immediately in admin!)
    const storedRecord = addStoredAppointment({
      clinicLocation: 'layyah',
      city: 'Layyah',
      patientName: values.patientName,
      phone: values.phone,
      email: null,
      appointmentType: 'new-patient',
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
      attachmentName: attachment ? attachment.name : null,
      attachmentData: attachment ? attachment.dataUrl : null,
      attachmentType: attachment ? attachment.type : null,
      attachmentSize: attachment ? attachment.size : null,
      status: 'requested',
    });

    // 2. Also dispatch to API client/Supabase Edge Function if reachable
    const payload: AppointmentInput = {
      clinicLocation: 'layyah',
      city: 'Layyah',
      patientName: values.patientName,
      phone: values.phone,
      email: null,
      appointmentType: 'new-patient',
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
      attachmentName: attachment ? attachment.name : null,
    };

    createAppointment.mutate(
      { data: payload },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setSubmitted(true);
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-[#153247]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5 ${
        language === 'ur' ? 'urdu-copy' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-title"
      data-testid="dialog-appointment"
    >
      <div className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#fbf8f0] shadow-2xl sm:rounded-[28px]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce3df] bg-[#fbf8f0]/95 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">
              {text.booking.access}
            </p>
            <h2 id="appointment-title" className="display-face mt-1 text-2xl font-semibold text-[#153247]">
              {text.booking.title}
            </h2>
          </div>
          <button
            className="focus-ring rounded-full p-2 text-[#587078] transition hover:bg-[#e9efec] hover:text-[#153247]"
            onClick={onClose}
            aria-label={text.booking.close}
            data-testid="button-close-appointment"
          >
            <X className="size-5" />
          </button>
        </div>

        {submitted ? (
          /* Confirmation Screen */
          <div className="px-5 py-14 text-center sm:px-16">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#dcefe8] text-[#197263]">
              <Check className="size-8" strokeWidth={2.5} />
            </div>
            <p className="mono-face mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">
              {text.booking.received}
            </p>
            <h3 className="display-face mt-2 text-3xl font-semibold text-[#153247] sm:text-4xl">
              {text.booking.goodHands}
            </h3>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#587078]">
              {text.booking.confirmation}
            </p>
            {attachment && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-[#eef6f3] px-3.5 py-2 text-xs font-semibold text-[#197263]">
                <FileCheck className="size-4" />
                <span>Attachment received: {attachment.name}</span>
              </div>
            )}
            <div className="mt-8">
              <button
                onClick={onClose}
                className="focus-ring rounded-full bg-[#153247] px-6 py-3 text-sm font-bold text-[#fbf8f0]"
                data-testid="button-finish-appointment"
              >
                {text.booking.return}
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#718287]">
                <span className="text-[#a17525]">
                  {text.booking.step} {step} {text.booking.of} 2
                </span>
                <span className="h-px flex-1 bg-[#dce3df]" />
                <span>{step === 1 ? text.booking.dateTime : text.booking.patientDetails}</span>
              </div>

              {/* Clinic notice */}
              <div className="rounded-2xl border border-[#e6d6ae] bg-[#fff8df] px-4 py-3 text-sm leading-5 text-[#6d572c]">
                {text.booking.requestNotice}
              </div>

              {/* STEP 1: Date & Time Slot Selection */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <p className="display-face text-2xl font-semibold text-[#153247]">
                      {text.booking.pickDate}
                    </p>
                    <p className="mt-1 text-xs text-[#718287]">
                      Rahmania Medical Center, Layyah · {timingConfig.appointmentsPerHour} appointments allowed per hour
                    </p>
                  </div>

                  {/* Date Selector */}
                  <label className="block text-sm font-semibold text-[#31505b]">
                    {text.booking.availableDate}
                    <select
                      {...form.register('preferredDate')}
                      className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none focus:border-[#197263]"
                      data-testid="select-preferred-date"
                    >
                      {dates.map((date) => (
                        <option key={date} value={date}>
                          {formatDateLabel(date)}
                        </option>
                      ))}
                    </select>
                    <FieldError message={form.formState.errors.preferredDate?.message} />
                  </label>

                  {/* Day Schedule Pill */}
                  <div className="rounded-xl border border-[#cbe1d9] bg-[#eef7f4] px-4 py-3 text-xs leading-5 text-[#245b53]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="size-4 text-[#197263]" />
                        <span>{dateSchedule.label} Hours:</span>
                        <span>
                          {formatTime24to12(dateSchedule.startTime)} – {formatTime24to12(dateSchedule.endTime)}
                        </span>
                      </div>
                      <span className="rounded-full bg-[#197263]/10 px-2 py-0.5 text-[10px] font-bold text-[#197263]">
                        {timingConfig.appointmentsPerHour} slots/hr
                      </span>
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#31505b]">{text.booking.timeSlot}</p>
                      <span className="text-xs font-semibold text-[#197263]">
                        {timingConfig.appointmentsPerHour} appointments per hour
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {availableSlots.map((slot) => {
                        const isSelected = form.watch('preferredTime') === slot.label;
                        const bookedCount = countAppointmentsForSlot(selectedDate, slot.label);
                        const isFull = bookedCount >= slot.capacity;
                        const remaining = Math.max(0, slot.capacity - bookedCount);

                        return (
                          <button
                            type="button"
                            key={slot.id}
                            disabled={isFull}
                            onClick={() => form.setValue('preferredTime', slot.label, { shouldValidate: true })}
                            className={`focus-ring rounded-2xl border p-3.5 text-left transition flex items-center justify-between ${
                              isFull
                                ? 'border-[#e0e5e3] bg-[#edf2ef] text-[#93a29f] cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'border-[#197263] bg-[#197263] text-white shadow-md'
                                : 'border-[#cbd9d6] bg-[#fffdf8] text-[#31505b] hover:border-[#197263] hover:bg-white'
                            }`}
                            data-testid={`button-time-${slot.label.replaceAll(' ', '-').replaceAll(':', '')}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Clock className={`size-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#197263]'}`} />
                              <div>
                                <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[#153247]'}`}>
                                  {slot.label}
                                </p>
                                <p className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#718a90]'}`}>
                                  {isFull ? 'Full (All 12 booked)' : `${remaining} of ${slot.capacity} appointments available`}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : isFull
                                ? 'bg-gray-200 text-gray-500'
                                : 'bg-[#e4f4ee] text-[#197263]'
                            }`}>
                              {isFull ? 'Full' : `${remaining} left`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError message={form.formState.errors.preferredTime?.message} />
                  </div>
                </div>
              )}

              {/* STEP 2: Patient Details & Attachments */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="display-face text-2xl font-semibold text-[#153247]">
                      {text.booking.patientDetails}
                    </p>
                    <p className="mt-1 text-xs text-[#718287]">
                      Slot: <strong>{formatDateLabel(selectedDate)} at {form.watch('preferredTime')}</strong>
                    </p>
                  </div>

                  {/* Name and Phone */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-[#31505b]">
                      {text.booking.fullName} *
                      <input
                        {...form.register('patientName')}
                        className="focus-ring mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]"
                        placeholder={text.booking.namePlaceholder}
                        data-testid="input-patient-name"
                      />
                      <FieldError message={form.formState.errors.patientName?.message} />
                    </label>

                    <label className="block text-sm font-semibold text-[#31505b]">
                      {text.booking.phone} *
                      <input
                        {...form.register('phone')}
                        type="tel"
                        className="focus-ring mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]"
                        placeholder="0300 1234567"
                        data-testid="input-patient-phone"
                      />
                      <FieldError message={form.formState.errors.phone?.message} />
                    </label>
                  </div>

                  {/* Problem Description */}
                  <label className="block text-sm font-semibold text-[#31505b]">
                    {text.booking.description}
                    <textarea
                      {...form.register('message')}
                      rows={3}
                      className="focus-ring mt-1.5 w-full resize-none rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]"
                      placeholder="Briefly describe your symptoms or past diagnosis (e.g. back pain, spine MRI, disc problem, headache)..."
                      data-testid="textarea-patient-message"
                    />
                    <FieldError message={form.formState.errors.message?.message} />
                  </label>

                  {/* ATTACHMENT UPLOAD FIELD */}
                  <div className="rounded-2xl border border-[#cbd9d6] bg-[#fbfdfc] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="size-4 text-[#197263]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#31505b]">
                          Attach Medical Reports / Prescriptions / MRI (Optional)
                        </span>
                      </div>
                      <span className="text-[11px] text-[#718a90]">Max 10MB</span>
                    </div>

                    <p className="mt-1 text-xs text-[#6e858a]">
                      Upload your previous prescription, MRI scan, X-ray, or lab report so Dr. Sajid Sohail can review it before your consultation.
                    </p>

                    {fileError && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#b94b42]">
                        <AlertCircle className="size-3.5" />
                        <span>{fileError}</span>
                      </div>
                    )}

                    {attachment ? (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#cbe1d9] bg-[#eef7f4] p-3">
                        <div className="flex items-center gap-3">
                          {attachment.type.startsWith('image/') ? (
                            <img
                              src={attachment.dataUrl}
                              alt="Thumbnail"
                              className="size-12 rounded-lg object-cover border border-[#c2ded3]"
                            />
                          ) : (
                            <div className="grid size-12 place-items-center rounded-lg bg-[#d9eee6] text-[#197263]">
                              <FileText className="size-6" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-[#153247] max-w-[240px] truncate">
                              {attachment.name}
                            </p>
                            <p className="text-[11px] text-[#5b7a74]">{attachment.size}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAttachment(null)}
                          className="rounded-full p-1 text-[#5b7a74] hover:bg-[#dbeee6] hover:text-[#b94b42]"
                          title="Remove attachment"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#b8cec7] bg-white py-4 px-3 text-center transition hover:border-[#197263] hover:bg-[#f8fbf9]">
                          <Paperclip className="size-6 text-[#197263]" />
                          <span className="mt-1 text-xs font-bold text-[#197263]">
                            Click to upload photo or document
                          </span>
                          <span className="text-[10px] text-[#718a90]">
                            Supports JPG, PNG, PDF, DOCX (Up to 10MB)
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e0e7e3] pt-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-[#b8cbc6] px-4 py-2.5 text-sm font-bold text-[#31505b]"
                      data-testid="button-booking-back"
                    >
                      <ArrowLeft className="size-3.5" />
                      {text.booking.back}
                    </button>
                  )}
                  <p className="text-xs leading-5 text-[#718287]">
                    <ShieldCheck className="mr-1 inline size-3.5 text-[#197263]" />
                    {text.booking.detailsStay}
                  </p>
                </div>

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0]"
                    data-testid="button-booking-next"
                  >
                    {text.booking.continue} <ArrowUpRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={createAppointment.isPending}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0] disabled:cursor-wait disabled:opacity-60"
                    data-testid="button-submit-appointment"
                  >
                    {createAppointment.isPending ? text.booking.sending : text.booking.send}{' '}
                    <ArrowUpRight className="size-4" />
                  </button>
                )}
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}