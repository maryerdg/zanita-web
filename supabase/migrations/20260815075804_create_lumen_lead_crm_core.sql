create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  full_name text not null check (char_length(full_name) between 2 and 120),
  business_name text check (business_name is null or char_length(business_name) <= 160),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),
  email text check (email is null or char_length(email) <= 254),

  solution text check (solution is null or char_length(solution) <= 120),
  primary_objective text check (primary_objective is null or char_length(primary_objective) <= 2000),
  required_functions text check (required_functions is null or char_length(required_functions) <= 3000),
  budget_range text check (budget_range is null or char_length(budget_range) <= 120),
  desired_date date,
  timeline_notes text check (timeline_notes is null or char_length(timeline_notes) <= 500),

  source text check (source is null or char_length(source) <= 120),
  status text not null default 'Nuevo' check (
    status in ('Nuevo','Contactado','Diagnóstico agendado','Propuesta enviada','En negociación','Ganado','Perdido')
  ),
  next_follow_up_at timestamptz,
  owner text check (owner is null or owner in ('Maryer','Javi','Ambos')),
  notes text check (notes is null or char_length(notes) <= 5000),

  context text check (context is null or char_length(context) <= 120),
  reference text check (reference is null or char_length(reference) <= 200),
  source_page text check (source_page is null or char_length(source_page) <= 500),
  form_name text check (form_name is null or char_length(form_name) <= 120),

  utm_source text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),

  privacy_notice_accepted boolean not null default false,
  privacy_notice_version text check (privacy_notice_version is null or char_length(privacy_notice_version) <= 50),
  privacy_notice_accepted_at timestamptz,

  archived_at timestamptz
);

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function private.set_updated_at();

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status);
create index leads_next_follow_up_idx on public.leads (next_follow_up_at) where next_follow_up_at is not null;
create index leads_whatsapp_idx on public.leads (whatsapp);
create index leads_email_idx on public.leads (email) where email is not null;

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null check (char_length(event_type) between 1 and 80),
  from_status text,
  to_status text,
  actor text check (actor is null or char_length(actor) <= 120),
  notes text check (notes is null or char_length(notes) <= 3000),
  metadata jsonb not null default '{}'::jsonb
);

create index lead_events_lead_id_created_at_idx on public.lead_events (lead_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

revoke all on table public.leads from anon, authenticated;
revoke all on table public.lead_events from anon, authenticated;

comment on table public.leads is 'CRM principal de prospectos de Lumen Digital Solutions. Escritura y lectura únicamente vía backend autorizado.';
comment on table public.lead_events is 'Historial de actividad y cambios de estado de leads de Lumen. Acceso únicamente vía backend autorizado.';;
