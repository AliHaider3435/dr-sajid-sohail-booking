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
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  House,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
  Play,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { AppointmentModal as BookingModal } from '@/components/appointment-modal';
import { clinicCopy, copy, type ClinicId, type Language } from '@/lib/i18n';
import {
  getClinicTimingConfig,
  getClinicScheduleSummary,
  formatTime24to12,
  type ClinicTimingConfig,
} from '@/lib/clinic-timing-service';
import { getPatientStories, type PatientStory } from '@/lib/patient-stories-service';

const appointmentSchema = z.object({
  clinicLocation: z.enum(['layyah'], {
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
  { value: 'new-patient', label: 'New patient', description: 'Your first consultation with Dr. Sajid Sohail.' },
  { value: 'follow-up', label: 'Follow-up patient', description: 'A review after a previous consultation or procedure.' },
  { value: 'emergency-consultation', label: 'Emergency consultation', description: 'For urgent concerns; call the emergency number for immediate help.' },
];

const fallbackVisitTypes = fallbackAppointmentTypes.map((type) => ({
  ...type,
  duration: '30 min',
}));

const fallbackClinics = [
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
const clinicDirectionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=30.9723221%2C70.9651555';

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
    { quote: 'Dr. Sajid Sohail explained my condition in a way our whole family could understand. The calmness in the room changed everything.', name: 'Ayesha M.', context: 'Patient family · Layyah' },
    { quote: 'I came in frightened about my back pain and left with a clear plan. I never felt rushed or talked over.', name: 'Muhammad R.', context: 'Spine consultation · Layyah' },
    { quote: 'The follow-up was just as thoughtful as the first appointment. It felt like care, not a transaction.', name: 'Sana A.', context: 'Follow-up patient · South Punjab' },
  ],
  ur: [
    { quote: 'ڈاکٹر ساجد سہیل نے ہماری پوری فیملی کو میری بیماری اس طرح سمجھائی کہ سب آسانی سے سمجھ گئے۔ ان کے اطمینان نے سب کچھ بدل دیا۔', name: 'عائشہ م.', context: 'مریض کے خاندان سے · لیہ' },
    { quote: 'کمر کے درد کی وجہ سے خوف زدہ آیا تھا، مگر واضح منصوبے کے ساتھ واپس گیا۔ مجھے جلدی میں محسوس نہیں کرایا گیا۔', name: 'محمد ر.', context: 'ریڑھ کی ہڈی کا مشورہ · لیہ' },
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
        <span className="text-lg font-extrabold leading-none">SS</span>
      </span>
      <span className="leading-tight">
        <span className={`block text-[9px] font-extrabold tracking-[.08em] sm:text-[13px] sm:tracking-[.15em] ${inverse ? 'text-[#fbf8f0]' : 'text-[#153247]'}`}>
          RAHMANIA MEDICAL CENTER
        </span>
        <span className={`block text-[10px] tracking-[.18em] ${inverse ? 'text-[#bfd1d6]' : 'text-[#6b7b80]'}`}>
          LAYYAH
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
      clinicLocation: 'layyah',
      city: 'Layyah',
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
              Dr. Sajid Sohail&apos;s team will review your preferred time and call you at the number you provided to confirm the visit.
            </p>
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[#d4e3dd] bg-[#edf6f2] p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#197263]">What happens next</p>
              <p className="mt-2 text-sm leading-6 text-[#315b61]">Keep your phone nearby. Our coordinator will typically respond during clinic hours.</p>
            </div>
            <button onClick={onClose} className="focus-ring mt-8 rounded-full bg-[#153247] px-6 py-3 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64]" data-testid="button-finish-appointment">
              Return to Dr. Sajid Sohail&apos;s page
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
                Anything you want Dr. Sajid Sohail to know? <span className="font-normal text-[#91a0a2]">optional</span>
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
  const [timingConfig, setTimingConfig] = useState<ClinicTimingConfig>(getClinicTimingConfig());
  const [patientStories, setPatientStories] = useState<PatientStory[]>(getPatientStories(true));
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  const availabilityQuery = useGetAppointmentAvailability({
    query: { queryKey: getGetAppointmentAvailabilityQueryKey(), staleTime: 300_000 },
  });
  const appointmentsQuery = useListAppointments({
    query: { queryKey: getListAppointmentsQueryKey(), staleTime: 30_000 },
  });
  const availability = availabilityQuery.data;
  const requestsInReview = appointmentsQuery.data?.length ?? 0;
  const availableClinics = availability?.clinics?.filter((clinic) => clinic.id === 'layyah') ?? [];
  const clinics = availableClinics.length ? availableClinics : fallbackClinics;
  const clinicPhone = timingConfig.phone || '0300 5809938';
  const scheduleSummary = getClinicScheduleSummary(timingConfig);

  useEffect(() => {
    const handleTimingUpdate = (e: any) => {
      if (e.detail) setTimingConfig(e.detail);
    };
    const handleStoriesUpdate = (e: any) => {
      if (e.detail) setPatientStories(e.detail.filter((s: PatientStory) => s.isPublished));
    };
    window.addEventListener('clinic_timing_updated', handleTimingUpdate);
    window.addEventListener('patient_stories_updated', handleStoriesUpdate);
    return () => {
      window.removeEventListener('clinic_timing_updated', handleTimingUpdate);
      window.removeEventListener('patient_stories_updated', handleStoriesUpdate);
    };
  }, []);

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
    <main className={`doctor-now-layout grain min-h-[100dvh] overflow-hidden bg-white pb-16 text-[#153247] md:pb-0 ${language === 'ur' ? 'urdu-copy' : ''}`}>
      <div className="border-b border-[#e5e9f2] bg-[#f0f1f4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-[11px] font-semibold text-[#526479] lg:px-10">
          <span>{timingConfig.clinicName}</span>
          <span className="hidden sm:inline">
            {scheduleSummary.fullSchedule} ({timingConfig.appointmentsPerHour} slots/hr)
          </span>
          <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="text-[#158b8b] hover:text-[#116e70] font-bold">{clinicPhone}</a>
        </div>
      </div>
      <header className="doctor-now-header sticky top-0 z-20 border-b border-[#e5e9f2] bg-white/95 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-14 max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <button onClick={() => setMobileOpen((current) => !current)} className="focus-ring absolute left-5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#173b60] md:hidden" aria-label={text.nav.menu} data-testid="button-mobile-menu">
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          <a href="#top" className="focus-ring absolute left-1/2 -translate-x-1/2 rounded-lg md:static md:translate-x-0" data-testid="link-brand-home"><BrandMark /></a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <a href="#approach" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-approach">{text.nav.approach}</a>
            <a href="#how-it-works" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-how-it-works">{text.nav.howItWorks}</a>
            <a href="#care" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-care">{text.nav.care}</a>
            <a href="#clinic" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-clinic">{text.nav.clinic}</a>
            <a href="#voices" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-reviews">{text.nav.reviews}</a>
            <a href="#faq" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-faq">{text.nav.faq}</a>
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <button onClick={() => setLanguage((current) => current === 'en' ? 'ur' : 'en')} className="focus-ring rounded-full border border-[#b8cbc6] px-3 py-2 text-xs font-bold text-[#31505b] transition hover:border-[#197263] hover:text-[#197263]" aria-label={`Switch to ${text.switchLanguage}`} data-testid="button-language-toggle">{text.switchLanguage}</button>
            <a href={`tel:${clinicPhone.replace(/[^\d+]/g, '')}`} className="focus-ring flex items-center gap-2 text-sm font-bold text-[#197263]" data-testid="link-header-phone"><Phone className="size-4" /> {text.nav.call}</a>
            <button onClick={openAppointment} className="focus-ring rounded-full bg-[#153247] px-5 py-2.5 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64]" data-testid="button-header-appointment">{text.nav.visit}</button>
          </div>
          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-2 md:static md:translate-y-0">
            <button onClick={openAppointment} className="focus-ring rounded-full bg-[#173b60] px-3 py-2 text-[10px] font-bold text-white md:hidden" data-testid="button-mobile-header-appointment">{text.nav.book}</button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#dce3df] px-5 py-4 md:hidden">
            <button onClick={() => setLanguage((current) => current === 'en' ? 'ur' : 'en')} className="mb-2 rounded-xl px-3 py-3 text-sm font-bold text-[#148b8b]" aria-label={`Switch to ${text.switchLanguage}`} data-testid="button-language-toggle-mobile">{text.switchLanguage}</button>
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {[
                [text.nav.approach, '#approach'],
                [text.nav.howItWorks, '#how-it-works'],
                [text.nav.care, '#care'],
                [text.nav.clinic, '#clinic'],
                [text.nav.reviews, '#voices'],
                [text.nav.faq, '#faq'],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#31505b] hover:bg-[#eaf0ed]" data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>
              ))}
            </nav>
            <button onClick={openAppointment} className="mt-3 w-full rounded-full bg-[#153247] px-5 py-3 text-sm font-bold text-[#fbf8f0]" data-testid="button-mobile-appointment">{text.nav.visit}</button>
          </div>
        )}
      </header>

      <section id="top" className="doctor-now-hero relative border-b border-[#e0e5f0] bg-[#eef1fb]">
        <div className="mx-auto grid min-h-[520px] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-12">
          <div className="relative z-10 order-1 animate-soft-rise lg:order-2">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe0d9] bg-[#f6faf5] px-3 py-1.5 text-xs font-bold text-[#197263]" data-testid="status-clinic-open">
              <span className="size-1.5 rounded-full bg-[#2a9b79]" /> {text.hero.accepting}
            </div>
            <p className="mono-face text-[11px] font-bold uppercase tracking-[.23em] text-[#148b8b]">{text.hero.eyebrow}</p>
            <h1 className="display-face mt-5 max-w-2xl text-[clamp(3.1rem,6vw,5rem)] font-semibold leading-[.99] text-[#173b60]">
              {text.hero.title} <span className="text-[#197263]">{text.hero.titleAccent}</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#587078] sm:text-lg">
              {text.hero.intro}
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button onClick={openAppointment} className="focus-ring group inline-flex min-w-56 items-center justify-center gap-3 rounded-full bg-[#173b60] px-7 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_12px_30px_-15px_rgba(23,59,96,.75)] transition hover:-translate-y-1 hover:bg-[#214d70]" data-testid="button-hero-appointment">
                {text.hero.request} <span className="grid size-6 place-items-center rounded-full bg-white/15 text-white transition group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span>
              </button>
              <a href="#approach" className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold text-[#31505b] transition hover:text-[#197263]" data-testid="link-hero-approach">{text.hero.approach} <ArrowUpRight className="size-4" /></a>
            </div>
          </div>

          <div className="relative order-2 mx-auto w-full max-w-[560px] animate-soft-rise lg:order-1 [animation-delay:140ms]">
            <img
              src="/dr-sajid-sohail.jpg"
              alt="Dr. Sajid Sohail"
              className="aspect-square w-full max-w-[440px] rounded-[30%_8%_30%_8%] border border-white/80 bg-[#dfe9f6] object-cover shadow-[0_24px_70px_-40px_rgba(23,59,96,.4)]"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-[#e6e9ef] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 px-5 py-7 sm:gap-6 lg:px-10">
          {text.impact.metrics.map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="display-face text-2xl font-semibold text-[#173b60] sm:text-3xl">{value}</p>
              <p className="mt-1 text-[10px] font-semibold text-[#748397] sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-[#e6e9ef] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#148b8b]">{text.help.eyebrow}</p>
              <h2 className="display-face mt-3 text-3xl font-semibold text-[#173b60] sm:text-4xl">{text.help.title}</h2>
            </div>
            <div className="hidden gap-3 text-2xl text-[#173b60] sm:flex" aria-hidden="true"><span>‹</span><span>›</span></div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {text.help.cards.map((label, index) => (
              <a key={label} href="#care" className="group text-center" data-testid={`link-quick-care-${index}`}>
              <img
                src={['/brain-care.svg', '/spine-care.svg', '/medical-opinion.svg'][index]}
                alt={['Illustration of brain care', 'Illustration of spine care', 'Illustration of a medical second opinion'][index]}
                loading="lazy"
                className="aspect-[1.35] w-full rounded-2xl object-cover transition group-hover:brightness-[.98]"
              />
              <span className="mt-4 block text-base font-semibold text-[#173b60]">{label}</span>
            </a>
            ))}
          </div>
        </div>
      </section>

      <section id="approach" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:px-10 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <img
            src="/doctor-consultation.svg"
            alt="Illustration of a doctor consulting with a patient"
            loading="lazy"
            className="aspect-[1.35] w-full rounded-[30px] object-cover"
          />
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#148b8b]">{text.approach.eyebrow}</p>
            <h2 className="display-face mt-4 max-w-md text-4xl font-semibold leading-[1.04] text-[#173b60] sm:text-5xl">{text.approach.title}</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#687d91]">{text.approach.intro}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: MessageCircle, title: text.approach.cards[0][0], text: text.approach.cards[0][1] },
                { icon: Brain, title: text.approach.cards[1][0], text: text.approach.cards[1][1] },
                { icon: ShieldCheck, title: text.approach.cards[2][0], text: text.approach.cards[2][1] },
              ].map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="border-t border-[#dce3ed] pt-4" data-testid={`card-approach-${index}`}>
                  <Icon className="size-5 text-[#148b8b]" />
                  <h3 className="mt-3 text-sm font-bold text-[#173b60]">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#748397]">{text}</p>
                </div>
              ))}
            </div>
            <button onClick={openAppointment} className="focus-ring mt-7 inline-flex items-center gap-3 rounded-full bg-[#173b60] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#214d70]" data-testid="button-approach-appointment">
              {text.hero.request}<ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#f7f8fc]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-24">
          <img
            src="/appointment-calendar.svg"
            alt="Illustration of a clinic appointment calendar"
            loading="lazy"
            className="mx-auto aspect-[.68] w-full max-w-[300px] object-contain"
          />
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#148b8b]">{text.steps.eyebrow}</p>
            <h2 className="display-face mt-4 max-w-xl text-4xl font-semibold leading-tight text-[#173b60] sm:text-5xl">{text.steps.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#687d91]">{text.steps.intro}</p>
            <div className="mt-8 grid gap-5">
              {text.steps.cards.map(([title, description], index) => {
                return (
                  <div key={title} className="flex gap-4 border-b border-[#e2e7ef] py-4" data-testid={`card-booking-step-${index + 1}`}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eef1fb] text-sm font-bold text-[#173b60]">{index + 1}</span>
                    <div><p className="text-sm font-bold text-[#173b60]">{title}</p><p className="mt-1 text-sm leading-6 text-[#748397]">{description}</p></div>
                  </div>
                );
              })}
            </div>
            <button onClick={openAppointment} className="focus-ring mt-7 inline-flex items-center gap-3 rounded-full bg-[#173b60] px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#214d70]" data-testid="button-how-it-works-appointment">
              {text.steps.cta}<ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section id="care" className="scroll-mt-20 bg-white">
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

      <section id="clinic" className="scroll-mt-20 border-b border-[#e6e9ef] bg-[#f7f8fc]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
             <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.clinic.eyebrow}</p>
             <h2 className="display-face mt-4 text-4xl font-semibold leading-none text-[#153247] sm:text-5xl">{text.clinic.title.split('|').map((line) => <span key={line} className="block">{line}</span>)}</h2>
             <p className="mt-6 max-w-sm text-sm leading-6 text-[#718287]">{text.clinic.intro}</p>
             <button onClick={openAppointment} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full border border-[#9fbab3] px-5 py-3 text-sm font-bold text-[#197263] transition hover:-translate-y-0.5 hover:border-[#197263] hover:bg-[#e7f0ec]" data-testid="button-clinic-appointment">{text.clinic.plan} <ArrowUpRight className="size-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
             {clinics.map((clinic) => {
               const details = clinicCopy[language][clinic.id as ClinicId] ?? {
                 city: clinic.city,
                 address: clinic.address,
                 schedule: clinic.schedule,
               };
               return (
              <div key={clinic.id} className="rounded-[24px] bg-[#e7f0ec] p-7 sm:col-span-2 sm:flex sm:items-start sm:justify-between" data-testid={`card-clinic-location-${clinic.id}`}>
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#153247] text-[#f2c55f]"><MapPin className="size-5" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.13em] text-[#197263]">{details.city} {text.clinic.clinic}</p>
                    <p className="mt-2 text-lg font-bold text-[#153247]">Rahmania Medical Center, Layyah</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-[#587078]">{details.address}</p>
                    <div className="mt-4 grid gap-1.5 text-xs text-[#315b61]">
                      <p><span className="font-bold">Mon – Sat:</span> {formatTime24to12(timingConfig.monToSat.startTime)} – {formatTime24to12(timingConfig.monToSat.endTime)}</p>
                      <p><span className="font-bold">Sunday:</span> {formatTime24to12(timingConfig.sunday.startTime)} – {formatTime24to12(timingConfig.sunday.endTime)}</p>
                      <p className="text-[11px] font-semibold text-[#197263]">Capacity: {timingConfig.appointmentsPerHour} patient consultations / hour</p>
                      {timingConfig.customNotice && (
                        <p className="mt-1 text-[11px] font-bold text-[#a17525]">{timingConfig.customNotice}</p>
                      )}
                    </div>
                  </div>
                </div>
                <a href={clinicDirectionsUrl} target="_blank" rel="noreferrer" className="focus-ring mt-5 inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#197263] sm:mt-1" data-testid={`link-clinic-directions-${clinic.id}`}>{text.clinic.directions} <ArrowUpRight className="size-4" /></a>
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

      {/* Dynamic Patient Stories Section */}
      <section id="voices" className="scroll-mt-20 bg-[#f7f8fc]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
             <div>
               <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">Patient Stories & Recovery</p>
               <h2 className="display-face mt-4 text-4xl font-semibold text-[#153247] sm:text-5xl">Real Patient Experiences</h2>
             </div>
             <div className="flex items-center gap-2 text-sm font-bold text-[#a17525]" data-testid="status-review-proof">
               <BadgeCheck className="size-5" /> Verified Consultations & Surgeries
             </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {patientStories.map((story, index) => (
              <figure key={story.id || index} className="lift-card flex min-h-[300px] flex-col justify-between rounded-[24px] border border-[#e0d4b9] bg-[#fbf8f0] p-6 shadow-sm">
                <div>
                  {/* Media Header (Picture or Video badge) */}
                  {story.imageUrl && (
                    <div className="relative mb-4 overflow-hidden rounded-2xl border border-[#d8cfbe] bg-[#eef3f1]">
                      <img
                        src={story.imageUrl}
                        alt={story.patientName}
                        className="h-44 w-full object-cover transition duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {story.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setVideoModalUrl(story.videoUrl || null)}
                          className="absolute inset-0 flex items-center justify-center bg-black/35 text-white transition hover:bg-black/50"
                        >
                          <div className="grid size-12 place-items-center rounded-full bg-[#197263] text-white shadow-lg">
                            <Play className="ml-0.5 size-5 fill-current" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {!story.imageUrl && story.videoUrl && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setVideoModalUrl(story.videoUrl || null)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#b8d4cb] bg-[#e7f3ef] py-6 text-sm font-bold text-[#197263] transition hover:bg-[#d8ece5]"
                      >
                        <Play className="size-5 fill-current" /> Watch Video Story
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[#d09b29]" aria-label="5 out of 5 stars">
                    {Array.from({ length: story.rating || 5 }).map((_, star) => (
                      <Star key={star} className="size-3.5 fill-current" />
                    ))}
                  </div>

                  <blockquote className="mt-4 text-base font-medium leading-relaxed text-[#31505b]">
                    “{story.message}”
                  </blockquote>
                </div>

                <figcaption className="mt-6 border-t border-[#e6dbc3] pt-4">
                  <p className="text-sm font-bold text-[#153247]">{story.patientName}</p>
                  <p className="text-xs font-semibold text-[#197263]">{story.treatment}</p>
                  <p className="mt-0.5 text-[11px] text-[#8b7d61]">{story.context}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal Player */}
      {videoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-black shadow-2xl">
            <button
              onClick={() => setVideoModalUrl(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="size-5" />
            </button>
            <div className="aspect-video w-full">
              {videoModalUrl.includes('youtube.com') || videoModalUrl.includes('youtu.be') ? (
                <iframe
                  src={
                    videoModalUrl.includes('watch?v=')
                      ? videoModalUrl.replace('watch?v=', 'embed/')
                      : videoModalUrl.includes('youtu.be/')
                      ? videoModalUrl.replace('youtu.be/', 'www.youtube.com/embed/')
                      : videoModalUrl
                  }
                  title="Patient Story Video"
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={videoModalUrl} controls autoPlay className="size-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      <section id="faq" className="scroll-mt-20 bg-[#fbf8f0]">
        <div className="mx-auto max-w-4xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="mb-8 text-center">
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">{text.faq.eyebrow}</p>
            <h2 className="display-face mt-4 text-4xl font-semibold text-[#153247] sm:text-5xl">{text.faq.title}</h2>
          </div>
          <div className="divide-y divide-[#dce3df] border-y border-[#dce3df]">
            {text.faq.items.map(([question, answer], index) => (
              <details key={question} className="group py-5" data-testid={`faq-item-${index}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-bold text-[#153247] marker:hidden sm:text-base">
                  {question}<ChevronDown className="size-4 shrink-0 text-[#197263] transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-3xl pr-8 text-sm leading-6 text-[#718287]">{answer}</p>
              </details>
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
           <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#f2c55f]">{text.footer.navigate}</p><a href="#top" className="focus-ring mt-4 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-top">{text.footer.top}</a><p className="mt-2 text-sm text-[#88a5ab]" data-testid="text-review-queue">{appointmentsQuery.isError ? text.footer.helping : requestsInReview > 0 ? text.footer.request : text.footer.requests}</p><a href="/admin" className="focus-ring mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#f2c55f] hover:underline" data-testid="link-admin-login">🔐 Admin Portal Login →</a></div>
        </div>
         <div className="border-t border-[#274658]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-[#6f9198] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>© {new Date().getFullYear()} Dr. Sajid Sohail · Rahmania Medical Center, Layyah</span><span>{text.footer.urgent}</span></div></div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e2e7ef] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-18px_rgba(23,59,96,.45)] backdrop-blur md:hidden" aria-label="Quick navigation">
        <a href="#top" className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#526a7c]"><House className="size-5" />{text.nav.home}</a>
        <a href="#care" className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#526a7c]"><Stethoscope className="size-5" />{text.nav.care}</a>
        <a href="#clinic" className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#526a7c]"><MapPin className="size-5" />{text.nav.clinic}</a>
        <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#526a7c]"><Phone className="size-5" />{text.nav.call}</a>
        <button onClick={openAppointment} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-[#148b8b]"><CalendarDays className="size-5" />{text.nav.book}</button>
      </nav>

      <BookingModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} availability={availability} language={language} />
    </main>
  );
}

export default Home;