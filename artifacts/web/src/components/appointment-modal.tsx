import { zodResolver } from '@hookform/resolvers/zod';
import {
  getListAppointmentsQueryKey,
  useCreateAppointment,
  type AppointmentInput,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { clinicCopy, copy, type ClinicId, type Language } from '@/lib/i18n';

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
  message: z.string().max(500, 'Please keep this note under 500 characters.'),
});

type FormValues = z.infer<typeof schema>;

const fallbackClinics: Clinic[] = [
  {
    id: 'layyah',
    name: 'Rahmania Medical Center, Layyah',
    city: 'Layyah',
    address: 'Employees Colony, Layyah',
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=30.9723221%2C70.9651555',
    schedule: [{ days: 'Daily', hours: '4:00 PM – 8:00 PM', note: 'Endoscopic brain & spine clinic' }],
    slots: Array.from({ length: 17 }, (_, index) => {
      const hour = 16 + Math.floor(index / 4);
      const minute = (index % 4) * 15;
      return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} PM`;
    }),
  },
];

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
}

function upcomingDates() {
  const today = new Date();
  const result: string[] = [];
  for (let offset = 0; offset < 8; offset += 1) {
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
  const availableClinics = availability?.clinics?.filter((clinic) => clinic.id === 'layyah') ?? [];
  const clinics = availableClinics.length ? availableClinics : fallbackClinics;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientName: '',
      phone: '',
      preferredDate: '',
      preferredTime: '',
      message: '',
    },
  });
  const selectedClinic = clinics[0];
  const dates = selectedClinic ? upcomingDates() : [];
  const slots = Array.from({ length: 17 }, (_, index) => {
    const hour = 16 + Math.floor(index / 4);
    const minute = (index % 4) * 15;
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} PM`;
  });
  const selectedClinicDetails = selectedClinic
    ? clinicCopy[language][selectedClinic.id as ClinicId] ?? selectedClinic
    : null;

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
      form.reset();
    }
  }, [form, open]);

  useEffect(() => {
    if (!selectedClinic) return;
    if (!dates.includes(form.getValues('preferredDate'))) {
      form.setValue('preferredDate', dates[0] ?? '');
      form.setValue('preferredTime', '');
    }
  }, [selectedClinic?.id, dates[0]]);

  const nextStep = async () => {
    if (await form.trigger(['preferredDate', 'preferredTime'])) setStep(2);
  };

  const onSubmit = (values: FormValues) => {
    const payload: AppointmentInput = {
      clinicLocation: 'layyah',
      city: selectedClinic?.city ?? 'Layyah',
      patientName: values.patientName,
      phone: values.phone,
      email: null,
      appointmentType: 'new-patient',
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
      attachmentName: null,
    };
    createAppointment.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        setSubmitted(true);
      },
    });
  };

  if (!open) return null;

  return (
    <div className={`modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-[#153247]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5 ${language === 'ur' ? 'urdu-copy' : ''}`} role="dialog" aria-modal="true" aria-labelledby="appointment-title" data-testid="dialog-appointment">
      <div className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#fbf8f0] shadow-2xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce3df] bg-[#fbf8f0]/95 px-5 py-4 backdrop-blur sm:px-8">
          <div><p className="mono-face text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">{text.booking.access}</p><h2 id="appointment-title" className="display-face mt-1 text-2xl font-semibold text-[#153247]">{text.booking.title}</h2></div>
          <button className="focus-ring rounded-full p-2 text-[#587078] transition hover:bg-[#e9efec] hover:text-[#153247]" onClick={onClose} aria-label={text.booking.close} data-testid="button-close-appointment"><X className="size-5" /></button>
        </div>
        {submitted ? (
          <div className="px-5 py-14 text-center sm:px-16">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#dcefe8] text-[#197263]"><Check className="size-8" strokeWidth={2.5} /></div>
             <p className="mono-face mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">{text.booking.received}</p>
             <h3 className="display-face mt-2 text-4xl font-semibold text-[#153247]">{text.booking.goodHands}</h3>
             <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#587078]">{text.booking.confirmation}</p>
             <button onClick={onClose} className="focus-ring mt-8 rounded-full bg-[#153247] px-6 py-3 text-sm font-bold text-[#fbf8f0]" data-testid="button-finish-appointment">{text.booking.return}</button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
               <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#718287]"><span className="text-[#a17525]">{text.booking.step} {step} {text.booking.of}</span><span className="h-px flex-1 bg-[#dce3df]" /><span>{step === 1 ? text.booking.dateTime : text.booking.patientDetails}</span></div>
               <div className="rounded-2xl border border-[#e6d6ae] bg-[#fff8df] px-4 py-3 text-sm leading-5 text-[#6d572c]">{text.booking.requestNotice}</div>
               {step === 1 && selectedClinic && <div className="space-y-5"><div><p className="display-face text-2xl font-semibold text-[#153247]">{text.booking.pickDate}</p><p className="mt-1 text-sm text-[#718287]">{selectedClinicDetails?.city} {text.booking.datesFollow}</p></div><label className="block text-sm font-semibold text-[#31505b]">{text.booking.availableDate}<select {...form.register('preferredDate')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none focus:border-[#197263]" data-testid="select-preferred-date"><option value="">{text.booking.chooseDate}</option>{dates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}</select><FieldError message={form.formState.errors.preferredDate?.message} /></label><div><p className="text-sm font-semibold text-[#31505b]">{text.booking.timeSlot}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{slots.map((slot) => <button type="button" key={slot} onClick={() => form.setValue('preferredTime', slot, { shouldValidate: true })} className={`focus-ring rounded-xl border px-3 py-3 text-sm font-bold transition ${form.watch('preferredTime') === slot ? 'border-[#197263] bg-[#197263] text-white' : 'border-[#cbd9d6] bg-[#fffdf8] text-[#31505b] hover:border-[#197263]'}`} data-testid={`button-time-${slot.replaceAll(' ', '-').replaceAll(':', '')}`}>{slot}</button>)}</div><FieldError message={form.formState.errors.preferredTime?.message} /></div><div className="rounded-xl bg-[#e7f0ec] px-4 py-3 text-xs leading-5 text-[#315b61]"><CalendarDays className="mr-1.5 inline size-4 text-[#197263]" />{selectedClinicDetails?.schedule.map((item) => `${item.days}: ${item.hours}`).join(' · ')}</div></div>}
               {step === 2 && <div className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#31505b]">{text.booking.fullName}<input {...form.register('patientName')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.namePlaceholder} data-testid="input-patient-name" /><FieldError message={form.formState.errors.patientName?.message} /></label><label className="block text-sm font-semibold text-[#31505b]">{text.booking.phone}<input {...form.register('phone')} type="tel" className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.phonePlaceholder} data-testid="input-patient-phone" /><FieldError message={form.formState.errors.phone?.message} /></label></div><label className="block text-sm font-semibold text-[#31505b]">{text.booking.description}<textarea {...form.register('message')} rows={3} className="focus-ring mt-2 w-full resize-none rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.descriptionPlaceholder} data-testid="textarea-patient-message" /><FieldError message={form.formState.errors.message?.message} /></label></div>}
               {createAppointment.isError && <p className="rounded-xl bg-[#fbe9e6] px-4 py-3 text-sm font-medium text-[#a8443b]" role="alert">{text.booking.error}</p>}
               <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e0e7e3] pt-5 sm:flex-row sm:items-center"><div className="flex items-center gap-2">{step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[#b8cbc6] px-4 py-2.5 text-sm font-bold text-[#31505b]" data-testid="button-booking-back"><ArrowLeft className="size-3.5" />{text.booking.back}</button>}<p className="text-xs leading-5 text-[#718287]"><ShieldCheck className="mr-1 inline size-3.5 text-[#197263]" />{text.booking.detailsStay}</p></div>{step === 1 ? <button type="button" onClick={nextStep} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0]" data-testid="button-booking-next">{text.booking.continue} <ArrowUpRight className="size-4" /></button> : <button type="submit" disabled={createAppointment.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0] disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-appointment">{createAppointment.isPending ? text.booking.sending : text.booking.send} <ArrowUpRight className="size-4" /></button>}</div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}