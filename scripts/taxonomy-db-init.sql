create table if not exists careerpathx_database_ownership (
  singleton boolean primary key default true check (singleton),
  application_name text not null check (application_name = 'CareerPathX'),
  database_purpose text not null check (database_purpose = 'taxonomy'),
  environment text not null check (environment = 'local'),
  schema_version integer not null,
  created_at timestamptz not null default now()
);

insert into careerpathx_database_ownership (
  singleton,
  application_name,
  database_purpose,
  environment,
  schema_version
) values (
  true,
  'CareerPathX',
  'taxonomy',
  'local',
  1
) on conflict (singleton) do nothing;
