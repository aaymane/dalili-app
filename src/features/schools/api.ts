/**
 * Écoles partenaires. Les fiches viennent de la base (écrites par l'équipe, visibles une fois publiées) ;
 * « Je suis intéressé·e » reste chez DALILI : l'équipe recontacte l'étudiant, rien n'est transmis à l'école
 * (supabase/migrations/20261029180000_ecoles_partenaires.sql).
 * Sans Supabase ou sans session (mode démo) : la fiche d'exemple, et ta demande gardée sur le téléphone.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type Program = { name: string; level: string; format: string };
export type Fact = { value: string; label: string };

export type School = {
  id: string;
  slug: string;
  name: string;
  city: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  transport: string[];
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  /** « Photos : … © … », affiché sous les photos. */
  photoCredit: string | null;
  programs: Program[];
  facts: Fact[];
  /** Date où l'équipe a vérifié les infos sur le site officiel de l'école. */
  checkedOn: string | null;
};

export type Interest = { id: string; schoolId: string; program: string | null; message: string | null; createdAt: string };

/** Mode démo : la même fiche qu'en base (site officiel, relevée le 29/10/2026), photos servies par dalili.study. */
const MEDIA = 'https://dalili.study/partenaires/digital-campus-nantes';
const DEMO_SCHOOLS: School[] = [
  {
    id: 'demo-digital-campus-nantes',
    slug: 'digital-campus-nantes',
    name: 'Digital Campus Nantes',
    city: 'Nantes',
    tagline: 'L’école du digital, de la communication et du design',
    description:
      'Un campus à taille humaine de 2 200 m² sur 6 niveaux, dans le quartier universitaire de Nantes. Des Bachelors et des Mastères certifiés RNCP, en alternance dès la 2e année de Bachelor.',
    address: 'Central Green, 5-7 route de la Jonelière, bâtiment I, 44300 Nantes',
    transport: ['Tram 2 · arrêt « Facultés »', 'Bus 75 · arrêt « Facultés »', 'Bus 80, E5 et C20 · arrêt « Fac de lettres »', 'Vélos : local sur le campus et station Bicloo « Facultés »'],
    website: 'https://www.digital-campus.fr/ecole/nantes',
    logoUrl: `${MEDIA}/logo-blanc.svg`,
    coverUrl: `${MEDIA}/couverture.jpg`,
    photos: Array.from({ length: 9 }, (_, i) => `${MEDIA}/photo-${String(i + 1).padStart(2, '0')}.jpg`),
    photoCredit: 'Photos : Digital Campus Nantes, © Guillaume Bouju',
    programs: [
      { name: 'Bachelor digital (1re année)', level: 'Bac+1', format: 'Initial' },
      { name: 'Bachelor Chef de projet digital', level: 'Bac+3', format: 'Alternance dès la 2e année' },
      { name: 'Bachelor UI & Web design', level: 'Bac+3', format: 'Alternance dès la 2e année' },
      { name: 'Mastère Brand Content', level: 'Bac+5', format: 'Alternance' },
      { name: 'Mastère Direction Artistique Digitale', level: 'Bac+5', format: 'Alternance' },
      { name: 'Mastère Lead Product Design', level: 'Bac+5', format: 'Alternance' },
    ],
    facts: [
      { value: '92,4 %', label: 'des étudiants choisissent l’alternance' },
      { value: '82 %', label: 'de placement' },
      { value: '1 080', label: 'entreprises ont engagé un de leurs apprentis en 2023' },
    ],
    checkedOn: '2026-10-29',
  },
];

const useDemoInterests = create<{ interests: Interest[]; add: (i: Interest) => void; remove: (schoolId: string) => void }>()(
  persist(
    (set) => ({
      interests: [],
      add: (i) => set((s) => ({ interests: [...s.interests.filter((x) => x.schoolId !== i.schoolId), i] })),
      remove: (schoolId) => set((s) => ({ interests: s.interests.filter((x) => x.schoolId !== schoolId) })),
    }),
    { name: 'dalili.demo-interests', storage: persistStorage },
  ),
);

async function online() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? supabase : null;
}

const toSchool = (r: Record<string, any>): School => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  city: r.city,
  tagline: r.tagline,
  description: r.description,
  address: r.address,
  transport: r.transport ?? [],
  website: r.website,
  logoUrl: r.logo_url,
  coverUrl: r.cover_url,
  photos: r.photos ?? [],
  photoCredit: r.photo_credit,
  programs: r.programs ?? [],
  facts: r.facts ?? [],
  checkedOn: r.source_checked_on,
});

const toInterest = (r: Record<string, any>): Interest => ({ id: r.id, schoolId: r.school_id, program: r.program, message: r.message, createdAt: r.created_at });

export async function fetchSchools(): Promise<School[]> {
  const db = await online();
  if (!db) return DEMO_SCHOOLS;
  const { data, error } = await db.from('partner_schools').select('*').order('sort').order('name');
  if (error) throw error;
  return (data ?? []).map(toSchool);
}

export async function fetchMyInterests(): Promise<Interest[]> {
  const db = await online();
  if (!db) return useDemoInterests.getState().interests;
  const { data, error } = await db.from('school_leads').select('id, school_id, program, message, created_at');
  if (error) throw error;
  return (data ?? []).map(toInterest);
}

export async function sendInterest(schoolId: string, program: string | null, message: string): Promise<Interest> {
  const db = await online();
  if (!db) {
    const i = { id: `local-${schoolId}`, schoolId, program, message: message.trim() || null, createdAt: new Date().toISOString() };
    useDemoInterests.getState().add(i);
    return i;
  }
  const { data, error } = await db
    .from('school_leads')
    .insert({ school_id: schoolId, program, message })
    .select('id, school_id, program, message, created_at')
    .single();
  if (error) throw error;
  return toInterest(data);
}

export async function withdrawInterest(interest: Interest) {
  const db = await online();
  if (!db) return useDemoInterests.getState().remove(interest.schoolId);
  const { error } = await db.from('school_leads').delete().eq('id', interest.id);
  if (error) throw error;
}
