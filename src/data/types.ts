export type Mentor = {
  id: string;
  firstName: string;
  lastName: string;
  headline: string; // « Ingénieur · Informatique »
  study: string; // « M2 · Informatique »
  city: string;
  origin: string; // « Casablanca »
  rating: number;
  sessions: number;
  responseHours: number;
  quote: string;
  specialties: string[];
  languages: ('ar' | 'fr' | 'en' | 'ber')[];
  journey: { year: string; title: string; detail: string }[];
  reviews: { author: string; text: string; rating: number }[];
  availableThisWeek: boolean;
  avatarColor: string;
  /** Le compte du mentor (absent en démo), et sa photo de profil : chemin dans `avatars` et lien temporaire. */
  userId?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

export type Booking = {
  id: string;
  mentorId: string;
  startsAt: string;
  topic: string;
  /** pending = demande envoyée, le mentor n'a pas encore répondu. cancelled = déclinée ou annulée. */
  status: 'pending' | 'confirmed' | 'cancelled' | 'done';
};

export type Group = {
  id: string;
  name: string;
  city: string;
  description: string;
  tags: string[];
  members: number;
  privacy: 'public' | 'private';
  cover: readonly [string, string];
  emoji: string;
  /** Photo de couverture déposée par le créateur (chemin dans le bucket `covers`), et son lien temporaire. */
  coverPath?: string | null;
  coverUrl?: string | null;
  /** Le compte qui l'a créé : lui seul change la photo. */
  createdBy?: string | null;
};

export type Post = {
  id: string;
  groupId: string;
  author: string;
  authorColor: string;
  createdAt: string;
  body: string;
  likes: number;
  /** Avec un compte : tu l'aimes (lu dans la base). Absent en mode démo : le téléphone s'en souvient. */
  liked?: boolean;
  comments: { author: string; body: string; isAuthor?: boolean; avatarPath?: string | null; avatarUrl?: string | null }[];
  /** La photo de l'auteur, si tu la vois (même groupe) : chemin dans `avatars` et lien temporaire. */
  authorAvatarPath?: string | null;
  authorAvatarUrl?: string | null;
  /** Photo de la publication (bucket `post-photos`, lue par les membres) et son lien temporaire. */
  imagePath?: string | null;
  imageUrl?: string | null;
};

/** Un commentaire écrit sur ce téléphone en mode démo. */
export type LocalComment = { id: string; postId: string; author: string; body: string; createdAt: string };

export type CommunityEvent = {
  id: string;
  groupId?: string;
  title: string;
  city: string;
  place: string;
  address: string;
  startsAt: string;
  description: string;
  capacity: number;
  attendees: number;
  price: 'free' | 'paid';
  link?: string;
  cover: readonly [string, string];
  emoji: string;
  coverPath?: string | null;
  coverUrl?: string | null;
  createdBy?: string | null;
};

export type Partner = { id: string; name: string; kind: 'school' | 'bank' | 'insurance'; tagline: string; color: string };
