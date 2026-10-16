/**
 * Lexique anti-jargon — répond au « mur du vocabulaire » identifié en User Research.
 * Chaque terme : une phrase simple + un exemple concret. Pas de jargon dans les définitions.
 */
export type Term = {
  term: string;
  full?: string;
  simple: string;
  example?: string;
  stepId?: string;
};

export const glossary: Term[] = [
  { term: 'ANEF', full: 'Administration numérique pour les étrangers en France', simple: "Le site officiel où tu fais tes démarches de séjour : valider ton visa, renouveler ton titre.", example: 'Tu valides ton VLS-TS sur l’ANEF dans les 3 mois.', stepId: 'validation-visa' },
  { term: 'APL', full: 'Aide personnalisée au logement', simple: "Une aide de la CAF qui paie une partie de ton loyer chaque mois.", example: 'Pour un loyer de 450 €, l’APL peut couvrir une bonne partie.', stepId: 'caf' },
  { term: 'Ameli', simple: "Le site et l'appli de l'Assurance maladie (la Sécu). Tu y suis tes remboursements.", stepId: 'secu' },
  { term: 'Assurance habitation', simple: 'Une assurance qui couvre les dégâts dans ton logement (fuite, incendie). Obligatoire pour louer.', stepId: 'assurance' },
  { term: 'Bail', simple: 'Le contrat de location signé avec ton propriétaire. Il fixe le loyer et la durée.', stepId: 'logement' },
  { term: 'CAF', full: "Caisse d'allocations familiales", simple: "L'organisme qui verse les aides au logement (APL) et d'autres aides sociales.", stepId: 'caf' },
  { term: 'Campus France', simple: "L'agence officielle qui gère ta candidature depuis ton pays et ton entretien avant le visa.", stepId: 'campus-france' },
  { term: 'Carte Vitale', simple: 'Ta carte verte de santé. Tu la donnes chez le médecin pour être remboursé·e automatiquement.', stepId: 'vitale' },
  { term: 'Caution', simple: "Une somme (souvent 1 mois de loyer) que tu verses au propriétaire et qu'il te rend en partant si tout va bien.", example: 'Aussi appelée « dépôt de garantie ».' },
  { term: 'CROUS', simple: "L'organisme public qui gère les résidences étudiantes, les restos U et les bourses.", stepId: 'logement' },
  { term: 'CSS', full: 'Complémentaire santé solidaire', simple: 'Une mutuelle gratuite ou presque, si tes ressources sont faibles.', stepId: 'mutuelle' },
  { term: 'CVEC', full: 'Contribution vie étudiante et de campus', simple: "Une cotisation annuelle (≈ 105 €) à payer avant ton inscription. Elle finance la santé, le sport et la culture sur ton campus.", stepId: 'cvec' },
  { term: 'DELF', simple: 'Un diplôme de français (à vie), alternative au TCF pour prouver ton niveau.', stepId: 'tcf' },
  { term: 'EEF', full: 'Études en France', simple: 'La plateforme en ligne de Campus France où tu remplis ton dossier de candidature.', stepId: 'campus-france' },
  { term: 'Garant', simple: "Une personne (ou Visale) qui s'engage à payer ton loyer si tu ne peux pas.", stepId: 'garant' },
  { term: 'Mutuelle', simple: 'Une assurance santé qui rembourse ce que la Sécu ne rembourse pas.', stepId: 'mutuelle' },
  { term: 'OFII', full: "Office français de l'immigration et de l'intégration", simple: "L'office qui accompagne les étrangers à leur arrivée. Pour les étudiants, la validation du visa se fait maintenant en ligne (ANEF)." },
  { term: 'Préfecture', simple: "L'administration de l'État dans ton département. Elle gère les titres de séjour." },
  { term: 'RIB', full: "Relevé d'identité bancaire", simple: "Un document avec ton IBAN : on te le demande pour te verser de l'argent (CAF, salaire).", stepId: 'banque' },
  { term: 'Sécurité sociale', simple: "L'assurance maladie publique. Elle rembourse une grande partie de tes soins. Gratuite pour les étudiants.", stepId: 'secu' },
  { term: 'TCF', full: 'Test de connaissance du français', simple: "Un test officiel qui mesure ton niveau de français (de A1 à C2).", stepId: 'tcf' },
  { term: 'Timbre fiscal', simple: "Une taxe payée en ligne (timbres.impots.gouv.fr) pour certaines démarches, comme valider ton visa.", stepId: 'validation-visa' },
  { term: 'TLScontact', simple: 'Le prestataire privé où tu déposes ta demande de visa dans certains pays (empreintes, photo).', stepId: 'visa' },
  { term: 'Titre de séjour', simple: "Le document qui prouve que tu as le droit de vivre en France. La 1ʳᵉ année, c'est ton VLS-TS validé." },
  { term: 'Visale', simple: "Un garant gratuit fourni par l'État (Action Logement) pour les étudiants.", stepId: 'garant' },
  { term: 'VLS-TS', full: 'Visa long séjour valant titre de séjour', simple: "Ton visa étudiant : il te permet d'entrer en France et sert de titre de séjour la 1ʳᵉ année, une fois validé.", stepId: 'visa' },
];

export const findTerm = (t: string) =>
  glossary.find((g) => g.term.toLowerCase() === t.toLowerCase());
