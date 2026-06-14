
-- Helper: current professional id for the signed-in user
create or replace function public.current_professional_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.professionals where profile_id = auth.uid() limit 1;
$$;
revoke all on function public.current_professional_id() from public;
grant execute on function public.current_professional_id() to authenticated;

-- ============ appointments ============
drop policy if exists "appt update authed" on public.appointments;
drop policy if exists "appt delete admin" on public.appointments;
drop policy if exists "appt insert authed" on public.appointments;

create policy "appt insert own or admin" on public.appointments
  for insert to authenticated
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "appt update own or admin" on public.appointments
  for update to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'))
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "appt delete own or admin" on public.appointments
  for delete to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

-- ============ assessments ============
drop policy if exists "assess insert authed" on public.assessments;
drop policy if exists "assess update unlocked" on public.assessments;
drop policy if exists "assess delete admin" on public.assessments;

create policy "assess insert own or admin" on public.assessments
  for insert to authenticated
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "assess update own unlocked or admin" on public.assessments
  for update to authenticated
  using (
    (locked_at is null and professional_id = public.current_professional_id())
    or public.has_role(auth.uid(),'admin')
  )
  with check (
    (locked_at is null and professional_id = public.current_professional_id())
    or public.has_role(auth.uid(),'admin')
  );

create policy "assess delete own or admin" on public.assessments
  for delete to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

-- ============ assessment sub-tables ============
-- neuro / ortho / postural / vitals / modules: lock writes to owner of parent assessment
drop policy if exists "neuro authed all" on public.assessment_neuro;
drop policy if exists "ortho authed all" on public.assessment_ortho;
drop policy if exists "postural authed all" on public.assessment_postural;
drop policy if exists "vitals authed all" on public.assessment_vitals;
drop policy if exists "modules authed all" on public.assessment_modules;

-- recreate as separate SELECT (open to authed) + write (owner/admin)
create policy "neuro read authed" on public.assessment_neuro for select to authenticated using (true);
create policy "neuro write own or admin" on public.assessment_neuro
  for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  )
  with check (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  );

create policy "ortho read authed" on public.assessment_ortho for select to authenticated using (true);
create policy "ortho write own or admin" on public.assessment_ortho
  for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  )
  with check (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  );

create policy "postural read authed" on public.assessment_postural for select to authenticated using (true);
create policy "postural write own or admin" on public.assessment_postural
  for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  )
  with check (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  );

create policy "vitals read authed" on public.assessment_vitals for select to authenticated using (true);
create policy "vitals write own or admin" on public.assessment_vitals
  for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  )
  with check (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  );

create policy "modules read authed" on public.assessment_modules for select to authenticated using (true);
create policy "modules write own or admin" on public.assessment_modules
  for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  )
  with check (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assessments a where a.id = assessment_id and a.professional_id = public.current_professional_id())
  );

-- ============ evolutions ============
drop policy if exists "evo insert authed" on public.evolutions;
drop policy if exists "evo update unlocked" on public.evolutions;
drop policy if exists "evo delete admin" on public.evolutions;

create policy "evo insert own or admin" on public.evolutions
  for insert to authenticated
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "evo update own unlocked or admin" on public.evolutions
  for update to authenticated
  using (
    (locked_at is null and professional_id = public.current_professional_id())
    or public.has_role(auth.uid(),'admin')
  )
  with check (
    (locked_at is null and professional_id = public.current_professional_id())
    or public.has_role(auth.uid(),'admin')
  );

create policy "evo delete own or admin" on public.evolutions
  for delete to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

-- ============ documents ============
drop policy if exists "doc insert authed" on public.documents;
drop policy if exists "doc delete admin" on public.documents;

create policy "doc insert own or admin" on public.documents
  for insert to authenticated
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "doc update own or admin" on public.documents
  for update to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'))
  with check (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

create policy "doc delete own or admin" on public.documents
  for delete to authenticated
  using (professional_id = public.current_professional_id() or public.has_role(auth.uid(),'admin'));

-- ============ patient_attachments ============
drop policy if exists "attach insert authed" on public.patient_attachments;
drop policy if exists "attach delete admin" on public.patient_attachments;

create policy "attach insert authed" on public.patient_attachments
  for insert to authenticated
  with check (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "attach update own or admin" on public.patient_attachments
  for update to authenticated
  using (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "attach delete own or admin" on public.patient_attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ============ patients ============
-- Shared clinic: keep reads open. Tighten writes minimally:
--  - insert: any authenticated (clinic intake)
--  - update: any authenticated (shared editing)
--  - delete: admin only (already enforced)
-- Replace permissive update with an explicit allow to make intent clear.
drop policy if exists "patients update authed" on public.patients;
create policy "patients update authed" on public.patients
  for update to authenticated
  using (true)
  with check (true);

-- ============ financial_entries ============
-- Add owner-scoped write policies; admin policy already exists.
create policy "fin prof insert own" on public.financial_entries
  for insert to authenticated
  with check (professional_id = public.current_professional_id());

create policy "fin prof update own" on public.financial_entries
  for update to authenticated
  using (professional_id = public.current_professional_id())
  with check (professional_id = public.current_professional_id());

create policy "fin prof delete own" on public.financial_entries
  for delete to authenticated
  using (professional_id = public.current_professional_id());

-- ============ user_roles (prevent privilege escalation) ============
create policy "roles admin insert" on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));

create policy "roles admin update" on public.user_roles
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "roles admin delete" on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- ============ storage: documents bucket ============
-- Keep SELECT/INSERT for authenticated (shared clinic); restrict UPDATE/DELETE to admins.
do $$
declare
  pol record;
begin
  for pol in
    select polname from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relname = 'objects' and c.relnamespace = 'storage'::regnamespace
      and (
        polname ilike 'documents%update%' or polname ilike 'documents%delete%'
        or polname = 'documents_update_authed' or polname = 'documents_delete_authed'
        or polname = 'documents update authed' or polname = 'documents delete authed'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', pol.polname);
  end loop;
end$$;

create policy "documents update admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'documents' and public.has_role(auth.uid(),'admin'));

create policy "documents delete admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.has_role(auth.uid(),'admin'));
