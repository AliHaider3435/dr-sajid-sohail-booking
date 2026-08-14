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

const appointmentSchema = z.object({
  patientName: z.string().min(2, 'Please enter your full name.'),
  phone: z.string().min(7, 'Please enter a reachable phone number.'),
  email: z.string().email('Please enter a valid email.').or(z.literal('')),
  visitType: z.string().min(1, 'Please choose a reason for your visit.'),
  preferredDate: z.string().min(1, 'Please select a preferred date.'),
  preferredTime: z.string().min(1, 'Please select a preferred time.'),
  message: z.string().max(500, 'Please keep this note under 500 characters.'),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const fallbackVisitTypes = [
  { value: 'new-consultation', label: 'New consultation', duration: '30 min' },
  { value: 'follow-up', label: 'Follow-up appointment', duration: '20 min' },
  { value: 'second-opinion', label: 'Second opinion', duration: '30 min' },
  { value: 'spine-consultation', label: 'Spine consultation', duration: '30 min' },
];

const fallbackHours = [
  { day: 'Monday', hours: '4:00 pm – 8:00 pm' },
  { day: 'Tuesday', hours: '4:00 pm – 8:00 pm' },
  { day: 'Wednesday', hours: '4:00 pm – 8:00 pm' },
  { day: 'Thursday', hours: '4:00 pm – 8:00 pm' },
  { day: 'Friday', hours: '4:00 pm – 8:00 pm' },
  { day: 'Saturday', hours: 'By appointment' },
];

const reviews = [
  {
    quote:
      'Dr. Kharal explained my condition in a way our whole family could understand. The calmness in the room changed everything.',
    name: 'Ayesha M.',
    context: 'Patient family · Multan',
  },
  {
    quote:
      'I came in frightened about my back pain and left with a clear plan. I never felt rushed or talked over.',
    name: 'Muhammad R.',
    context: 'Spine consultation · Multan',
  },
  {
    quote:
      'The follow-up was just as thoughtful as the first appointment. It felt like care, not a transaction.',
    name: 'Sana A.',
    context: 'Follow-up patient · South Punjab',
  },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
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

function AppointmentModal({
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
  const form = useForm<AppointmentFormValues>({
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

  const onSubmit = (values: AppointmentFormValues) => {
    const payload: AppointmentInput = {
      patientName: values.patientName,
      phone: values.phone,
      email: values.email || null,
      visitType: values.visitType as AppointmentInput['visitType'],
      preferredDate: values.preferredDate,
      preferredTime: values.preferredTime,
      message: values.message || null,
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
  const availabilityQuery = useGetAppointmentAvailability({
    query: { queryKey: getGetAppointmentAvailabilityQueryKey(), staleTime: 300_000 },
  });
  const appointmentsQuery = useListAppointments({
    query: { queryKey: getListAppointmentsQueryKey(), staleTime: 30_000 },
  });
  const availability = availabilityQuery.data;
  const requestsInReview = appointmentsQuery.data?.length ?? 0;
  const hours = availability?.hours?.length ? availability.hours : fallbackHours;
  const clinicName = availability?.clinicName || 'Neuro Tower Multan';
  const clinicPhone = availability?.phone || '+92 61 457 2030';

  const openAppointment = () => {
    setMobileOpen(false);
    setAppointmentOpen(true);
  };

  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#f8f6ef] text-[#153247]">
      <header className="relative z-20 border-b border-[#dce3df] bg-[#f8f6ef]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <a href="#top" className="focus-ring rounded-lg" data-testid="link-brand-home"><BrandMark /></a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <a href="#approach" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-approach">My approach</a>
            <a href="#care" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-care">Areas of care</a>
            <a href="#clinic" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-clinic">The clinic</a>
            <a href="#voices" className="focus-ring text-sm font-semibold text-[#587078] transition hover:text-[#153247]" data-testid="link-reviews">Patient voices</a>
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring flex items-center gap-2 text-sm font-bold text-[#197263]" data-testid="link-header-phone"><Phone className="size-4" /> Call clinic</a>
            <button onClick={openAppointment} className="focus-ring rounded-full bg-[#153247] px-5 py-2.5 text-sm font-bold text-[#fbf8f0] transition hover:-translate-y-0.5 hover:bg-[#214c64]" data-testid="button-header-appointment">Request a visit</button>
          </div>
          <button onClick={() => setMobileOpen((current) => !current)} className="focus-ring rounded-lg p-2 text-[#153247] md:hidden" aria-label="Toggle navigation" data-testid="button-mobile-menu">
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#dce3df] px-5 py-4 md:hidden">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {[
                ['My approach', '#approach'],
                ['Areas of care', '#care'],
                ['The clinic', '#clinic'],
                ['Patient voices', '#voices'],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#31505b] hover:bg-[#eaf0ed]" data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>
              ))}
            </nav>
            <button onClick={openAppointment} className="mt-3 w-full rounded-full bg-[#153247] px-5 py-3 text-sm font-bold text-[#fbf8f0]" data-testid="button-mobile-appointment">Request a visit</button>
          </div>
        )}
      </header>

      <section id="top" className="hero-grid relative border-b border-[#dce3df]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div className="relative z-10 animate-soft-rise">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe0d9] bg-[#f6faf5] px-3 py-1.5 text-xs font-bold text-[#197263]" data-testid="status-clinic-open">
              <span className="size-1.5 rounded-full bg-[#2a9b79]" /> Accepting appointment requests
            </div>
            <p className="mono-face text-[11px] font-bold uppercase tracking-[.23em] text-[#a17525]">Neurosurgery · Multan, Pakistan</p>
            <h1 className="display-face mt-5 max-w-2xl text-[clamp(3.4rem,7vw,6.8rem)] font-semibold leading-[.91] text-[#153247]">
              Clarity for the <span className="text-[#197263]">next step.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#587078] sm:text-lg">
              Specialist brain and spine care with time to listen, explain, and make a plan you can trust. Dr. Iqbal Kharal brings precision and humanity to every consultation.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button onClick={openAppointment} className="focus-ring group inline-flex items-center gap-3 rounded-full bg-[#f2c55f] px-6 py-3.5 text-sm font-extrabold text-[#153247] transition hover:-translate-y-1 hover:bg-[#f6d27e]" data-testid="button-hero-appointment">
                Request an appointment <span className="grid size-6 place-items-center rounded-full bg-[#153247] text-[#f2c55f] transition group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span>
              </button>
              <a href="#approach" className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm font-bold text-[#31505b] transition hover:text-[#197263]" data-testid="link-hero-approach">Get to know my approach <ArrowUpRight className="size-4" /></a>
            </div>
            <div className="mt-12 flex items-center gap-8 border-t border-[#cddbd8] pt-6">
              <div><p className="display-face text-3xl font-semibold text-[#153247]">18<span className="text-[#197263]">+</span></p><p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-[#718287]">Years in practice</p></div>
              <div className="h-10 w-px bg-[#cddbd8]" />
              <div><p className="display-face text-3xl font-semibold text-[#153247]">Brain<span className="text-[#197263]"> + </span>Spine</p><p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-[#718287]">Focused expertise</p></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] animate-soft-rise [animation-delay:140ms]">
            <div className="absolute -right-6 -top-8 size-36 rounded-full border border-[#e2be5e]/60 [animation:pulse-ring_4s_ease-in-out_infinite]" />
            <div className="relative overflow-hidden rounded-[32px] bg-[#153247] px-6 pb-6 pt-7 shadow-[0_30px_80px_-32px_rgba(21,50,71,.75)] sm:px-9 sm:pt-9">
              <div className="absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(circle_at_70%_20%,rgba(55,131,119,.5),transparent_52%)]" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="mono-face text-[10px] font-bold uppercase tracking-[.2em] text-[#f2c55f]">Consultant neurosurgeon</p>
                  <h2 className="display-face mt-3 text-4xl font-semibold leading-none text-[#fbf8f0] sm:text-5xl">Dr. Iqbal<br />Kharal</h2>
                  <p className="mt-4 max-w-[190px] text-sm leading-5 text-[#b7cbd0]">A steady hand for complex decisions and new beginnings.</p>
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
                  <HeartPulse className="size-3.5 text-[#f2c55f]" /> Care that sees the whole person
                </div>
              </div>
              <div className="relative mt-5 flex items-center justify-between text-xs">
                <span className="text-[#9ab5ba]">Neuro Tower Multan</span>
                <span className="flex items-center gap-1.5 font-bold text-[#f2c55f]"><MapPin className="size-3.5" /> Bosan Road</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">A different kind of consultation</p>
            <h2 className="display-face mt-5 max-w-md text-4xl font-semibold leading-[1.04] text-[#153247] sm:text-5xl">You deserve to understand your care.</h2>
          </div>
          <div>
            <p className="max-w-2xl text-xl leading-8 text-[#31505b]">A diagnosis can bring a lot of noise. My job is to make the path forward feel clear, considered, and right for you.</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { icon: MessageCircle, title: 'Listen first', text: 'Your story and concerns shape the conversation.' },
                { icon: Brain, title: 'Explain clearly', text: 'No jargon without context. No rushed decisions.' },
                { icon: ShieldCheck, title: 'Plan together', text: 'Options, trade-offs, and next steps in plain language.' },
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
              <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">Areas of care</p>
              <h2 className="display-face mt-4 max-w-xl text-4xl font-semibold leading-none text-[#153247] sm:text-5xl">Expertise for the moments that matter.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[#587078]">Every case begins with a careful assessment, not a pre-set answer.</p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_.8fr_.8fr]">
            <div className="lift-card relative min-h-[330px] overflow-hidden rounded-[26px] bg-[#153247] p-7 sm:p-9" data-testid="card-care-brain">
              <Brain className="absolute -bottom-12 -right-10 size-64 stroke-[.45] text-[#70aaa1]/40" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f2c55f] text-[#153247]"><Brain className="size-6" /></div>
                <div>
                  <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#f2c55f]">01 · Brain care</p>
                  <h3 className="display-face mt-3 text-3xl font-semibold text-[#fbf8f0]">A sharper view<br />of what&apos;s ahead.</h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-[#b7cbd0]">Assessment and surgical guidance for conditions affecting the brain and nervous system.</p>
                </div>
              </div>
            </div>
            <div className="lift-card flex min-h-[330px] flex-col justify-between rounded-[26px] border border-[#cbdcd6] bg-[#f8f6ef] p-7 sm:p-8" data-testid="card-care-spine">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#cce4dc] text-[#197263]"><Stethoscope className="size-6" /></div>
              <div>
                <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#197263]">02 · Spine care</p>
                <h3 className="display-face mt-3 text-3xl font-semibold leading-tight text-[#153247]">Move with<br />more confidence.</h3>
                <p className="mt-4 text-sm leading-6 text-[#718287]">Thoughtful evaluation for back, neck, nerve, and spinal conditions.</p>
              </div>
            </div>
            <div className="lift-card flex min-h-[330px] flex-col justify-between rounded-[26px] border border-[#cbdcd6] bg-[#f8f6ef] p-7 sm:p-8" data-testid="card-care-opinion">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f7e6b6] text-[#a17525]"><Compass className="size-6" /></div>
              <div>
                <p className="mono-face text-[10px] font-bold uppercase tracking-[.18em] text-[#a17525]">03 · A second view</p>
                <h3 className="display-face mt-3 text-3xl font-semibold leading-tight text-[#153247]">Confidence<br />in your choice.</h3>
                <p className="mt-4 text-sm leading-6 text-[#718287]">A considered second opinion when the decision feels especially important.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="clinic" className="scroll-mt-20 border-b border-[#dce3df] bg-[#f8f6ef]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
            <p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">Find your way here</p>
            <h2 className="display-face mt-4 text-4xl font-semibold leading-none text-[#153247] sm:text-5xl">A calm place<br />to begin.</h2>
            <p className="mt-6 max-w-sm text-sm leading-6 text-[#718287]">Neuro Tower brings specialist care closer to families across Multan and South Punjab.</p>
            <button onClick={openAppointment} className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full border border-[#9fbab3] px-5 py-3 text-sm font-bold text-[#197263] transition hover:-translate-y-0.5 hover:border-[#197263] hover:bg-[#e7f0ec]" data-testid="button-clinic-appointment">Plan your visit <ArrowUpRight className="size-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] bg-[#e7f0ec] p-7 sm:col-span-2 sm:flex sm:items-center sm:justify-between" data-testid="card-clinic-location">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#153247] text-[#f2c55f]"><MapPin className="size-5" /></div>
                <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#197263]">Clinic address</p><p className="mt-2 text-lg font-bold text-[#153247]">{clinicName}</p><p className="mt-1 text-sm text-[#587078]">Bosan Road, Multan, Pakistan</p></div>
              </div>
              <a href="https://maps.google.com/?q=Neuro+Tower+Multan" target="_blank" rel="noreferrer" className="focus-ring mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#197263] sm:mt-0" data-testid="link-clinic-directions">Get directions <ArrowUpRight className="size-4" /></a>
            </div>
            <div className="rounded-[24px] border border-[#d6e1dd] bg-[#fbf8f0] p-7" data-testid="card-clinic-hours">
              <div className="flex items-center gap-3"><Clock3 className="size-5 text-[#197263]" /><p className="text-xs font-bold uppercase tracking-[.13em] text-[#197263]">Clinic hours</p></div>
              {availabilityQuery.isLoading ? (
                <div className="mt-5 space-y-3" data-testid="skeleton-clinic-hours"><div className="h-3 w-full animate-pulse rounded bg-[#dfe9e4]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[#dfe9e4]" /><div className="h-3 w-3/5 animate-pulse rounded bg-[#dfe9e4]" /></div>
              ) : (
                <div className="mt-5 space-y-2.5">{hours.slice(0, 5).map((item) => <div key={item.day} className="flex justify-between gap-3 text-sm"><span className="text-[#718287]">{item.day}</span><span className="font-semibold text-[#31505b]">{item.hours}</span></div>)}</div>
              )}
              {availabilityQuery.isError && <p className="mt-4 text-xs text-[#a17525]" data-testid="status-hours-fallback">Showing usual clinic hours.</p>}
            </div>
            <div className="rounded-[24px] bg-[#153247] p-7 text-[#fbf8f0]" data-testid="card-clinic-contact">
              <div className="flex items-center gap-3"><Phone className="size-5 text-[#f2c55f]" /><p className="text-xs font-bold uppercase tracking-[.13em] text-[#f2c55f]">Speak to the team</p></div>
              <p className="display-face mt-5 text-3xl font-semibold">Let&apos;s make<br />a plan.</p>
              <a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#b7d8cf]" data-testid="link-clinic-phone">{clinicPhone} <ArrowUpRight className="size-4" /></a>
            </div>
          </div>
        </div>
      </section>

      <section id="voices" className="scroll-mt-20 bg-[#f1ead8]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#a17525]">Patient voices</p><h2 className="display-face mt-4 text-4xl font-semibold text-[#153247] sm:text-5xl">What patients remember.</h2></div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#a17525]" data-testid="status-review-proof"><BadgeCheck className="size-5" /> Care that earns trust</div>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {reviews.map((review, index) => (
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
          <div><p className="mono-face text-[10px] font-bold uppercase tracking-[.23em] text-[#f2c55f]">Your next step can be simple</p><h2 className="display-face mt-4 max-w-2xl text-4xl font-semibold leading-tight text-[#fbf8f0] sm:text-5xl">When you&apos;re ready, we&apos;re ready to listen.</h2></div>
          <button onClick={openAppointment} className="focus-ring group inline-flex shrink-0 items-center gap-3 rounded-full bg-[#f2c55f] px-6 py-3.5 text-sm font-extrabold text-[#153247] transition hover:-translate-y-1 hover:bg-[#f6d27e]" data-testid="button-footer-appointment">Request an appointment <span className="grid size-6 place-items-center rounded-full bg-[#153247] text-[#f2c55f] transition group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span></button>
        </div>
      </section>

      <footer className="bg-[#102a3c] text-[#b7cbd0]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1fr_auto_auto] lg:px-10">
          <div><BrandMark inverse /><p className="mt-5 max-w-xs text-sm leading-6 text-[#88a5ab]">Brain and spine care with clarity, precision, and time to listen.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#f2c55f]">Contact</p><a href={`tel:${clinicPhone.replace(/\s/g, '')}`} className="focus-ring mt-4 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-phone">{clinicPhone}</a><a href="mailto:care@neurotower.pk" className="focus-ring mt-2 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-email"><Mail className="mr-1.5 inline size-3.5" />care@neurotower.pk</a></div>
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#f2c55f]">Navigate</p><a href="#top" className="focus-ring mt-4 block text-sm font-semibold hover:text-[#fbf8f0]" data-testid="link-footer-top">Back to top ↑</a><p className="mt-2 text-sm text-[#88a5ab]" data-testid="text-review-queue">{appointmentsQuery.isError ? 'Our team is here to help.' : `${requestsInReview > 0 ? 'Requests are' : 'Appointment requests are'} being reviewed.`}</p></div>
        </div>
        <div className="border-t border-[#274658]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-[#6f9198] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>© {new Date().getFullYear()} Dr. Iqbal Kharal · Neuro Tower Multan</span><span>For urgent symptoms, please visit your nearest emergency department.</span></div></div>
      </footer>

      <AppointmentModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} availability={availability} />
    </main>
  );
}

export default Home;