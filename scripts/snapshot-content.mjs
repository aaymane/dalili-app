#!/usr/bin/env node
// Instantané hors ligne du contenu dalili.study, embarqué dans l'app :
//   assets/content/core.json   → parcours, chiffres, villes, pays, lexique, outils (chargé au démarrage)
//   assets/content/guides.json → tous les guides (chargé seulement si besoin, hors ligne)
// À relancer avant chaque build store : `npm run content:snapshot`
// Source : CONTENT_URL (défaut https://dalili.study/api/content/v1),
// ou un site local : CONTENT_URL=http://localhost:3100/api/content/v1 npm run content:snapshot

import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.CONTENT_URL ?? 'https://dalili.study/api/content/v1').replace(/\/$/, '');
const OUT = path.join(process.cwd(), 'assets', 'content');

async function get(p) {
  const res = await fetch(`${BASE}/${p}`);
  if (!res.ok) throw new Error(`${p} → HTTP ${res.status}`);
  return res.json();
}

const [manifest, journey, figures, cities, countries, glossary, tools] = await Promise.all(
  ['manifest.json', 'journey.json', 'figures.json', 'cities.json', 'countries.json', 'glossary.json', 'tools.json'].map(get),
);

const guides = {};
for (const g of manifest.guides) guides[g.slug] = await get(`guides/${g.slug}`);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'core.json'), JSON.stringify({ snapshotAt: new Date().toISOString(), source: BASE, manifest, journey, figures, cities, countries, glossary, tools }));
fs.writeFileSync(path.join(OUT, 'guides.json'), JSON.stringify(guides));
console.log(`Instantané : ${manifest.guides.length} guides, ${journey.steps.length} étapes, ${cities.length} villes (source ${BASE}).`);
