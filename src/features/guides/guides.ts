/**
 * Guides pratiques (extraits/adaptés des guides dalili.study).
 * Syntaxe : [[TERME]] dans un texte = mot du lexique, cliquable dans l'app.
 * ⚠️ Contenu indicatif à synchroniser avec les 64 guides vérifiés du site.
 */

export type GuideCategory = 'visa' | 'logement' | 'argent' | 'sante' | 'etudes' | 'vie';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: { title: string; text: string }[] }
  | { type: 'tip'; text: string }
  | { type: 'warning'; text: string };

export type Guide = {
  id: string;
  title: string;
  subtitle: string;
  category: GuideCategory;
  minutes: number;
  emoji: string;
  stepId?: string;
  updated: string;
  blocks: Block[];
};

export const categories: Record<GuideCategory, { label: string; color: string; soft: string }> = {
  visa: { label: 'Visa & séjour', color: '#014DF8', soft: '#E6EEFF' },
  logement: { label: 'Logement', color: '#EA580C', soft: '#FDEDE3' },
  argent: { label: 'Argent & aides', color: '#16A34A', soft: '#E5F6EC' },
  sante: { label: 'Santé', color: '#E5484D', soft: '#FDE8E8' },
  etudes: { label: 'Études', color: '#7A5AF8', soft: '#EFE9FF' },
  vie: { label: 'Vie en France', color: '#0EA5E9', soft: '#E0F4FD' },
};

export const guides: Guide[] = [
  {
    id: 'visa',
    title: 'Visa étudiant : le guide complet',
    subtitle: 'De la demande à la validation en ligne',
    category: 'visa',
    minutes: 6,
    emoji: '🛂',
    stepId: 'visa',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: "Le visa étudiant s'appelle le [[VLS-TS]] : un visa long séjour qui vaut titre de séjour pendant ta 1ʳᵉ année, à condition de le valider en ligne." },
      { type: 'h', text: 'Les 3 grandes étapes' },
      {
        type: 'steps',
        items: [
          { title: 'Valider ton dossier Campus France', text: "Après ton entretien, tu reçois l'accord qui te permet de demander le visa." },
          { title: 'Déposer ta demande', text: 'Chez le prestataire de ton pays ([[TLScontact]] ou VFS) avec tes justificatifs.' },
          { title: 'Valider ton visa en France', text: "Sur l'[[ANEF]], dans les 3 mois après ton arrivée, avec un [[Timbre fiscal]]." },
        ],
      },
      { type: 'h', text: 'Les justificatifs à préparer' },
      {
        type: 'list',
        items: [
          'Passeport valide pendant tout ton séjour',
          'Attestation d’admission / accord Campus France',
          'Justificatif de ressources : au moins 615 € par mois',
          'Attestation de logement pour les premiers mois',
          'Photos d’identité récentes',
        ],
      },
      { type: 'tip', text: 'Prends ton rendez-vous visa dès que tu as ton admission : en juillet et août, les créneaux partent en quelques heures.' },
      { type: 'warning', text: 'Oublier de valider ton visa sur l’ANEF dans les 3 mois te met en situation irrégulière. Mets un rappel dans ton Parcours-quête.' },
    ],
  },
  {
    id: 'logement',
    title: 'Trouver un logement sans se faire arnaquer',
    subtitle: 'CROUS, résidences, colocation, garant',
    category: 'logement',
    minutes: 7,
    emoji: '🏠',
    stepId: 'logement',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: "Le logement est souvent la démarche la plus stressante. Bonne nouvelle : il existe des solutions pensées pour les étudiants internationaux." },
      { type: 'h', text: 'Les options, de la moins chère à la plus chère' },
      {
        type: 'list',
        items: [
          'Résidence [[CROUS]] : le plus abordable, demande en ligne sur trouverunlogement.lescrous.fr',
          'Chambre chez l’habitant : souvent flexible et rassurant pour commencer',
          'Colocation : idéal pour le budget et pour ne pas être seul·e',
          'Résidence étudiante privée : plus chère, mais les dossiers sont simples',
        ],
      },
      { type: 'h', text: 'Le garant, sans connaître personne en France' },
      { type: 'p', text: '[[Visale]] est un [[Garant]] gratuit fourni par l’État. Ton dossier devient aussi solide que celui d’un étudiant français.' },
      { type: 'warning', text: 'Ne paie JAMAIS de [[Caution]] ou de loyer par mandat cash ou transfert avant d’avoir signé un [[Bail]]. C’est l’arnaque n°1.' },
      { type: 'tip', text: "Une fois installé·e, fais ta demande d'[[APL]] à la [[CAF]] tout de suite : l'aide n'est pas rétroactive." },
    ],
  },
  {
    id: 'caf',
    title: 'APL : combien et comment ?',
    subtitle: 'Ta demande CAF pas à pas',
    category: 'argent',
    minutes: 5,
    emoji: '💶',
    stepId: 'caf',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: "L'[[APL]] est une aide de la [[CAF]] qui paie une partie de ton loyer. Les étudiants internationaux y ont droit avec un titre de séjour valide." },
      {
        type: 'steps',
        items: [
          { title: 'Simule', text: 'Sur caf.fr, rubrique « Simuler mes droits » : 5 minutes suffisent.' },
          { title: 'Fais la demande', text: 'Avec ton bail, ton [[RIB]] français et ton [[VLS-TS]] validé.' },
          { title: 'Complète', text: "Envoie l'attestation de loyer signée par ton propriétaire et ton acte de naissance." },
        ],
      },
      { type: 'tip', text: "L'aide démarre le mois suivant ton entrée dans le logement. Chaque mois de retard est perdu." },
    ],
  },
  {
    id: 'sante',
    title: 'Se soigner en France',
    subtitle: 'Sécu, carte Vitale, mutuelle',
    category: 'sante',
    minutes: 5,
    emoji: '🩺',
    stepId: 'secu',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: 'En France, la [[Sécurité sociale]] rembourse une grande partie de tes soins, et c’est gratuit pour les étudiants.' },
      {
        type: 'steps',
        items: [
          { title: 'Inscris-toi', text: 'Sur etudiant-etranger.ameli.fr dès ton inscription à l’école.' },
          { title: 'Commande ta carte Vitale', text: 'Depuis ton compte [[Ameli]] une fois ton numéro définitif reçu.' },
          { title: 'Ajoute une mutuelle', text: 'Ou la [[CSS]] si tes ressources sont faibles.' },
        ],
      },
      { type: 'h', text: 'En cas d’urgence' },
      { type: 'list', items: ['15 : SAMU (urgence médicale)', '112 : numéro d’urgence européen', 'Pharmacie de garde : 3237'] },
    ],
  },
  {
    id: 'cvec',
    title: 'La CVEC expliquée en 1 minute',
    subtitle: 'Qui paie, combien, comment',
    category: 'etudes',
    minutes: 2,
    emoji: '🧾',
    stepId: 'cvec',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: "La [[CVEC]] est une contribution annuelle obligatoire pour s'inscrire dans l'enseignement supérieur. Elle finance la vie étudiante : santé, sport, culture." },
      { type: 'list', items: ['Montant : ≈ 105 € (indexé chaque année)', 'Paiement en ligne sur cvec.etudiant.gouv.fr', 'Exonération pour les boursiers'] },
      { type: 'tip', text: "Garde l'attestation en PDF dans tes documents : ton école te la demandera." },
    ],
  },
  {
    id: 'banque',
    title: 'Ouvrir un compte bancaire',
    subtitle: 'Banque en ligne ou en agence ?',
    category: 'argent',
    minutes: 4,
    emoji: '🏦',
    stepId: 'banque',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: 'Un compte français te donne un [[RIB]] : indispensable pour la CAF, le loyer, ton forfait et un job.' },
      { type: 'list', items: ['Passeport + visa', 'Justificatif de domicile (bail, attestation)', 'Certificat de scolarité'] },
      { type: 'tip', text: "Si une banque refuse, tu as un « droit au compte » : la Banque de France peut désigner une banque obligée de t'ouvrir un compte." },
    ],
  },
  {
    id: 'campus-france',
    title: 'Réussir sa procédure Campus France',
    subtitle: 'Dossier, entretien, calendrier',
    category: 'etudes',
    minutes: 6,
    emoji: '🎓',
    stepId: 'campus-france',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: '[[Campus France]] centralise ta candidature via la plateforme [[EEF]]. Le calendrier commence souvent dès l’automne pour une rentrée en septembre.' },
      {
        type: 'steps',
        items: [
          { title: 'Constitue ton dossier', text: 'Diplômes, relevés, [[TCF]], lettre de motivation par formation.' },
          { title: 'Passe l’entretien', text: 'Explique ton projet clairement : pourquoi cette formation, cette ville, et après ?' },
          { title: 'Accepte une offre', text: 'Puis passe à la demande de visa.' },
        ],
      },
      { type: 'tip', text: "Demande à un mentor DALILI de relire ta lettre de motivation : c'est gratuit et ça change tout." },
    ],
  },
  {
    id: 'tcf',
    title: 'TCF ou DELF : lequel choisir ?',
    subtitle: 'Prouver ton niveau de français',
    category: 'etudes',
    minutes: 3,
    emoji: '🗣️',
    stepId: 'tcf',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: 'Le [[TCF]] donne un niveau valable 2 ans. Le [[DELF]] est un diplôme valable à vie. Les deux sont acceptés par la plupart des formations.' },
      { type: 'tip', text: 'Pour une L1, le niveau B2 est souvent attendu. Vérifie l’exigence de chaque formation.' },
    ],
  },
  {
    id: 'arrivee',
    title: 'Tes 7 premiers jours en France',
    subtitle: 'La checklist pour démarrer serein·e',
    category: 'vie',
    minutes: 4,
    emoji: '✈️',
    stepId: 'arrivee',
    updated: '2026-09',
    blocks: [
      {
        type: 'list',
        items: [
          'Jour 1 : récupère tes clés, achète une carte SIM',
          'Jour 2 : abonnement transport, courses de base',
          'Jour 3 : ouvre ton compte bancaire',
          'Jour 4 : inscription administrative à l’école',
          'Jour 5 : inscription à la Sécu et demande CAF',
          'Jour 6-7 : rejoins le groupe DALILI de ta ville',
        ],
      },
      { type: 'tip', text: 'Prévois environ 300 € d’avance pour les premiers jours, le temps que ta banque soit ouverte.' },
    ],
  },
  {
    id: 'choisir-ecole',
    title: 'Université ou école privée ?',
    subtitle: 'Faire le bon choix pour ton projet',
    category: 'etudes',
    minutes: 5,
    emoji: '🏛️',
    stepId: 'ecole',
    updated: '2026-09',
    blocks: [
      { type: 'p', text: "Les universités publiques sont abordables et reconnues. Les écoles privées sont plus chères, mais certaines offrent un accompagnement fort et l'alternance." },
      { type: 'warning', text: "Vérifie toujours qu'une école privée délivre un diplôme reconnu par l'État (visé, RNCP ou grade). Toutes les écoles partenaires DALILI le sont." },
    ],
  },
];

export const guideById = (id: string) => guides.find((g) => g.id === id);
