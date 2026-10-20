/**
 * Cerveau local de Dalili IA (MODE DÉMO / hors-ligne).
 * Cherche la démarche ou le terme concerné et répond en actions simples.
 * En production, l'Edge Function `dalili-ia` (Claude) prend le relais.
 */
import { snapshot } from '@/data/content';
import { snapshotGlossary } from '@/features/guides/glossary';
import { snapshotSteps, type Step } from '@/features/journey/steps';
import type { Profile } from '@/features/profile/types';

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: { title: string; detail: string }[];
  stepId?: string;
  followUp?: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const KEYWORDS: Record<string, string[]> = {
  visa: ['visa', 'vls', 'tls', 'vfs', 'consulat'],
  'validation-visa': ['valider', 'validation', 'anef', 'timbre', 'titre de sejour'],
  caf: ['caf', 'apl', 'aide au logement', 'aide logement', 'loyer'],
  secu: ['secu', 'securite sociale', 'ameli', 'assurance maladie'],
  vitale: ['vitale', 'carte vitale'],
  cvec: ['cvec', 'cotisation'],
  logement: ['logement', 'crous', 'appart', 'colocation', 'coloc', 'residence'],
  garant: ['garant', 'visale', 'caution'],
  banque: ['banque', 'compte bancaire', 'rib', 'iban'],
  'campus-france': ['campus france', 'eef', 'candidature', 'entretien'],
  tcf: ['tcf', 'delf', 'niveau de francais', 'test de francais'],
  mutuelle: ['mutuelle', 'css', 'complementaire'],
  sim: ['sim', 'forfait', 'telephone', 'numero'],
  transport: ['transport', 'navigo', 'metro', 'bus', 'tram'],
  assurance: ['assurance habitation', 'assurer'],
  arrivee: ['arrivee', 'premier jour', 'aeroport', 'atterris'],
  ressources: ['compte bloque', 'ressources', 'justificatif de ressources', '877'],
  documents: ['apostille', 'legalis', 'traduction', 'traduire'],
  bourses: ['bourse', 'boursier'],
  medecin: ['medecin', 'docteur', 'generaliste'],
  travail: ['travail', 'travailler', 'job', 'heures'],
  renouvellement: ['renouvel', 'titre de sejour expire', 'prolonger'],
};

function findStep(q: string, steps: Step[]): Step | undefined {
  const n = norm(q);
  let best: { step: Step; score: number } | undefined;
  for (const s of steps) {
    const kws = KEYWORDS[s.id] ?? [];
    const score = kws.reduce((acc, k) => acc + (n.includes(k) ? k.length : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { step: s, score };
  }
  return best?.step;
}

export function greeting(p: Profile, daysToArrival: number) {
  const name = p.firstName || '';
  const city = p.destinationCity;
  const when = daysToArrival > 0 ? ` dans ${daysToArrival} jours` : daysToArrival === 0 ? " aujourd'hui" : '';
  return `Bonjour ${name}. ${city ? `Tu arrives à ${city}${when}. ` : ''}Je suis là pour tout : visa, logement, banque, transport… Pose ta question comme tu la dirais à un ami.`;
}

export function localAnswer(q: string, p: Profile): Omit<AiMessage, 'id' | 'role'> {
  const n = norm(q);
  const step = findStep(q, snapshotSteps(p));
  if (step) {
    const isWhat = /c.?est quoi|ca veut dire|definition|signifie/.test(n);
    if (isWhat) {
      return {
        content: `${step.oneLiner}\n\n${step.why}`,
        stepId: step.id,
        followUp: `Comment je fais pour « ${step.title} » ?`,
      };
    }
    return {
      content: `Bonne question${p.firstName ? `, ${p.firstName}` : ''} ! ${step.why} Je te décompose ça en 3 étapes simples. Tu peux commencer dès maintenant 👇`,
      steps: step.howTo,
      stepId: step.id,
      followUp: step.terms?.[0] ? `C'est quoi « ${step.terms[0]} » ?` : undefined,
    };
  }
  const term = snapshotGlossary().find((g) => n.includes(norm(g.term)));
  if (term) {
    return { content: `**${term.term}**${term.full ? ` (${term.full})` : ''} : ${term.simple}${term.example ? `\n\n💡 ${term.example}` : ''}`, stepId: term.stepId };
  }
  if (/seul|isole|solitude|amis|rencontr/.test(n)) {
    return {
      content: "Tu n'es pas seul·e : 74 % des étudiants ressentent la même chose en arrivant. Rejoins le groupe DALILI de ta ville et inscris-toi à un événement cette semaine — c'est le moyen le plus rapide de rencontrer du monde.",
      followUp: 'Quels événements près de chez moi ?',
    };
  }
  if (/budget|argent|combien|cout|cher/.test(n)) {
    return {
      content: `Pour ${p.destinationCity ?? 'ta ville'}, compte le loyer, la nourriture, le transport et le téléphone. Pour le visa, il faut justifier au moins ${snapshot.figures.verified.compteBloqueMensuel?.display ?? 'le montant officiel'} (source : ${snapshot.figures.verified.compteBloqueMensuel?.current.sourceLabel ?? 'service-public.fr'}). Ouvre le simulateur de budget : il fait le même calcul que dalili.study.`,
      followUp: 'Ai-je droit à l’APL ?',
    };
  }
  return {
    content:
      "Je n'ai pas encore la réponse parfaite à ça. Deux options : reformule avec un mot-clé (visa, CAF, logement, banque…), ou demande à un mentor qui est passé par là — c'est gratuit.",
    followUp: 'Comment trouver un logement ?',
  };
}

export function suggestions(p: Profile, currentStepTitle?: string) {
  const out: string[] = [];
  if (currentStepTitle) out.push(`Aide-moi pour « ${currentStepTitle} »`);
  if (p.concerns.includes('housing')) out.push('Comment trouver un logement CROUS ?');
  if (p.concerns.includes('money')) out.push('Comment demander les APL ?');
  if (p.concerns.includes('visa')) out.push('Comment valider mon visa en France ?');
  if (p.concerns.includes('loneliness')) out.push('Je me sens seul, comment rencontrer du monde ?');
  out.push('Comment demander la Carte Vitale ?', "C'est quoi la CVEC ?");
  return [...new Set(out)].slice(0, 4);
}
