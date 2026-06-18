create table if not exists public.auth_refresh_tokens (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  token_hash text not null,
  family_id text not null,
  replaced_by_token_hash text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists auth_refresh_tokens_token_hash_idx
  on public.auth_refresh_tokens(token_hash);
create index if not exists auth_refresh_tokens_user_id_idx
  on public.auth_refresh_tokens(user_id);
create index if not exists auth_refresh_tokens_family_id_idx
  on public.auth_refresh_tokens(family_id);
