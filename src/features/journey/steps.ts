import type { Profile } from '@/features/profile/types';

/**
 * Catalogue des démarches officielles du Parcours-quête.
 * ⚠️ Contenu à faire valider par l'équipe (sources officielles : Campus France, ANEF, CAF, Ameli, CROUS…).
 * Les montants sont indicatifs et indexés chaque année — toujours afficher « ≈ ».
 */

export type Phase = 'before' | 'arrival' | 'first_months';

export type Step = {
  id: string;
  title: string;
  tags: string[];
  phase: Phase;
  /** Échéance relative à la date d'arrivée (en jours, négatif = avant). */
  offsetDays: number;
  window: string;
  icon: StepIcon;
  budget: string;
  when: string;
  oneLiner: string;
  why: string;
  /** Les 3 actions concrètes, dans l'ordre (utilisées par la fiche et par Dalili IA). */
  howTo: { title: string; detail: string }[];
  needs?: string[];
  action: { label: string; url?: string };
  /** Termes du lexique cités dans la fiche. */
  terms?: string[];
  guideId?: string;
  /** Étape pertinente pour ce profil ? (défaut : oui) */
  appliesTo?: (p: Profile) => boolean;
  /** Étape déjà faite d'après les réponses d'onboarding. */
  autoDone?: (p: Profile) => boolean;
};

export type StepIcon =
  | 'languages'
  | 'graduation'
  | 'file'
  | 'passport'
  | 'home'
  | 'handshake'
  | 'receipt'
  | 'plane'
  | 'shield'
  | 'badge'
  | 'bank'
  | 'phone'
  | 'health'
  | 'wallet'
  | 'card'
  | 'bus'
  | 'heart';

const campusDone = (p: Profile) => p.campusStatus === 'accepted' || p.campusStatus === 'enrolled';

export const phaseMeta: Record<Phase, { title: string; subtitle: (p: Profile) => string }> = {
  before: { title: 'Avant le départ', subtitle: (p) => `depuis ${p.originCity || 'chez toi'}` },
  arrival: { title: "À l'arrivée", subtitle: () => 'tes 2 premières semaines' },
  first_months: { title: 'Tes premiers mois', subtitle: () => 'installe-toi' },
};

export const steps: Step[] = [
  {
    id: 'tcf',
    title: 'Prouve ton niveau de français',
    tags: ['TCF'],
    phase: 'before',
    offsetDays: -300,
    window: 'Avant la candidature',
    icon: 'languages',
    budget: '≈ 110 €',
    when: 'Avant la candidature',
    oneLiner: "Le TCF est un test officiel de français. C'est ta preuve que tu peux suivre des cours en France.",
    why: "Presque toutes les écoles et Campus France te le demandent. Sans lui, ton dossier n'avance pas.",
    howTo: [
      { title: 'Choisis ta session', detail: 'Inscris-toi au TCF (ou DELF/DALF) dans un centre agréé de ton pays.' },
      { title: 'Entraîne-toi', detail: 'Fais 2 ou 3 tests blancs : compréhension, expression écrite et orale.' },
      { title: 'Garde ton attestation', detail: 'Tu la joindras à ton dossier Campus France. Elle est valable 2 ans.' },
    ],
    needs: ['Passeport ou CIN', 'Photo d’identité', 'Frais d’inscription'],
    action: { label: 'Trouver un centre TCF', url: 'https://www.france-education-international.fr/test/tcf-tout-public' },
    terms: ['TCF', 'DELF'],
    guideId: 'tcf',
    autoDone: (p) => campusDone(p) || p.situation === 'in_france',
  },
  {
    id: 'ecole',
    title: 'Choisis ta formation et ton école',
    tags: ['ÉCOLE'],
    phase: 'before',
    offsetDays: -270,
    window: '8 à 10 mois avant',
    icon: 'graduation',
    budget: 'Gratuit',
    when: '8 à 10 mois avant',
    oneLiner: "C'est le moment de choisir où et quoi étudier : université publique ou école privée reconnue par l'État.",
    why: 'Ton choix de formation décide de ta ville, de ton budget et de toutes les démarches qui suivent.',
    howTo: [
      { title: 'Liste 3 à 7 formations', detail: 'Compare programmes, villes et frais de scolarité.' },
      { title: 'Vérifie la reconnaissance', detail: "Pour une école privée, vérifie qu'elle est reconnue par l'État." },
      { title: 'Parle à un mentor', detail: 'Un étudiant déjà sur place te dit la vérité sur la formation.' },
    ],
    action: { label: 'Voir les écoles partenaires' },
    guideId: 'choisir-ecole',
    autoDone: (p) => campusDone(p) || p.situation === 'in_france',
  },
  {
    id: 'campus-france',
    title: 'Ton dossier officiel de candidature',
    tags: ['CAMPUS FRANCE'],
    phase: 'before',
    offsetDays: -210,
    window: '6 à 8 mois avant',
    icon: 'file',
    budget: 'Selon ton pays',
    when: '6 à 8 mois avant',
    oneLiner: "Campus France, c'est la plateforme officielle par laquelle passe ta candidature aux établissements français.",
    why: 'Sans dossier Campus France validé, pas de visa étudiant. C’est la porte d’entrée de tout ton projet.',
    howTo: [
      { title: 'Crée ton compte', detail: 'Sur la plateforme « Études en France » de ton pays.' },
      { title: 'Remplis et paie le dossier', detail: 'Diplômes, relevés de notes, TCF, lettre de motivation.' },
      { title: "Passe l'entretien", detail: "Campus France t'appelle pour un entretien pédagogique. Prépare ton projet." },
    ],
    needs: ['Diplômes & relevés de notes', 'Attestation TCF', 'Lettre de motivation', 'CV'],
    action: { label: 'Ouvrir Études en France', url: 'https://pastel.diplomatie.gouv.fr/etudesenfrance/' },
    terms: ['Campus France', 'EEF'],
    guideId: 'campus-france',
    autoDone: (p) => campusDone(p) || p.situation === 'in_france',
  },
  {
    id: 'visa',
    title: "Ton autorisation d'entrer en France",
    tags: ['VISA', 'VLS-TS'],
    phase: 'before',
    offsetDays: -28,
    window: '2-3 mois avant',
    icon: 'passport',
    budget: '≈ 50 € + frais prestataire',
    when: 'Dès ton admission',
    oneLiner:
      "Le visa étudiant (VLS-TS) est un autocollant dans ton passeport qui te permet d'entrer en France ET qui sert de titre de séjour la 1ʳᵉ année.",
    why: "Sans lui, tu ne peux ni prendre l'avion, ni t'inscrire, ni ouvrir un compte. C'est LA pièce maîtresse.",
    howTo: [
      { title: 'Prends rendez-vous', detail: 'Chez le prestataire visa de ton pays (TLScontact ou VFS).' },
      { title: 'Prépare tes justificatifs', detail: 'Admission, logement, ressources (au moins 615 €/mois), assurance.' },
      { title: 'Dépose et suis ton dossier', detail: 'Empreintes et photo sur place, puis suivi en ligne.' },
    ],
    needs: [
      'Passeport valide',
      'Attestation Campus France',
      'Justificatif de ressources (≥ 615 €/mois)',
      'Attestation de logement',
    ],
    action: { label: 'Préparer mon rendez-vous visa', url: 'https://france-visas.gouv.fr' },
    terms: ['VLS-TS', 'TLScontact'],
    guideId: 'visa',
    autoDone: (p) => p.situation === 'in_france',
  },
  {
    id: 'logement',
    title: 'Trouve ton premier toit',
    tags: ['LOGEMENT'],
    phase: 'before',
    offsetDays: -18,
    window: '2-3 mois avant',
    icon: 'home',
    budget: 'De 250 € à 900 €/mois',
    when: 'Dès ton admission',
    oneLiner: 'Résidence CROUS, résidence privée ou colocation : il te faut une adresse avant d’arriver.',
    why: "Le logement est demandé pour le visa, la banque et la CAF. Et c'est ce qui part le plus vite en septembre.",
    howTo: [
      { title: 'Demande un logement CROUS', detail: 'Les résidences étudiantes publiques sont les moins chères.' },
      { title: 'Élargis ta recherche', detail: 'Résidences privées, colocation, chambre chez l’habitant.' },
      { title: 'Méfie-toi des arnaques', detail: 'Ne paie jamais avant d’avoir visité ou signé un bail officiel.' },
    ],
    action: { label: 'Chercher un logement CROUS', url: 'https://trouverunlogement.lescrous.fr' },
    terms: ['CROUS', 'Bail'],
    guideId: 'logement',
    autoDone: (p) => p.housing === 'found',
  },
  {
    id: 'garant',
    title: 'La personne qui se porte caution',
    tags: ['GARANT'],
    phase: 'before',
    offsetDays: -15,
    window: 'Avant le bail',
    icon: 'handshake',
    budget: 'Gratuit avec Visale',
    when: 'Avant de signer le bail',
    oneLiner: "Le garant s'engage à payer ton loyer si tu ne peux pas. Visale, c'est un garant gratuit fourni par l'État.",
    why: 'Sans garant, la plupart des propriétaires refusent ton dossier.',
    howTo: [
      { title: 'Crée ton compte Visale', detail: 'Gratuit pour les étudiants, même sans garant en France.' },
      { title: 'Obtiens ton visa Visale', detail: 'Un certificat à transmettre au propriétaire.' },
      { title: 'Joins-le au dossier', detail: 'Avec ta pièce d’identité et ton admission.' },
    ],
    action: { label: 'Demander Visale', url: 'https://www.visale.fr' },
    terms: ['Visale', 'Garant'],
    guideId: 'logement',
    autoDone: (p) => p.housing === 'found',
  },
  {
    id: 'cvec',
    title: 'Ta cotisation vie étudiante',
    tags: ['CVEC'],
    phase: 'before',
    offsetDays: -13,
    window: "Avant l'inscription",
    icon: 'receipt',
    budget: '≈ 105 €',
    when: "Avant l'inscription administrative",
    oneLiner: "La CVEC est une contribution annuelle obligatoire qui finance la vie étudiante (santé, sport, culture).",
    why: "Ton école te demande l'attestation CVEC pour finaliser ton inscription. Les boursiers en sont exonérés.",
    howTo: [
      { title: 'Connecte-toi sur MesServices', detail: 'Avec ton compte étudiant.' },
      { title: 'Paie ou demande l’exonération', detail: 'Par carte bancaire, ou exonération si tu es boursier.' },
      { title: 'Télécharge l’attestation', detail: 'Tu la transmets à ton établissement.' },
    ],
    action: { label: 'Payer la CVEC', url: 'https://cvec.etudiant.gouv.fr' },
    terms: ['CVEC'],
    guideId: 'cvec',
    autoDone: (p) => p.campusStatus === 'enrolled',
  },
  {
    id: 'arrivee',
    title: 'Ton arrivée et tes premiers jours',
    tags: ['ARRIVÉE'],
    phase: 'arrival',
    offsetDays: 0,
    window: 'Le jour J',
    icon: 'plane',
    budget: 'Prévois ≈ 300 € d’avance',
    when: 'Le jour J',
    oneLiner: 'Ton premier jour en France : récupérer tes clés, t’orienter, et souffler.',
    why: 'Bien préparer ton arrivée évite les nuits d’hôtel imprévues et le stress des premiers jours.',
    howTo: [
      { title: 'Prépare ton trajet', detail: "De l'aéroport à ton logement : transports, horaires, adresse hors-ligne." },
      { title: 'Garde tes documents sur toi', detail: 'Passeport, visa, admission, bail — en version papier ET numérique.' },
      { title: 'Rejoins ta communauté', detail: 'Le groupe DALILI de ta ville pour ne pas rester seul·e.' },
    ],
    action: { label: 'Voir la communauté de ma ville' },
    guideId: 'arrivee',
  },
  {
    id: 'assurance',
    title: 'Assure ton logement',
    tags: ['ASSURANCE HABITATION'],
    phase: 'arrival',
    offsetDays: -3,
    window: 'Avant les clés',
    icon: 'shield',
    budget: '≈ 5 à 10 €/mois',
    when: 'Avant de récupérer les clés',
    oneLiner: "L'assurance habitation couvre les dégâts (eau, incendie) dans ton logement.",
    why: 'Elle est obligatoire pour tout locataire : sans attestation, pas de clés.',
    howTo: [
      { title: 'Compare 2 ou 3 offres', detail: 'Banques et assureurs proposent des offres étudiantes.' },
      { title: 'Souscris en ligne', detail: 'Avec ton adresse et la surface du logement.' },
      { title: "Envoie l'attestation", detail: 'À ton propriétaire ou à ta résidence.' },
    ],
    action: { label: 'Comparer les assurances' },
    terms: ['Assurance habitation'],
  },
  {
    id: 'sim',
    title: 'Ta ligne téléphone française',
    tags: ['SIM'],
    phase: 'arrival',
    offsetDays: 3,
    window: '1ʳᵉ semaine',
    icon: 'phone',
    budget: '≈ 5 à 15 €/mois',
    when: '1ʳᵉ semaine',
    oneLiner: 'Un numéro français pour la banque, les démarches et ta vie quotidienne.',
    why: 'Beaucoup de services (banque, Ameli, CAF) envoient des codes par SMS à un numéro français.',
    howTo: [
      { title: 'Choisis un forfait sans engagement', detail: 'Les forfaits en ligne sont les moins chers.' },
      { title: 'Commande ta SIM ou eSIM', detail: 'Avec ton passeport.' },
      { title: 'Mets à jour tes comptes', detail: 'Banque, école, Ameli : donne ton nouveau numéro.' },
    ],
    action: { label: 'Comparer les forfaits' },
  },
  {
    id: 'transport',
    title: 'Ton abonnement transport',
    tags: ['TRANSPORT'],
    phase: 'arrival',
    offsetDays: 5,
    window: '1ʳᵉ semaine',
    icon: 'bus',
    budget: 'Tarif étudiant selon ta ville',
    when: '1ʳᵉ semaine',
    oneLiner: 'Bus, tram, métro : un abonnement jeune te fait économiser beaucoup.',
    why: 'Tu vas te déplacer tous les jours. Le tarif étudiant est souvent divisé par deux.',
    howTo: [
      { title: 'Trouve le tarif jeune', detail: 'Sur le site du réseau de transport de ta ville.' },
      { title: 'Prépare ta photo et ton certificat', detail: 'Le certificat de scolarité est souvent demandé.' },
      { title: 'Souscris en ligne', detail: 'Et active ta carte.' },
    ],
    action: { label: 'Voir les transports de ma ville' },
  },
  {
    id: 'banque',
    title: 'Ouvre ton compte bancaire français',
    tags: ['BANQUE', 'RIB'],
    phase: 'arrival',
    offsetDays: 6,
    window: '1ʳᵉ semaine',
    icon: 'bank',
    budget: 'Souvent gratuit pour étudiants',
    when: '1ʳᵉ semaine',
    oneLiner: 'Un compte français et son RIB : indispensables pour la CAF, le loyer et ton téléphone.',
    why: 'La CAF ne verse les aides que sur un compte français. Sans RIB, tout se bloque.',
    howTo: [
      { title: 'Compare les offres étudiantes', detail: 'Banques en ligne ou en agence, souvent gratuites.' },
      { title: 'Rassemble tes papiers', detail: 'Passeport + visa, justificatif de domicile, certificat de scolarité.' },
      { title: 'Récupère ton RIB', detail: 'Tu le donneras à la CAF, à ton école et à ton propriétaire.' },
    ],
    needs: ['Passeport + visa', 'Justificatif de domicile', 'Certificat de scolarité'],
    action: { label: 'Voir les banques partenaires' },
    terms: ['RIB'],
    guideId: 'banque',
  },
  {
    id: 'validation-visa',
    title: 'Active ton visa en ligne',
    tags: ['VALIDATION VLS-TS'],
    phase: 'arrival',
    offsetDays: 29,
    window: 'Dans les 3 mois',
    icon: 'badge',
    budget: '≈ 50 € (timbre fiscal)',
    when: 'Dans les 3 mois après ton arrivée',
    oneLiner: 'Tu dois valider ton VLS-TS en ligne pour qu’il devienne ton titre de séjour.',
    why: 'Sans validation, tu es en situation irrégulière après 3 mois, même avec un visa dans le passeport.',
    howTo: [
      { title: 'Connecte-toi à l’ANEF', detail: 'Le site officiel de l’administration des étrangers.' },
      { title: 'Saisis ton visa et ton adresse', detail: 'Et ta date d’entrée en France.' },
      { title: 'Paie le timbre fiscal', detail: 'En ligne, puis garde la confirmation.' },
    ],
    action: { label: 'Valider sur l’ANEF', url: 'https://administration-etrangers-en-france.interieur.gouv.fr' },
    terms: ['VLS-TS', 'ANEF', 'Timbre fiscal'],
    guideId: 'visa',
  },
  {
    id: 'secu',
    title: 'Ton inscription à la santé française',
    tags: ['SÉCU', 'AMELI'],
    phase: 'first_months',
    offsetDays: 13,
    window: "Dès l'inscription",
    icon: 'health',
    budget: 'Gratuit',
    when: 'Dès ton inscription à l’école',
    oneLiner: "La Sécurité sociale rembourse une grande partie de tes frais de santé. Pour les étudiants, c'est gratuit.",
    why: "Sans elle, chaque consultation est à ta charge à 100 %. Elle est aussi nécessaire pour la carte Vitale.",
    howTo: [
      { title: 'Inscris-toi sur le site', detail: 'Sur etudiant-etranger.ameli.fr.' },
      { title: 'Téléverse tes justificatifs', detail: "Visa, attestation d'école, acte de naissance." },
      { title: 'Obtiens ton numéro provisoire', detail: 'Pour être remboursé·e en attendant le définitif.' },
    ],
    needs: ['Passeport + visa', 'Certificat de scolarité', 'Acte de naissance (traduit si besoin)', 'RIB'],
    action: { label: "S'inscrire sur Ameli", url: 'https://etudiant-etranger.ameli.fr' },
    terms: ['Ameli', 'Sécurité sociale'],
    guideId: 'sante',
  },
  {
    id: 'caf',
    title: 'Ton aide au loyer',
    tags: ['CAF', 'APL'],
    phase: 'first_months',
    offsetDays: 18,
    window: "Dès l'inscription",
    icon: 'wallet',
    budget: 'Gratuit — et ça te rapporte',
    when: 'Dès ton entrée dans le logement',
    oneLiner: "La CAF peut payer une partie de ton loyer chaque mois : c'est l'APL.",
    why: "L'aide n'est pas rétroactive : chaque mois de retard est un mois perdu. Fais-la dès ton arrivée.",
    howTo: [
      { title: 'Simule ton aide', detail: 'Sur caf.fr, en 5 minutes.' },
      { title: 'Fais ta demande en ligne', detail: 'Avec ton bail, ton RIB et ton titre de séjour validé.' },
      { title: 'Envoie les pièces manquantes', detail: 'Acte de naissance, attestation de loyer signée par le propriétaire.' },
    ],
    needs: ['Bail ou attestation de logement', 'RIB français', 'Visa validé', 'Acte de naissance'],
    action: { label: 'Faire ma demande CAF', url: 'https://www.caf.fr' },
    terms: ['CAF', 'APL'],
    guideId: 'caf',
  },
  {
    id: 'mutuelle',
    title: 'Ta complémentaire santé',
    tags: ['MUTUELLE'],
    phase: 'first_months',
    offsetDays: 30,
    window: '1ᵉʳ mois',
    icon: 'heart',
    budget: 'Gratuite avec la CSS (sous conditions)',
    when: '1ᵉʳ mois',
    oneLiner: "La mutuelle rembourse ce que la Sécu ne couvre pas (dentiste, lunettes, hôpital).",
    why: "Une hospitalisation sans mutuelle peut coûter très cher. La CSS peut être gratuite selon tes ressources.",
    howTo: [
      { title: 'Teste ton droit à la CSS', detail: 'La Complémentaire santé solidaire, sur ameli.fr.' },
      { title: 'Sinon compare les mutuelles étudiantes', detail: 'À partir de quelques euros par mois.' },
      { title: 'Transmets ton attestation', detail: 'À ton médecin et à ta pharmacie.' },
    ],
    action: { label: 'Tester mes droits CSS', url: 'https://www.ameli.fr' },
    terms: ['CSS', 'Mutuelle'],
    guideId: 'sante',
  },
  {
    id: 'vitale',
    title: 'Ta carte de remboursement santé',
    tags: ['CARTE VITALE'],
    phase: 'first_months',
    offsetDays: 43,
    window: '2-3 mois après',
    icon: 'card',
    budget: 'Gratuit',
    when: 'Après ton numéro définitif',
    oneLiner: 'La carte Vitale, c’est ta carte de santé : tu la présentes chez le médecin pour être remboursé·e plus vite.',
    why: 'Sans elle, tu avances les frais et tu attends des semaines pour être remboursé·e.',
    howTo: [
      { title: 'Crée ton compte Ameli', detail: 'Avec ton numéro de sécurité sociale définitif.' },
      { title: "Télécharge une photo d'identité", detail: "Directement depuis l'application Ameli." },
      { title: 'Reçois ta carte par courrier', detail: 'Livrée chez toi sous 2 à 3 semaines.' },
    ],
    action: { label: 'Commander ma carte Vitale', url: 'https://www.ameli.fr' },
    terms: ['Carte Vitale', 'Ameli'],
    guideId: 'sante',
  },
];

export const stepById = (id: string) => steps.find((s) => s.id === id);
