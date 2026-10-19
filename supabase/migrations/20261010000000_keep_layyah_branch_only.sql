update public.appointments
set clinic_location = 'layyah',
    city = 'Layyah'
where clinic_location <> 'layyah';

alter table public.appointments
  alter column clinic_location set default 'layyah',
  alter column city set default 'Layyah';
