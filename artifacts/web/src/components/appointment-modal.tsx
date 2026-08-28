import { zodResolver } from '@hookform/resolvers/zod';
import {
  getListAppointmentsQueryKey,
  useCreateAppointment,
  type AppointmentInput,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, FileText, HeartPulse, ImagePlus, MapPin, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { appointmentTypeCopy, clinicCopy, copy, type ClinicId, type Language } from '@/lib/i18n';

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
type AppointmentType = { value: string; label: string; description: string };
type AppointmentAvailability = {
  phone: string;
  emergencyPhone: string;
  clinics: Clinic[];
  appointmentTypes: AppointmentType[];
};

const schema = z.object({
  clinicLocation: z.enum(['multan', 'layyah', 'dg-khan']),
  city: z.string().min(2, 'Please enter your city.'),
  patientName: z.string().min(2, 'Please enter your full name.'),
  phone: z.string().min(7, 'Please enter a reachable phone number.'),
  email: z.string().email('Please enter a valid email.').or(z.literal('')),
  appointmentType: z.enum(['new-patient', 'follow-up', 'emergency-consultation']),
  preferredDate: z.string().min(1, 'Please choose an available date.'),
  preferredTime: z.string().min(1, 'Please choose a time slot.'),
  message: z.string().max(500, 'Please keep this note under 500 characters.'),
  attachmentName: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const fallbackTypes: AppointmentType[] = [
  { value: 'new-patient', label: 'New patient', description: 'Your first consultation with Dr. Kharal.' },
  { value: 'follow-up', label: 'Follow-up patient', description: 'A review after a previous consultation or procedure.' },
  { value: 'emergency-consultation', label: 'Emergency consultation', description: 'For urgent concerns; call the emergency number for immediate help.' },
];

const fallbackClinics: Clinic[] = [
  {
    id: 'multan',
    name: 'Neuro Tower Multan',
    city: 'Multan',
    address: 'Ahmad Clinics, Al-Kareem Center, Nishtar Road, Multan',
    mapsUrl: 'https://maps.google.com/maps?hl=en&gl=pk&um=1&ie=UTF-8&fb=1&entry=s&sa=X&ftid=0x393b33635472cbbf:0xb310c5afb8c46340',
    schedule: [
      { days: 'Monday, Wednesday, Thursday & Friday', hours: '5:00 PM – 7:00 PM', note: 'Clinic' },
      { days: 'Saturday', hours: '2:00 PM – 3:00 PM', note: 'Clinic' },
      { days: 'Friday', hours: '7:00 PM – 8:00 PM', note: 'Online consultation' },
    ],
    slots: ['5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM', '6:00 PM', '6:15 PM', '6:30 PM', '6:45 PM'],
  },
  {
    id: 'dg-khan',
    name: 'Khadija Hospital, Dera Ghazi Khan',
    city: 'DG Khan',
    address: 'Bank Islami wali gali, near KFC Hotel, opposite DHQ Hospital, Dera Ghazi Khan',
    mapsUrl: 'https://maps.app.goo.gl/THSNESnMQAEt2qpa6?g_st=awb',
    schedule: [{ days: 'First & third Tuesday of every month', hours: '2:00 PM – 6:00 PM', note: 'Clinic' }],
    slots: ['2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM', '3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM', '4:00 PM', '4:15 PM', '4:30 PM', '4:45 PM', '5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM'],
  },
  {
    id: 'layyah',
    name: 'Kharl Medical Complex, Layyah',
    city: 'Layyah',
    address: 'Clinic of Dr Sajjad Kharl, opposite DHQ Hospital, Layyah',
    mapsUrl: 'https://maps.google.com/?q=Kharl+Medical+Complex+Layyah',
    schedule: [{ days: 'Second & fourth Sunday of every month', hours: '9:00 AM – 6:00 PM', note: 'Endoscopic brain & spine clinic' }],
    slots: ['9:00 AM', '9:15 AM', '9:30 AM', '9:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM', '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '1:00 PM', '1:15 PM', '1:30 PM', '1:45 PM', '2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM', '3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM', '4:00 PM', '4:15 PM', '4:30 PM', '4:45 PM', '5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM'],
  },
];

const shortMultanSlots = ['2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM'];
const onlineMultanSlots = ['7:00 PM (Online)', '7:15 PM (Online)', '7:30 PM (Online)', '7:45 PM (Online)'];

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isClinicDate(clinicId: string, date: Date) {
  const weekday = date.getDay();
  const occurrence = Math.floor((date.getDate() - 1) / 7) + 1;
  if (clinicId === 'multan') return [1, 3, 4, 5, 6].includes(weekday);
  if (clinicId === 'dg-khan') return weekday === 2 && [1, 3].includes(occurrence);
  return weekday === 0 && [2, 4].includes(occurrence);
}

function upcomingDates(clinicId: string) {
  const today = new Date();
  const result: string[] = [];
  for (let offset = 0; offset < 120 && result.length < 8; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    if (isClinicDate(clinicId, date)) result.push(formatDateInput(date));
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
  const [fileName, setFileName] = useState('');
  const text = copy[language];
  const clinics = availability?.clinics?.length ? availability.clinics : fallbackClinics;
  const types = availability?.appointmentTypes?.length ? availability.appointmentTypes : fallbackTypes;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicLocation: 'multan',
      city: 'Multan',
      patientName: '',
      phone: '',
      email: '',
      appointmentType: 'new-patient',
      preferredDate: '',
      preferredTime: '',
      message: '',
      attachmentName: null,
    },
  });
  const selectedLocation = form.watch('clinicLocation');
  const selectedDate = form.watch('preferredDate');
  const selectedClinic = clinics.find((clinic) => clinic.id === selectedLocation) ?? clinics[0];
  const dates = selectedClinic ? upcomingDates(selectedClinic.id) : [];
  const slots = selectedClinic
    ? selectedClinic.id === 'multan' && selectedDate && new Date(`${selectedDate}T12:00:00`).getDay() === 6
      ? shortMultanSlots
      : selectedClinic.id === 'multan' && selectedDate && new Date(`${selectedDate}T12:00:00`).getDay() === 5
        ? [...selectedClinic.slots, ...onlineMultanSlots]
        : selectedClinic.slots
    : [];
  const selectedClinicDetails = selectedClinic ? clinicCopy[language][selectedClinic.id as ClinicId] : null;
  const localizedType = (value: string) => appointmentTypeCopy[language][value as keyof typeof appointmentTypeCopy.en] ?? { label: value, description: '' };

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
      setFileName('');
      form.reset();
    }
  }, [form, open]);

  useEffect(() => {
    if (!selectedClinic) return;
    form.setValue('city', selectedClinic.city);
    if (!dates.includes(form.getValues('preferredDate'))) {
      form.setValue('preferredDate', dates[0] ?? '');
      form.setValue('preferredTime', '');
    }
  }, [selectedClinic?.id, dates[0]]);

  const chooseClinic = (clinic: Clinic) => {
    form.setValue('clinicLocation', clinic.id as FormValues['clinicLocation'], { shouldValidate: true });
    form.setValue('city', clinic.city);
    form.setValue('preferredDate', upcomingDates(clinic.id)[0] ?? '');
    form.setValue('preferredTime', '');
  };

  const nextStep = async () => {
    const fields: Record<number, (keyof FormValues)[]> = {
      1: ['clinicLocation'],
      2: ['appointmentType'],
      3: ['preferredDate', 'preferredTime'],
    };
    if (await form.trigger(fields[step])) setStep((current) => Math.min(4, current + 1));
  };

  const onSubmit = (values: FormValues) => {
    const payload: AppointmentInput = {
      clinicLocation: values.clinicLocation,
      city: values.city,
      patientName: values.patientName,
      phone: values.phone,
      email: values.email || null,
      appointmentType: values.appointmentType,
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
      attachmentName: values.attachmentName,
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
               <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#718287]"><span className="text-[#a17525]">{text.booking.step} {step} {text.booking.of}</span><span className="h-px flex-1 bg-[#dce3df]" /><span>{step === 1 ? text.booking.chooseClinic : step === 2 ? text.booking.appointmentType : step === 3 ? text.booking.dateTime : text.booking.patientDetails}</span></div>
               <div className="rounded-2xl border border-[#e6d6ae] bg-[#fff8df] px-4 py-3 text-sm leading-5 text-[#6d572c]">{text.booking.requestNotice}</div>
               {step === 1 && <div className="space-y-4"><div><p className="display-face text-2xl font-semibold text-[#153247]">{text.booking.where}</p><p className="mt-1 text-sm text-[#718287]">{text.booking.chooseClosest}</p></div><div className="grid gap-3">{clinics.map((clinic) => { const details = clinicCopy[language][clinic.id as ClinicId]; return <button type="button" key={clinic.id} onClick={() => chooseClinic(clinic)} className={`focus-ring rounded-2xl border p-4 text-left transition ${selectedLocation === clinic.id ? 'border-[#197263] bg-[#e7f0ec]' : 'border-[#cbd9d6] bg-[#fffdf8] hover:-translate-y-0.5 hover:border-[#9fbab3]'}`} data-testid={`button-clinic-${clinic.id}`}><span className="flex items-start gap-3"><MapPin className={`mt-0.5 size-5 shrink-0 ${selectedLocation === clinic.id ? 'text-[#197263]' : 'text-[#718287]'}`} /><span><span className="block font-bold text-[#153247]">{details.city}</span><span className="mt-1 block text-sm text-[#587078]">{clinic.name}</span><span className="mt-1 block text-xs leading-5 text-[#718287]">{details.address}</span></span>{selectedLocation === clinic.id && <Check className="ml-auto size-5 shrink-0 text-[#197263]" />}</span></button>; })}</div><FieldError message={form.formState.errors.clinicLocation?.message} /></div>}
               {step === 2 && <div className="space-y-4"><div><p className="display-face text-2xl font-semibold text-[#153247]">{text.booking.brings}</p><p className="mt-1 text-sm text-[#718287]">{text.booking.selectType}</p></div><div className="grid gap-3">{types.map((type) => { const translated = localizedType(type.value); return <button type="button" key={type.value} onClick={() => form.setValue('appointmentType', type.value as FormValues['appointmentType'], { shouldValidate: true })} className={`focus-ring rounded-2xl border p-4 text-left transition ${form.watch('appointmentType') === type.value ? 'border-[#197263] bg-[#e7f0ec]' : 'border-[#cbd9d6] bg-[#fffdf8] hover:-translate-y-0.5 hover:border-[#9fbab3]'}`} data-testid={`button-type-${type.value}`}><span className="flex items-start gap-3"><HeartPulse className="mt-0.5 size-5 shrink-0 text-[#197263]" /><span><span className="block font-bold text-[#153247]">{translated.label}</span><span className="mt-1 block text-sm text-[#718287]">{translated.description}</span></span>{form.watch('appointmentType') === type.value && <Check className="ml-auto size-5 shrink-0 text-[#197263]" />}</span></button>; })}</div><FieldError message={form.formState.errors.appointmentType?.message} />{form.watch('appointmentType') === 'emergency-consultation' && <p className="rounded-xl bg-[#fbe9e6] px-4 py-3 text-sm font-medium leading-5 text-[#a8443b]">{text.booking.emergency} {availability?.emergencyPhone ?? '0337 762873'} {text.booking.nearestEmergency}</p>}</div>}
               {step === 3 && selectedClinic && <div className="space-y-5"><div><p className="display-face text-2xl font-semibold text-[#153247]">{text.booking.pickDate}</p><p className="mt-1 text-sm text-[#718287]">{selectedClinicDetails?.city} {text.booking.datesFollow}</p></div><label className="block text-sm font-semibold text-[#31505b]">{text.booking.availableDate}<select {...form.register('preferredDate')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none focus:border-[#197263]" data-testid="select-preferred-date"><option value="">{text.booking.chooseDate}</option>{dates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}</select><FieldError message={form.formState.errors.preferredDate?.message} /></label><div><p className="text-sm font-semibold text-[#31505b]">{text.booking.timeSlot}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{slots.map((slot) => <button type="button" key={slot} onClick={() => form.setValue('preferredTime', slot, { shouldValidate: true })} className={`focus-ring rounded-xl border px-3 py-3 text-sm font-bold transition ${form.watch('preferredTime') === slot ? 'border-[#197263] bg-[#197263] text-white' : 'border-[#cbd9d6] bg-[#fffdf8] text-[#31505b] hover:border-[#197263]'}`} data-testid={`button-time-${slot.replaceAll(' ', '-').replaceAll(':', '')}`}>{slot}</button>)}</div><FieldError message={form.formState.errors.preferredTime?.message} /></div><div className="rounded-xl bg-[#e7f0ec] px-4 py-3 text-xs leading-5 text-[#315b61]"><CalendarDays className="mr-1.5 inline size-4 text-[#197263]" />{selectedClinicDetails?.schedule.map((item) => `${item.days}: ${item.hours}`).join(' · ')}</div></div>}
               {step === 4 && <><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#31505b]">{text.booking.fullName}<input {...form.register('patientName')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.namePlaceholder} data-testid="input-patient-name" /><FieldError message={form.formState.errors.patientName?.message} /></label><label className="block text-sm font-semibold text-[#31505b]">{text.booking.phone}<input {...form.register('phone')} type="tel" className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.phonePlaceholder} data-testid="input-patient-phone" /><FieldError message={form.formState.errors.phone?.message} /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#31505b]">{text.booking.city}<input {...form.register('city')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.cityPlaceholder} data-testid="input-patient-city" /><FieldError message={form.formState.errors.city?.message} /></label><label className="block text-sm font-semibold text-[#31505b]">{text.booking.email} <span className="font-normal text-[#91a0a2]">{text.booking.optional}</span><input {...form.register('email')} type="email" className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.emailPlaceholder} data-testid="input-patient-email" /><FieldError message={form.formState.errors.email?.message} /></label></div><label className="block text-sm font-semibold text-[#31505b]">{text.booking.mainProblem} <span className="font-normal text-[#91a0a2]">{text.booking.optional}</span><textarea {...form.register('message')} rows={3} className="focus-ring mt-2 w-full resize-none rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder={text.booking.problemPlaceholder} data-testid="textarea-patient-message" /><FieldError message={form.formState.errors.message?.message} /></label><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#9fbab3] bg-[#f2f8f4] px-4 py-4 text-sm font-semibold text-[#31505b]"><ImagePlus className="size-5 shrink-0 text-[#197263]" /><span className="min-w-0 flex-1"><span className="block">{text.booking.attach} <span className="font-normal text-[#91a0a2]">{text.booking.optional}</span></span><span className="mt-1 block truncate text-xs font-normal text-[#718287]">{fileName || text.booking.fileHint}</span></span><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" data-testid="input-patient-attachment" onChange={(event) => { const file = event.target.files?.[0]; const name = file?.name ?? ''; setFileName(name); form.setValue('attachmentName', name || null); }} /><FileText className="size-4 shrink-0 text-[#718287]" /></label></>}
               {createAppointment.isError && <p className="rounded-xl bg-[#fbe9e6] px-4 py-3 text-sm font-medium text-[#a8443b]" role="alert">{text.booking.error}</p>}
               <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e0e7e3] pt-5 sm:flex-row sm:items-center"><div className="flex items-center gap-2">{step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[#b8cbc6] px-4 py-2.5 text-sm font-bold text-[#31505b]" data-testid="button-booking-back"><ArrowLeft className="size-3.5" />{text.booking.back}</button>}<p className="text-xs leading-5 text-[#718287]"><ShieldCheck className="mr-1 inline size-3.5 text-[#197263]" />{text.booking.detailsStay}</p></div>{step < 4 ? <button type="button" onClick={nextStep} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0]" data-testid="button-booking-next">{text.booking.continue} <ArrowUpRight className="size-4" /></button> : <button type="submit" disabled={createAppointment.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0] disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-appointment">{createAppointment.isPending ? text.booking.sending : text.booking.send} <ArrowUpRight className="size-4" /></button>}</div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}