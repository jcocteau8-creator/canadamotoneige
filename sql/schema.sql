-- ============================================================
-- Canada Motoneige — schema du compte client
-- ============================================================
-- A COLLER UNE SEULE FOIS dans Supabase : Project > SQL Editor > New query
-- puis bouton "Run". Sans danger a relancer (tout est en "if not exists"
-- ou "create or replace").
-- ============================================================

-- ---------- profils (1 ligne par compte, en plus de auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nom        text,
  prenom     text,
  telephone  text,
  ville      text,
  pays       text default 'France',
  role       text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- Cree automatiquement le profil des qu'un compte s'inscrit.
-- L'email est duplique ici depuis auth.users (normalement non accessible
-- via l'API publique) pour que le back-office puisse identifier un client
-- sans acces privilegie.
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nom, prenom)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'prenom', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.gerer_nouvel_utilisateur();

-- ---------- reservations (demandes de devis, jamais de paiement) ----------
create table if not exists public.reservations (
  id           uuid primary key default gen_random_uuid(),
  -- reference profiles (pas directement auth.users) pour que le
  -- back-office puisse recuperer nom/email du client par simple jointure
  client_id    uuid not null references public.profiles(id) on delete cascade,
  forfait_page text not null,
  forfait_nom  text not null,
  debut        date not null,
  pax          int  not null default 2,
  formule      text not null default 'duo' check (formule in ('duo', 'solo')),
  message      text,
  statut       text not null default 'devis'
               check (statut in ('devis', 'confirmee', 'soldee', 'terminee', 'annulee')),
  created_at   timestamptz not null default now()
);

-- ---------- commandes boutique (paiement a organiser hors ligne) ----------
create table if not exists public.commandes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  article    text not null,
  variante   text,
  qte        int  not null default 1,
  statut     text not null default 'paiement_attente'
             check (statut in ('paiement_attente', 'payee', 'preparee', 'remise', 'expediee', 'annulee')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Securite (Row Level Security) : chaque client ne voit que SES
-- propres donnees ; le compte admin (voir tout en bas) voit tout.
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.reservations enable row level security;
alter table public.commandes    enable row level security;

-- petite fonction utilitaire : le compte courant est-il admin ?
create or replace function public.est_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profil: lecture propre ou admin" on public.profiles;
create policy "profil: lecture propre ou admin" on public.profiles
  for select using (auth.uid() = id or public.est_admin());

drop policy if exists "profil: modification propre" on public.profiles;
create policy "profil: modification propre" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "reservations: lecture propre ou admin" on public.reservations;
create policy "reservations: lecture propre ou admin" on public.reservations
  for select using (auth.uid() = client_id or public.est_admin());

drop policy if exists "reservations: creation par le client" on public.reservations;
create policy "reservations: creation par le client" on public.reservations
  for insert with check (auth.uid() = client_id);

drop policy if exists "reservations: modification admin" on public.reservations;
create policy "reservations: modification admin" on public.reservations
  for update using (public.est_admin());

drop policy if exists "commandes: lecture propre ou admin" on public.commandes;
create policy "commandes: lecture propre ou admin" on public.commandes
  for select using (auth.uid() = client_id or public.est_admin());

drop policy if exists "commandes: creation par le client" on public.commandes;
create policy "commandes: creation par le client" on public.commandes
  for insert with check (auth.uid() = client_id);

drop policy if exists "commandes: modification admin" on public.commandes;
create policy "commandes: modification admin" on public.commandes
  for update using (public.est_admin());

-- ============================================================
-- DERNIERE ETAPE, A FAIRE A LA MAIN (une seule fois) :
-- 1. Va sur le site, clique "Mon compte", inscris-toi avec TON email
--    (celui de l'entreprise), comme n'importe quel client.
-- 2. Reviens ici et lance la ligne ci-dessous en remplaçant l'email :
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'TON-EMAIL@EXEMPLE.COM');
--
-- A partir de la, ce compte voit TOUTES les reservations et commandes
-- dans le back-office (admin/), pas seulement les siennes.
-- ============================================================
