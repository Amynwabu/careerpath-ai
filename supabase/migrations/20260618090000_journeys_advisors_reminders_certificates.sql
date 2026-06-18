create table if not exists public.journeys (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  analysis_id integer references public.career_analyses(id) on delete set null,
  selected_direction text not null,
  "current_role" text,
  target_role text not null,
  duration_months integer not null,
  status text not null default 'active',
  generated_from text,
  progress integer not null default 0 check (progress between 0 and 100),
  selected_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journeys_user_id_idx on public.journeys(user_id);

create table if not exists public.journey_stages (
  id serial primary key,
  journey_id integer not null references public.journeys(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  stage_order integer not null,
  title text not null,
  duration text not null,
  description text not null,
  resources jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (journey_id, stage_order)
);

create index if not exists journey_stages_user_id_idx on public.journey_stages(user_id);

alter table public.milestones
  add column if not exists journey_stage_id integer references public.journey_stages(id) on delete set null;

alter table public.milestones
  add column if not exists checklist_item_key text;

create index if not exists milestones_journey_stage_id_idx on public.milestones(journey_stage_id);

create table if not exists public.advisors (
  id serial primary key,
  name text not null unique,
  role text not null,
  rating text not null,
  sessions_completed integer not null default 0,
  specialisms jsonb not null default '[]'::jsonb,
  availability text not null,
  quote text not null,
  best_for text not null,
  session_price_pence integer not null default 3000,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.advisor_bookings (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  advisor_id integer not null references public.advisors(id) on delete cascade,
  journey_id integer references public.journeys(id) on delete set null,
  requested_slot text not null,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advisor_bookings_user_id_idx on public.advisor_bookings(user_id);

create table if not exists public.weekly_reminders (
  id serial primary key,
  user_id integer not null unique references public.users(id) on delete cascade,
  journey_id integer references public.journeys(id) on delete set null,
  frequency text not null default 'weekly' check (frequency in ('weekly', 'fortnightly', 'off')),
  day_of_week integer not null default 1 check (day_of_week between 0 and 6),
  last_sent_at timestamptz,
  content_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  journey_id integer not null references public.journeys(id) on delete cascade,
  title text not null,
  recipient_name text not null,
  completion_duration text not null,
  verification_token text not null unique,
  pdf_url text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, journey_id)
);

insert into public.advisors (
  name,
  role,
  rating,
  sessions_completed,
  specialisms,
  availability,
  quote,
  best_for,
  session_price_pence
)
values
  (
    'Maya Chen',
    'AI Product Strategy',
    '4.9',
    186,
    '["AI Products", "Career Pivots", "PM Interview Prep"]'::jsonb,
    'Available this week - next slot Thursday 18:00',
    'I help people turn broad experience into a product story hiring teams understand.',
    'Career changers moving into product, AI strategy, or product operations.',
    3000
  ),
  (
    'Daniel Okafor',
    'Senior Data Scientist',
    '4.8',
    142,
    '["Data Science", "Portfolio Review", "SQL Interviews"]'::jsonb,
    'Available this week - next slot Friday 12:00',
    'I help learners choose the projects that prove they are ready.',
    'Analysts, graduates, and operations professionals moving into data roles.',
    3000
  ),
  (
    'Priya Nair',
    'UX Research Lead',
    '4.9',
    121,
    '["UX Research", "Case Studies", "Stakeholder Interviews"]'::jsonb,
    'Limited availability - next slot Monday 19:00',
    'We turn previous work into research evidence and a credible transition story.',
    'Marketing, teaching, support, and service professionals moving into UX research.',
    3000
  )
on conflict (name) do nothing;
