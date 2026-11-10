-- Cleekin schema. Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists frames (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  name_key text not null,
  blob_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  slots jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists frames_name_key_idx on frames (name_key);
create index if not exists frames_active_created_idx on frames (is_active, created_at desc);

create table if not exists login_attempts (
  id bigserial primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_ip_time_idx on login_attempts (ip, attempted_at);
