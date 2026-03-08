-- ============================================================
-- AIstands — Supabase Database Schema
-- Run this in: supabase.com → your project → SQL Editor
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  plan text default 'free' check (plan in ('free','professional','team','enterprise')),
  query_count_month int default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Reset query count monthly (call via cron or manually)
create or replace function reset_monthly_queries()
returns void as $$
  update profiles set query_count_month = 0;
$$ language sql security definer;

-- Projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  file_name text,
  file_path text,
  document_text text,
  standard_name text,
  query_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table projects enable row level security;
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id);

-- Workbook entries
create table workbook_entries (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade not null,
  clause text,
  title text,
  requirement text,
  notes text default '',
  created_at timestamptz default now()
);
alter table workbook_entries enable row level security;
create policy "Users manage own workbook" on workbook_entries for all
  using (exists (select 1 from projects where id = project_id and user_id = auth.uid()));

-- Checklist items
create table checklist_items (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade not null,
  clause text,
  requirement text not null,
  completed boolean default false,
  created_at timestamptz default now()
);
alter table checklist_items enable row level security;
create policy "Users manage own checklists" on checklist_items for all
  using (exists (select 1 from projects where id = project_id and user_id = auth.uid()));

-- Query history
create table query_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references projects on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);
alter table query_history enable row level security;
create policy "Users view own history" on query_history for all using (auth.uid() = user_id);

-- Storage bucket for documents
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
create policy "Users manage own documents" on storage.objects for all
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
