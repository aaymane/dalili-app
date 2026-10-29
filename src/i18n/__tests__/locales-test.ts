import ar from '../locales/ar.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

type Tree = { [k: string]: string | Tree };

/** Toutes les clés « a.b.c » d'un fichier, avec leur texte. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...out, [key]: v } : { ...out, ...flatten(v, key) };
  }, {});
}

const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (key: string) => key.replace(PLURAL, '');
/** Les variables {{x}} et les balises <x> d'un texte : elles doivent être les mêmes dans chaque langue. */
const slots = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}|<(\w+)>/g)].map((m) => m[1] ?? `<${m[2]}>`).sort().join(' ');

const FR = flatten(fr);
const EN = flatten(en);
const AR = flatten(ar);

describe('traductions', () => {
  it('l’anglais a exactement les clés du français', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(FR).sort());
  });

  it('l’arabe a toutes les clés du français, avec ses six formes de pluriel', () => {
    const frBases = new Set(Object.keys(FR).map(base));
    const arBases = new Set(Object.keys(AR).map(base));
    expect([...arBases].sort()).toEqual([...frBases].sort());
    for (const key of Object.keys(FR).filter((k) => k.endsWith('_other'))) {
      for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) expect(AR).toHaveProperty([key.replace(/_other$/, `_${form}`)]);
    }
  });

  it('aucun texte vide', () => {
    for (const dict of [FR, EN, AR]) for (const [k, v] of Object.entries(dict)) expect(`${k}: ${v.trim() ? 'ok' : 'vide'}`).toBe(`${k}: ok`);
  });

  it('les variables et les balises sont les mêmes partout', () => {
    for (const [k, v] of Object.entries(FR)) {
      expect(`${k}: ${slots(EN[k])}`).toBe(`${k}: ${slots(v)}`);
      if (k in AR && !PLURAL.test(k)) expect(`${k}: ${slots(AR[k])}`).toBe(`${k}: ${slots(v)}`);
    }
    // En arabe, « une », « deux » et « zéro » s'écrivent souvent en toutes lettres : seul {{count}} peut manquer.
    const withoutCount = (s: string) => slots(s).split(' ').filter((x) => x && x !== 'count').join(' ');
    for (const [k, v] of Object.entries(AR).filter(([key]) => PLURAL.test(key))) {
      expect(`${k}: ${withoutCount(v)}`).toBe(`${k}: ${withoutCount(FR[base(k) + '_other'])}`);
    }
  });
});
