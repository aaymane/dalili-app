// Vérifie que la formule du simulateur de l'app (src/data/content.ts) donne exactement
// les mêmes nombres que celle du site (cas de test de tools.json).
// Usage : npm run check:budget
import { computeBudget, snapshot } from '../src/data/content';

const { cases } = snapshot.tools.budget;
let failed = 0;
for (const c of cases) {
  const got = computeBudget(c.input, snapshot.tools.budget);
  const ok = JSON.stringify(got) === JSON.stringify(c.expected);
  if (!ok) {
    failed++;
    console.error('✗', c.input, '\n  site :', c.expected, '\n  app  :', got);
  }
}
console.log(failed ? `${failed}/${cases.length} cas différents` : `${cases.length}/${cases.length} cas identiques au site ✓`);
process.exit(failed ? 1 : 0);
