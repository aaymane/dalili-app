/**
 * Villes étudiantes couvertes (cohérent avec les 14 fiches villes du site).
 * Les budgets sont des ESTIMATIONS mensuelles (€) — à synchroniser avec dalili.study.
 */
export type City = {
  id: string;
  name: string;
  members: number;
  color: string;
  /** Loyers mensuels indicatifs selon le type de logement. */
  rent: { crous: number; coloc: number; studio: number };
  transport: number;
  food: number;
  tagline: string;
};

export const cities: City[] = [
  { id: 'paris', name: 'Paris', members: 2840, color: '#3D78FF', rent: { crous: 450, coloc: 700, studio: 950 }, transport: 38, food: 250, tagline: 'La capitale, ses campus et sa vie culturelle' },
  { id: 'lyon', name: 'Lyon', members: 612, color: '#A855F7', rent: { crous: 330, coloc: 480, studio: 620 }, transport: 33, food: 220, tagline: 'Gastronomie, Presqu’île et grandes écoles' },
  { id: 'toulouse', name: 'Toulouse', members: 438, color: '#F43F5E', rent: { crous: 300, coloc: 420, studio: 540 }, transport: 10, food: 210, tagline: 'La ville rose, l’aéro et le soleil' },
  { id: 'bordeaux', name: 'Bordeaux', members: 294, color: '#22C55E', rent: { crous: 310, coloc: 450, studio: 600 }, transport: 20, food: 215, tagline: 'Quais, vignobles et campus de Talence' },
  { id: 'marseille', name: 'Marseille', members: 388, color: '#F97316', rent: { crous: 290, coloc: 420, studio: 550 }, transport: 12, food: 210, tagline: 'La Méditerranée et une forte communauté maghrébine' },
  { id: 'lille', name: 'Lille', members: 210, color: '#6366F1', rent: { crous: 300, coloc: 420, studio: 560 }, transport: 25, food: 210, tagline: 'Ville étudiante n°1 du Nord, accueillante' },
  { id: 'nantes', name: 'Nantes', members: 186, color: '#14B8A6', rent: { crous: 290, coloc: 410, studio: 540 }, transport: 25, food: 210, tagline: 'Créative, verte et à taille humaine' },
  { id: 'montpellier', name: 'Montpellier', members: 241, color: '#EAB308', rent: { crous: 290, coloc: 420, studio: 560 }, transport: 0, food: 210, tagline: 'Soleil, jeunesse et transports gratuits' },
  { id: 'strasbourg', name: 'Strasbourg', members: 133, color: '#EC4899', rent: { crous: 290, coloc: 410, studio: 540 }, transport: 25, food: 210, tagline: 'Européenne, bilingue et cyclable' },
  { id: 'rennes', name: 'Rennes', members: 120, color: '#0EA5E9', rent: { crous: 280, coloc: 400, studio: 520 }, transport: 20, food: 205, tagline: 'Dynamique, étudiante et bretonne' },
  { id: 'grenoble', name: 'Grenoble', members: 98, color: '#84CC16', rent: { crous: 280, coloc: 400, studio: 500 }, transport: 15, food: 205, tagline: 'Les montagnes et la tech' },
  { id: 'le-havre', name: 'Le Havre', members: 76, color: '#64748B', rent: { crous: 260, coloc: 360, studio: 450 }, transport: 15, food: 200, tagline: 'Port, mer et université à taille humaine' },
];

export const cityByName = (name?: string | null) =>
  cities.find((c) => c.name.toLowerCase() === (name ?? '').toLowerCase());
