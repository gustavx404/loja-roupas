create table if not exists public.app_catalog (
  id smallint primary key check (id = 1),
  body jsonb not null
);

insert into public.app_catalog (id, body)
values (1, '{"restaurant":{"name":"MOVO","whatsapp":"","hours":""},"categories":[],"products":[]}')
on conflict (id) do nothing;

create table if not exists public.administrator (
  id smallint primary key check (id = 1),
  username varchar(32) not null unique,
  salt text not null,
  password_hash text not null,
  must_change_password boolean not null default true
);

create table if not exists public.administrator_session (
  token_hash char(64) primary key,
  username varchar(32) not null,
  expires_at timestamptz not null
);

create index if not exists administrator_session_expires_at_idx
  on public.administrator_session (expires_at);

alter table public.app_catalog enable row level security;
alter table public.administrator enable row level security;
alter table public.administrator_session enable row level security;

revoke all on public.app_catalog, public.administrator, public.administrator_session from anon, authenticated;
grant select, insert, update, delete on public.app_catalog, public.administrator, public.administrator_session to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;
