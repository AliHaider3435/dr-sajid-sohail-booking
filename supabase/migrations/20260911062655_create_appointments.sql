create table public.appointments (
  id serial primary key,
  clinic_location text not null default 'multan',
  city text not null default 'Multan',
  patient_name text not null,
  phone text not null,
  email text,
  visit_type text not null default 'new-patient',
  appointment_type text not null default 'new-patient',
  preferred_date date not null,
  preferred_time text not null,
  message text,
  attachment_name text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Service role can manage appointments"
on public.appointments
for all
to service_role
using (true)
with check (true);