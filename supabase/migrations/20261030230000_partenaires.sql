-- Demandes de partenariat (30/10/2026). Banques, écoles, assurances, logement, mobilité, associations : la page
-- dalili.study/partenaires envoie leur demande au serveur du site, qui l'écrit ici avec la clé service.
-- Aucune règle d'accès : ni les visiteurs ni les comptes de l'app ne lisent ou n'écrivent cette table ;
-- seule l'équipe la lit (admin du site, onglet Partenaires). L'adresse IP n'est jamais gardée, seulement son empreinte
-- (SHA-256), pour limiter les envois répétés.

create table public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  organization text not null check (char_length(organization) between 2 and 120),
  kind text not null check (kind in ('banque', 'ecole', 'assurance', 'logement', 'mobilite', 'association', 'autre')),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  job_title text check (char_length(job_title) <= 80),
  email text not null check (char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 30),
  website text check (char_length(website) <= 200),
  zone text check (char_length(zone) <= 80),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'partenaire', 'sans_suite')),
  handled_by text check (char_length(handled_by) between 2 and 40),
  notes text check (char_length(notes) <= 2000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_leads_status_idx on public.partner_leads (status, created_at desc);
create index partner_leads_ip_idx on public.partner_leads (ip_hash, created_at desc);
alter table public.partner_leads enable row level security;
revoke all on public.partner_leads from anon, authenticated;
