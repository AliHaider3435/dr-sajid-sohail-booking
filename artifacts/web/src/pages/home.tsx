import { zodResolver } from '@hookform/resolvers/zod';
import {
  getGetAppointmentAvailabilityQueryKey,
  getListAppointmentsQueryKey,
  useCreateAppointment,
  useGetAppointmentAvailability,
  useListAppointments,
  type AppointmentInput,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BadgeCheck,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  HeartPulse,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { AppointmentModal as BookingModal } from '@/components/appointment-modal';
import { clinicCopy, copy, type ClinicId, type Language } from '@/lib/i18n';

const appointmentSchema = z.object({
  clinicLocation: z.enum(['multan', 'layyah', 'dg-khan'], {
    required_error: 'Please choose a clinic location.',
  }),
  city: z.string().min(2, 'Please enter your city.'),
  patientName: z.string().min(2, 'Please enter your full name.'),
  phone: z.string().min(7, 'Please enter a reachable phone number.'),
  email: z.string().email('Please enter a valid email.').or(z.literal('')),
  appointmentType: z.enum(['new-patient', 'follow-up', 'emergency-consultation'], {
    required_error: 'Please choose an appointment type.',
  }),
  preferredDate: z.string().min(1, 'Please select a preferred date.'),
  preferredTime: z.string().min(1, 'Please select a preferred time.'),
  message: z.string().max(500, 'Please keep this note under 500 characters.'),
  attachmentName: z.string().nullable(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const fallbackAppointmentTypes = [
  { value: 'new-patient', label: 'New patient', description: 'Your first consultation with Dr. Kharal.' },
  { value: 'follow-up', label: 'Follow-up patient', description: 'A review after a previous consultation or procedure.' },
  { value: 'emergency-consultation', label: 'Emergency consultation', description: 'For urgent concerns; call the emergency number for immediate help.' },
];

const fallbackVisitTypes = fallbackAppointmentTypes.map((type) => ({
  ...type,
  duration: '30 min',
}));

const fallbackClinics = [
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
  whatsappMessage: string[];
  clinics: Clinic[];
  appointmentTypes: AppointmentType[];
};

const reviews = {
  en: [
    { quote: 'Dr. Kharal explained my condition in a way our whole family could understand. The calmness in the room changed everything.', name: 'Ayesha M.', context: 'Patient family · Multan' },
    { quote: 'I came in frightened about my back pain and left with a clear plan. I never felt rushed or talked over.', name: 'Muhammad R.', context: 'Spine consultation · Multan' },
    { quote: 'The follow-up was just as thoughtful as the first appointment. It felt like care, not a transaction.', name: 'Sana A.', context: 'Follow-up patient · South Punjab' },
  ],
  ur: [
    { quote: 'ڈاکٹر کھرل نے ہماری پوری فیملی کو میری بیماری اس طرح سمجھائی کہ سب آسانی سے سمجھ گئے۔ ان کے اطمینان نے سب کچھ بدل دیا۔', name: 'عائشہ م.', context: 'مریض کے خاندان سے · ملتان' },
    { quote: 'کمر کے درد کی وجہ سے خوف زدہ آیا تھا، مگر واضح منصوبے کے ساتھ واپس گیا۔ مجھے جلدی میں محسوس نہیں کرایا گیا۔', name: 'محمد ر.', context: 'ریڑھ کی ہڈی کا مشورہ · ملتان' },
    { quote: 'فالو اَپ بھی پہلے مشورے جتنا ہی توجہ سے کیا گیا۔ یہ علاج محسوس ہوا، کوئی رسمی کارروائی نہیں۔', name: 'ثناء ا.', context: 'فالو اَپ مریض · جنوبی پنجاب' },
  ],
} as const;

function FieldError({ message }: { message?: unknown }) {
  if (typeof message !== 'string' || !message) return null;
  return <p className="mt-1.5 text-xs font-medium text-[#b94b42]">{message}</p>;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" data-testid="brand-mark">
      <span
        className={`grid size-9 place-items-center rounded-[11px] ${
          inverse ? 'bg-[#f2c55f] text-[#153247]' : 'bg-[#153247] text-[#f2c55f]'
        }`}
      >
        <span className="text-lg font-extrabold leading-none">IK</span>
      </span>
      <span className="leading-tight">
        <span className={`block text-[13px] font-extrabold tracking-[.15em] ${inverse ? 'text-[#fbf8f0]' : 'text-[#153247]'}`}>
          NEURO TOWER
        </span>
        <span className={`block text-[10px] tracking-[.18em] ${inverse ? 'text-[#bfd1d6]' : 'text-[#6b7b80]'}`}>
          MULTAN
        </span>
      </span>
    </span>
  );
}

function LegacyAppointmentModal({
  open,
  onClose,
  availability,
}: {
  open: boolean;
  onClose: () => void;
  availability?: {
    clinicName: string;
    phone: string;
    hours: { day: string; hours: string }[];
    visitTypes: { value: string; label: string; duration: string }[];
  };
}) {
  const queryClient = useQueryClient();
  const createAppointment = useCreateAppointment();
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<any>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: '',
      phone: '',
      email: '',
      visitType: '',
      preferredDate: '',
      preferredTime: '',
      message: '',
    },
  });
  const types = availability?.visitTypes?.length ? availability.visitTypes : fallbackVisitTypes;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      form.reset();
    }
  }, [form, open]);

  const onSubmit = (values: any) => {
    const payload: AppointmentInput = {
      clinicLocation: 'multan',
      city: 'Multan',
      patientName: values.patientName,
      phone: values.phone,
      email: values.email || null,
      appointmentType: (values.visitType || 'new-patient') as AppointmentInput['appointmentType'],
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
      attachmentName: null,
    };
    createAppointment.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setSubmitted(true);
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-[#153247]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-title"
      data-testid="dialog-appointment"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#fbf8f0] shadow-2xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce3df] bg-[#fbf8f0]/95 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">Patient access</p>
            <h2 id="appointment-title" className="display-face mt-1 text-2xl font-semibold text-[#153247]">
              Request an appointment
            </h2>
          </div>
          <button className="focus-ring rounded-full p-2 text-[#587078] transition hover:bg-[#e9efec] hover:text-[#153247]" onClick={onClose} aria-label="Close appointment form" data-testid="button-close-appointment">
            <X className="size-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-14 text-center sm:px-16">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#dcefe8] text-[#197263]">
              <Check className="size-8" strokeWidth={2.5} />
            </div>
            <p className="mono-face mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#a17525]">Request received</p>
            <h3 className="display-face mt-2 text-4xl font-semibold text-[#153247]">You are in good hands.</h3>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#587078]">
              Dr. Kharal&apos;s team will review your preferred time and call you at the number you provided to confirm the visit.
            </p>
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[#d4e3dd] bg-[#edf6f2] p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#197263]">What happens next</p>
              <p className="mt-2 text-sm leading-6 text-[#315b61]">Keep your phone nearby. Our coordinator will typically respond during clinic hours.</p>
            </div>
            <button onClick={onClose} className="focus-ring mt-8 rounded-full bg-[#153247] px-6 py-3 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64]" data-testid="button-finish-appointment">
              Return to Dr. Kharal&apos;s page
            </button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
              <div className="rounded-2xl border border-[#e6d6ae] bg-[#fff8df] px-4 py-3 text-sm leading-5 text-[#6d572c]">
                Share a little about your visit. This is a request, not a confirmed booking; our team will call to confirm the time.
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-patient-name">
                  Full name
                  <input {...form.register('patientName')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder="Your name" data-testid="input-patient-name" />
                  <FieldError message={form.formState.errors.patientName?.message} />
                </label>
                <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-patient-phone">
                  Phone number
                  <input {...form.register('phone')} type="tel" className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder="+92 3XX XXX XXXX" data-testid="input-patient-phone" />
                  <FieldError message={form.formState.errors.phone?.message} />
                </label>
              </div>
              <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-patient-email">
                Email <span className="font-normal text-[#91a0a2]">optional</span>
                <input {...form.register('email')} type="email" className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder="you@example.com" data-testid="input-patient-email" />
                <FieldError message={form.formState.errors.email?.message} />
              </label>
              <label className="relative block text-sm font-semibold text-[#31505b]" data-testid="label-visit-type">
                Reason for visit
                <select {...form.register('visitType')} className="focus-ring mt-2 w-full appearance-none rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition focus:border-[#197263]" data-testid="select-visit-type">
                  <option value="">Choose a consultation</option>
                  {types.map((type) => <option key={type.value} value={type.value}>{type.label} · {type.duration}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-[43px] size-4 text-[#6b7b80]" />
                <FieldError message={form.formState.errors.visitType?.message} />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-preferred-date">
                  Preferred date
                  <input {...form.register('preferredDate')} type="date" min={today} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition focus:border-[#197263]" data-testid="input-preferred-date" />
                  <FieldError message={form.formState.errors.preferredDate?.message} />
                </label>
                <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-preferred-time">
                  Preferred time
                  <select {...form.register('preferredTime')} className="focus-ring mt-2 w-full rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition focus:border-[#197263]" data-testid="select-preferred-time">
                    <option value="">Choose a time</option>
                    <option value="4:00 pm">4:00 pm</option>
                    <option value="5:00 pm">5:00 pm</option>
                    <option value="6:00 pm">6:00 pm</option>
                    <option value="7:00 pm">7:00 pm</option>
                    <option value="8:00 pm">8:00 pm</option>
                  </select>
                  <FieldError message={form.formState.errors.preferredTime?.message} />
                </label>
              </div>
              <label className="block text-sm font-semibold text-[#31505b]" data-testid="label-patient-message">
                Anything you want Dr. Kharal to know? <span className="font-normal text-[#91a0a2]">optional</span>
                <textarea {...form.register('message')} rows={3} className="focus-ring mt-2 w-full resize-none rounded-xl border border-[#cbd9d6] bg-[#fffdf8] px-3.5 py-3 text-sm font-normal text-[#153247] outline-none transition placeholder:text-[#91a0a2] focus:border-[#197263]" placeholder="A short note about your symptoms or previous reports" data-testid="textarea-patient-message" />
                <FieldError message={form.formState.errors.message?.message} />
              </label>
              {createAppointment.isError && <p className="rounded-xl bg-[#fbe9e6] px-4 py-3 text-sm font-medium text-[#a8443b]" role="alert" data-testid="status-appointment-error">We couldn&apos;t send that request. Please try again, or call the clinic directly.</p>}
              <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e0e7e3] pt-5 sm:flex-row sm:items-center">
                <p className="text-xs leading-5 text-[#718287]"><ShieldCheck className="mr-1 inline size-3.5 text-[#197263]" />Your details are only used to coordinate your care.</p>
                <button type="submit" disabled={createAppointment.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#153247] px-6 py-3.5 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64] disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-appointment">
                  {createAppointment.isPending ? 'Sending request…' : 'Send appointment request'} <ArrowUpRight className="size-4" />
                </button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}

function Home() {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (queryLanguage === 'ur') return 'ur';
    return window.localStorage.getItem('neurotower-language') === 'ur' ? 'ur' : 'en';
  });
  const text = copy[language];
  const availabilityQuery = useGetAppointmentAvailability({
    query: { queryKey: getGetAppointmentAvailabilityQueryKey(), staleTime: 300_000 },
  });
  const appointmentsQuery = useListAppointments({
    query: { queryKey: getListAppointmentsQueryKey(), staleTime: 30_000 },
  });
  const availability = availabilityQuery.data;
  const requestsInReview = appointmentsQuery.data?.length ?? 0;
  const clinics = availability?.clinics?.length ? availability.clinics : fallbackClinics;
  const clinicPhone = availability?.phone || '03377628073';
  const localizedReviews = reviews[language];

  useEffect(() => {
    window.localStorage.setItem('neurotower-language', language);
    document.documentElement.lang = language === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  const openAppointment = () => {
    setMobileOpen(false);
    setAppointmentOpen(true);
  };

  return (
    <main className={`grain min-h-[100dvh] overflow-hidden bg-[#f8f6ef] text-[#153247] ${language === 'ur' ? 'urdu-copy' : ''}`}>
      <header className="relative z-20 border-b border-[#dce3df] bg-[#f8f6ef]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <a href="#top" className="focus-ring rounded-lg" data-testid="link-brand-home"><BrandMark /></a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <a href="#approach" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-approach">{text.nav.approach}</a>
            <a href="#care" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-care">{text.nav.care}</a>
            <a href="#clinic" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-clinic">{text.nav.clinic}</a>
            <a href="#voices" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-reviews">{text.nav.reviews}</a>
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <button onClick={() => setLanguage((current) => current === 'en' ? 'ur' : 'en')} className="focus-ring rounded-full border border-[#b8cbc6] px-3 py-2 text-xs font-bold text-[#31505b] transition hover:border-[#197263] hover:text-[#197263]" aria-label={`Switch to ${text.switchLanguage}`} data-testid="button-language-toggle">{text.switchLanguage}</button>
            <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring flex items-center gap-2 text-sm font-bold text-[#197263]" data-testid="link-header-phone"><Phone className="size-4" /> {text.nav.call}</a>
            <button onClick={openAppointment} className="focus-ring rounded-full bg-[#153247] px-5 py-2.5 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64]" data-testid="button-header-appointment">{text.nav.visit}</button>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setLanguage((current) => current === 'en' ? 'ur' : 'en')} className="focus-ring rounded-full border border-[#b8cbc6] px-3 py-2 text-xs font-bold text-[#31505b]" aria-label={`Switch to ${text.switchLanguage}`} data-testid="button-language-toggle-mobile">{text.switchLanguage}</button>
            <button onClick={() => setMobileOpen((current) => !current)} className="focus-ring rounded-lg p-2 text-[#153247]" aria-label={text.nav.menu} data-testid="button-mobile-menu">
              {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#dce3df] px-5 py-4 md:hidden">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {[
                [text.nav.approach, '#approach'],
                [text.nav.care, '#care'],
                [text.nav.clinic, '#clinic'],
                [text.nav.reviews, '#voices'],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#31505b] hover:bg-[#eaf0ed]" data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>
              ))}
            </nav>
            <button onClick={openAppointment} className="mt-3 w-full rounded-full bg-[#153247] px-5 py-3 text-sm font-bold text-[#fbf8f0]" data-testid="button-mobile-appointment">{text.nav.visit}</button>
          </div>
        )}
      </header>

      <section id="top" className="hero-grid relative border-b border-[#dce3df]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div className="relative z-10 animate-soft-rise">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe0d9] bg-[#f6faf5] px-3 py-1.5 text-xs font-bold text-[#197263]" data-testid="status-clinic-open">
              <span className="size-1.5 rounded-full bg-[#2a9b79]" /> {text.hero.accepting}
            </div>
            <p className="mono-face text-[11px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.hero.eyebrow}</p>
            <h1 className="display-face mt-5 max-w-2xl text-[clamp(3.4rem,7vw,6.8rem)] font-semibold leading-[.91] text-[#153247]">
              {text.hero.title} <span className="text-[#197263]">{text.hero.titleAccent}</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#587078] sm:text-lg">
              {text.hero.intro}
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button onClick={openAppointment} className="focus-ring group inline-flex items-center gap-3 rounded-full bg-[#f2c55f] px-6 py-3.5 text-sm font-extrabold text-[#153247] transition hover:-translate-y-1 hover:bg-[#f6d27e]" data-testid="button-hero-appointment">
                {text.hero.request} <span className="grid size-6 place-items-center rounded-full bg-[#153247] text-[#f2c55f] transition group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span>
              </button>
              <a href="#approach" className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold text-[#31505b] transition hover:text-[#197263]" data-testid="link-hero-approach">{text.hero.approach} <ArrowUpRight className="size-4" /></a>
            </div>
            <div className="mt-12 flex items-center gap-8 border-t border-[#cddbd8] pt-6">
              <div><p className="display-face text-3xl font-semibold text-[#153247]">18<span className="text-[#197263]">+</span></p><p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-[#718287]">{text.hero.years}</p></div>
              <div className="h-10 w-px bg-[#cddbd8]" />
              <div><p className="display-face text-3xl font-semibold text-[#153247]">Brain<span className="text-[#197263]"> + </span>Spine</p><p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-[#718287]">{text.hero.expertise}</p></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] animate-soft-rise [animation-delay:140ms]">
            <div className="absolute -right-6 -top-8 size-36 rounded-full border border-[#e2be5e]/60 [animation:pulse-ring_4s_ease-in-out_infinite]" />
            <div className="relative overflow-hidden rounded-[32px] bg-[#153247] px-6 pb-6 pt-7 shadow-[0_30px_80px_-32px_rgba(21,50,71,.75)] sm:px-9 sm:pt-9">
              <div className="absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(circle_at_70%_20%,rgba(55,131,119,.5),transparent_52%)]" />
              <div className="relative flex items-start justify-between">
                <div>
                   <p className="mono-face text-[10px] font-bold uppercase tracking-[.2em] text-[#f2c55f]">{text.hero.consultant}</p>
                  <h2 className="display-face mt-3 text-4xl font-semibold leading-none text-[#fbf8f0] sm:text-5xl">Dr. Iqbal<br />Kharal</h2>
                   <p className="mt-4 max-w-[190px] text-sm leading-5 text-[#b7cbd0]">{text.hero.steady}</p>
                </div>
                <div className="rounded-full border border-[#bcd4d0]/30 px-3 py-1.5 text-[10px] font-bold text-[#bcd4d0]">MBBS · FCPS</div>
              </div>
              <div className="relative mt-9 flex h-[260px] items-end justify-center overflow-hidden rounded-[24px] bg-[#214b61] sm:h-[310px]">
                <div className="absolute inset-0 opacity-30 hero-grid" />
                <div className="absolute left-5 top-5 text-[#9ed1c6]"><Plus className="size-5" /></div>
                <div className="absolute right-6 top-10 text-[#f2c55f]"><Plus className="size-4" /></div>
                <svg viewBox="0 0 320 260" className="relative h-full w-full" aria-label="Abstract brain and spine illustration" role="img">
                  <path d="M171 50c-35-27-91-3-94 45-2 28 13 47 29 58 8 6 11 17 10 30l-1 25h66l-1-25c-1-13 2-23 10-30 18-15 30-34 27-59-3-26-20-40-46-44Z" fill="#7fb9af" opacity=".92" />
                  <path d="M163 54c-17 6-26 22-24 37 2 12-8 18-17 25-10 7-14 17-11 29M171 52c16 7 24 22 21 36-2 13 8 20 17 27 9 7 13 18 10 30M142 74c11 9 14 18 11 30M188 72c-11 10-13 20-10 30" fill="none" stroke="#d6efe8" strokeLinecap="round" strokeWidth="4" opacity=".7" />
                  <path d="M116 197c18 4 40 4 61 0l-2 28c-2 17-10 24-28 24s-26-7-28-24Z" fill="#f2c55f" opacity=".95" />
                  <path d="M148 201v43M136 203v35M160 203v35M128 201c-6 7-7 14-4 22M168 201c6 7 7 14 4 22" fill="none" stroke="#153247" strokeLinecap="round" strokeWidth="3" opacity=".55" />
                  <circle cx="78" cy="107" r="5" fill="#f2c55f" /><circle cx="242" cy="132" r="5" fill="#9ed1c6" />
                  <path d="M82 107h30M238 132h-28" stroke="#d6efe8" strokeDasharray="3 5" opacity=".65" />
                </svg>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-[#153247]/70 px-3 py-2 text-[10px] font-bold text-[#d6efe8] backdrop-blur">
                   <HeartPulse className="size-3.5 text-[#f2c55f]" /> {text.hero.wholePerson}
                </div>
              </div>
              <div className="relative mt-5 flex items-center justify-between text-xs">
                 <span className="text-[#9ab5ba]">Neuro Tower Multan</span>
                 <span className="flex items-center gap-1.5 font-bold text-[#f2c55f]"><MapPin className="size-3.5" /> {text.hero.bosan}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.approach.eyebrow}</p>
            <h2 className="display-face mt-5 max-w-md text-4xl font-semibold leading-[1.04] text-[#153247] sm:text-5xl">{text.approach.title}</h2>
          </div>
          <div>
            <p className="max-w-2xl text-xl leading-8 text-[#31505b]">{text.approach.intro}</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { icon: MessageCircle, title: text.approach.cards[0][0], text: text.approach.cards[0][1] },
                { icon: Brain, title: text.approach.cards[1][0], text: text.approach.cards[1][1] },
                { icon: ShieldCheck, title: text.approach.cards[2][0], text: text.approach.cards[2][1] },
              ].map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="border-t border-[#b8cbc6] pt-5" data-testid={`card-approach-${index}`}>
                  <Icon className="size-5 text-[#197263]" />
                  <h3 className="mt-5 text-base font-bold text-[#153247]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#718287]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="care" className="scroll-mt-20 bg-[#e7f0ec]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
               <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.care.eyebrow}</p>
               <h2 className="display-face mt-4 max-w-xl text-4xl font-semibold leading-none text-[#153247] sm:text-5xl">{text.care.title}</h2>
            </div>
             <p className="max-w-xs text-sm leading-6 text-[#587078]">{text.care.intro}</p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_.8fr_.8fr]">
            <div className="lift-card relative min-h-[330px] overflow-hidden rounded-[26px] bg-[#153247] p-7 sm:p-9" data-testid="card-care-brain">
              <Brain className="absolute -bottom-12 -right-10 size-64 stroke-[.45] text-[#70aaa1]/40" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f2c55f] text-[#153247]"><Brain className="size-6" /></div>
                <div>
                   <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#f2c55f]">{text.care.brainLabel}</p>
                   <h3 className="display-face mt-3 text-3xl font-semibold text-[#fbf8f0]">{text.care.brainTitle.split('|').map((line) => <span key={line} className="block">{line}</span>)}</h3>
                   <p className="mt-4 max-w-sm text-sm leading-6 text-[#b7cbd0]">{text.care.brainText}</p>
                </div>
              </div>
            </div>
            <div className="lift-card flex min-h-[330px] flex-col justify-between rounded-[26px] border border-[#cbdcd6] bg-[#f8f6ef] p-7 sm:p-8" data-testid="card-care-spine">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#cce4dc] text-[#197263]"><Stethoscope className="size-6" /></div>
              <div>
                 <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#197263]">{text.care.spineLabel}</p>
                 <h3 className="display-face mt-3 text-3xl font-semibold leading-tight text-[#153247]">{text.care.spineTitle.split('|').map((line) => <span key={line} className="block">{line}</span>)}</h3>
                 <p className="mt-4 text-sm leading-6 text-[#718287]">{text.care.spineText}</p>
              </div>
            </div>
            <div className="lift-card flex min-h-[330px] flex-col justify-between rounded-[26px] border border-[#cbdcd6] bg-[#f8f6ef] p-7 sm:p-8" data-testid="card-care-opinion">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f7e6b6] text-[#a17525]"><Compass className="size-6" /></div>
              <div>
                 <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#a17525]">{text.care.opinionLabel}</p>
                 <h3 className="display-face mt-3 text-3xl font-semibold leading-tight text-[#153247]">{text.care.opinionTitle.split('|').map((line) => <span key={line} className="block">{line}</span>)}</h3>
                 <p className="mt-4 text-sm leading-6 text-[#718287]">{text.care.opinionText}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="clinic" className="scroll-mt-20 border-b border-[#dce3df] bg-[#f8f6ef]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
             <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.clinic.eyebrow}</p>
             <h2 className="display-face mt-4 text-4xl font-semibold leading-none text-[#153247] sm:text-5xl">{text.clinic.title.split('|').map((line) => <span key={line} className="block">{line}</span>)}</h2>
             <p className="mt-6 max-w-sm text-sm leading-6 text-[#718287]">{text.clinic.intro}</p>
             <button onClick={openAppointment} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full border border-[#9fbab3] px-5 py-3 text-sm font-bold text-[#197263] transition hover:-translate-y-0.5 hover:border-[#197263] hover:bg-[#e7f0ec]" data-testid="button-clinic-appointment">{text.clinic.plan} <ArrowUpRight className="size-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
             {clinics.map((clinic) => {
               const details = clinicCopy[language][clinic.id as ClinicId];
               return (
              <div key={clinic.id} className="rounded-[24px] bg-[#e7f0ec] p-7 sm:col-span-2 sm:flex sm:items-start sm:justify-between" data-testid={`card-clinic-location-${clinic.id}`}>
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#153247] text-[#f2c55f]"><MapPin className="size-5" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.13em] text-[#197263]">{details.city} {text.clinic.clinic}</p>
                    <p className="mt-2 text-lg font-bold text-[#153247]">{clinic.name}</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-[#587078]">{details.address}</p>
                    <div className="mt-4 grid gap-1.5 text-xs text-[#315b61]">{details.schedule.map((item) => <p key={`${clinic.id}-${item.days}`}><span className="font-bold">{item.days}:</span> {item.hours}{item.note ? ` · ${item.note}` : ''}</p>)}</div>
                  </div>
                </div>
                <a href={clinic.mapsUrl} target="_blank" rel="noreferrer" className="focus-ring mt-5 inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#197263] sm:mt-1" data-testid={`link-clinic-directions-${clinic.id}`}>{text.clinic.directions} <ArrowUpRight className="size-4" /></a>
              </div>
               );
             })}
            <div className="rounded-[24px] border border-[#d6e1dd] bg-[#fbf8f0] p-7" data-testid="card-clinic-hours">
              <div className="flex items-center gap-3"><Clock3 className="size-5 text-[#197263]" /><p className="text-xs font-bold uppercase tracking-[.13em] text-[#197263]">{text.clinic.schedule}</p></div>
              <p className="mt-5 text-sm leading-6 text-[#718287]">{text.clinic.scheduleText}</p>
              <div className="mt-5 rounded-xl bg-[#e7f0ec] px-4 py-3 text-xs leading-5 text-[#315b61]">{text.clinic.online}</div>
              {availabilityQuery.isError && <p className="mt-4 text-xs text-[#a17525]" data-testid="status-hours-fallback">{text.clinic.fallback}</p>}
            </div>
            <div className="rounded-[24px] bg-[#153247] p-7 text-[#fbf8f0]" data-testid="card-clinic-contact">
              <div className="flex items-center gap-3"><Phone className="size-5 text-[#f2c55f]" /><p className="text-xs font-bold uppercase tracking-[.13em] text-[#f2c55f]">{text.clinic.team}</p></div>
              <p className="display-face mt-5 text-3xl font-semibold">{text.clinic.planTitle.split('|').map((line) => <span key={line} className="block">{line}</span>)}</p>
              <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#b7d8cf]" data-testid="link-clinic-phone">{clinicPhone} <ArrowUpRight className="size-4" /></a>
            </div>
          </div>
        </div>
      </section>

      <section id="voices" className="scroll-mt-20 bg-[#f1ead8]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
             <div><p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.reviews.eyebrow}</p><h2 className="display-face mt-4 text-4xl font-semibold text-[#153247] sm:text-5xl">{text.reviews.title}</h2></div>
             <div className="flex items-center gap-2 text-sm font-bold text-[#a17525]" data-testid="status-review-proof"><BadgeCheck className="size-5" /> {text.reviews.trust}</div>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
             {localizedReviews.map((review, index) => (
              <figure key={review.name} className="lift-card flex min-h-[260px] flex-col justify-between rounded-[24px] border border-[#e0d4b9] bg-[#fbf8f0] p-7" data-testid={`card-review-${index}`}>
                <div><div className="flex gap-1 text-[#d09b29]" aria-label="5 out of 5 stars">{[0, 1, 2, 3, 4].map((star) => <Sparkles key={star} className="size-3.5 fill-current" />)}</div><blockquote className="mt-6 text-lg font-medium leading-7 text-[#31505b]">“{review.quote}”</blockquote></div>
                <figcaption className="mt-7 border-t border-[#e6dbc3] pt-4"><p className="text-sm font-bold text-[#153247]">{review.name}</p><p className="mt-1 text-xs text-[#8b7d61]">{review.context}</p></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#153247]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 lg:flex-row lg:items-center lg:px-10 lg:py-20">
           <div><p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#f2c55f]">{text.footer.eyebrow}</p><h2 className="display-face mt-4 max-w-2xl text-4xl font-semibold leading-tight text-[#fbf8f0] sm:text-5xl">{text.footer.title}</h2></div>
           <button onClick={openAppointment} className="focus-ring group inline-flex shrink-0 items-center gap-3 rounded-full bg-[#f2c55f] px-6 py-3.5 text-sm font-extrabold text-[#153247] transition hover:-translate-y-1 hover:bg-[#f6d27e]" data-testid="button-footer-appointment">{text.hero.request} <span className="grid size-6 place-items-center rounded-full bg-[#153247] text-[#f2c55f] transition group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span></button>
        </div>
      </section>

      <footer className="bg-[#102a3c] text-[#b7cbd0]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1fr_auto_auto] lg:px-10">
           <div><BrandMark inverse /><p className="mt-5 max-w-xs text-sm leading-6 text-[#88a5ab]">{text.footer.brainSpine}</p></div>
           <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#f2c55f]">{text.footer.contact}</p><a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring mt-4 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-phone">{clinicPhone}</a><a href="mailto:care@neurotower.pk" className="focus-ring mt-2 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-email"><Mail className="mr-1.5 inline size-3.5" />care@neurotower.pk</a></div>
           <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#f2c55f]">{text.footer.navigate}</p><a href="#top" className="focus-ring mt-4 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-top">{text.footer.top}</a><p className="mt-2 text-sm text-[#88a5ab]" data-testid="text-review-queue">{appointmentsQuery.isError ? text.footer.helping : requestsInReview > 0 ? text.footer.request : text.footer.requests}</p></div>
        </div>
         <div className="border-t border-[#274658]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-[#6f9198] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>© {new Date().getFullYear()} Dr. Iqbal Kharal · Neuro Tower Multan</span><span>{text.footer.urgent}</span></div></div>
      </footer>

      <BookingModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} availability={availability} language={language} />
    </main>
  );
}

export default Home;