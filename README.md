# DALILI — l'application

> « L'application qui guide chaque étudiant vers sa réussite en France. »

Application mobile (iOS · Android · web) pour les étudiants du Maghreb qui viennent étudier en France : Parcours-quête personnalisé, fiches anti-jargon, mentors, communauté par ville, Dalili IA, guides et outils.

**Stack** : Expo SDK 58 · React Native · TypeScript · Expo Router · Reanimated 4 · Supabase · Claude (IA).

---

## 1. Démarrer en 2 minutes (mode démo)

L'app tourne **sans aucune configuration** : sans clés Supabase, elle passe en *mode démo* (données locales, n'importe quel code OTP à 6 chiffres fonctionne).

```bash
# Place le dossier dalili-app sur ton Bureau, puis :
cd ~/Desktop/dalili-app          # Mac / Linux
# cd %USERPROFILE%\Desktop\dalili-app   (Windows)

npm install
npm start
```

- **Sur ton téléphone** : installe l'app *Expo Go*, scanne le QR code affiché dans le terminal.
- **Sur le navigateur** : appuie sur `w` dans le terminal.
- **Simulateur** : `i` (iOS, Mac uniquement) ou `a` (Android).

> Prérequis : Node.js 20+ et Git.

## 2. Mettre le code sur GitHub (à faire tout de suite !)

Le projet contient déjà un historique Git. Crée un dépôt **vide** sur GitHub (sans README), puis :

```bash
git remote add origin https://github.com/<ton-compte>/dalili-app.git
git push -u origin main
```

Ensuite, après chaque session de travail : `git add -A && git commit -m "…" && git push`.

## 3. Brancher Supabase (comptes réels, données partagées)

1. Crée un projet sur [supabase.com](https://supabase.com) (région Europe).
2. **Base de données** — au choix :
   - *Simple* : Dashboard → SQL Editor → colle le contenu de `supabase/migrations/20261017000000_init.sql`, exécute, puis colle `supabase/seed.sql`, exécute.
   - *CLI* : `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, puis exécute `supabase/seed.sql` dans le SQL Editor.
3. **Clés** : copie `.env.example` en `.env` et remplis `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API). Relance `npm start`.
4. **Email avec code à 6 chiffres** : Dashboard → Authentication → Email Templates → *Confirm signup* → remplace le lien par `{{ .Token }}` (ex. « Ton code DALILI : {{ .Token }} »).
5. **Google / Apple** (optionnel) : Authentication → Providers. Ajoute `dalili://auth/callback` dans *Redirect URLs*.
6. **Dalili IA (Claude)** :
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy dalili-ia
   ```
   Sans ça, Dalili IA utilise son « cerveau local » (réponses basées sur les fiches et le lexique).

> 🔒 La sécurité est assurée par la Row Level Security : chaque utilisateur ne peut lire/modifier que ses propres données (testé). Ne mets jamais la `service_role` key ni la clé Anthropic dans `.env`.

## 4. Travailler avec Claude Code

Le projet est prêt pour Claude Code :

- `CLAUDE.md` : architecture, règles de design, conventions — Claude le lit automatiquement.
- Commandes personnalisées (dans Claude Code) :
  - `/ecran <description>` + glisse la maquette → construit l'écran avec le design system et les animations
  - `/fonctionnalite <description>` → feature complète (UI + données + migration SQL + RLS)
  - `/verif` → types, lint, build, revue rapide
- `docs/ROADMAP.md` : les prochaines étapes avec des prompts prêts à coller.

Exemple : `/ecran Messagerie mentor ↔ étudiant` en joignant l'export PNG/SVG de ta maquette Figma.

## 5. Publier sur les stores

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile preview   # build de test à installer
eas submit                                   # envoi App Store / Play Store
```

## Ce qu'il y a dedans

| Domaine | Écrans |
|---|---|
| Authentification | Accueil (Google / Apple / email), connexion, inscription en 2 étapes avec force du mot de passe, vérification OTP, photo de profil |
| Onboarding | « Où vis-tu ? », 6 questions étudiant (études, Campus France, ville, date, logement, inquiétudes), rappels, parcours mentor, chargement animé |
| Accueil | Carte mobilité (anneau de progression, compte à rebours), prochaine action, appel mentor, mentors suggérés, boîte à outils, communautés, IA — et accueil **Mentor** (demandes, créneaux) |
| Parcours-quête | Mes étapes par phase, validation avec confettis, badges de phase, tâches perso, calendrier des échéances |
| Fiches de clarification | Le quoi / pourquoi / budget / quand, 3 étapes, documents, mots du lexique, action unique |
| Explorer | Mentors (filtres ville, recherche), Guides, Hôtes (teaser V2) |
| Mentors | Profil (parcours, spécialités, langues, avis), réservation (sujet, jour, créneau, documents), confirmation, écran d'appel |
| Dalili IA | Chat personnalisé, réponses en étapes cliquables, suggestions, « Profil IA » transparent et modifiable |
| Communauté | Groupes et événements par ville, page groupe (fil, événements, membres, contenu réservé), posts, likes, création de groupe / événement / post |
| Outils | Guides avec lecture progressive, lexique anti-jargon A→Z, simulateur de budget avec APL, checklist documents, SOS urgences |
| Profil | Progression, rendez-vous, guides enregistrés, changement de rôle, réglages |

## Structure

Voir `CLAUDE.md` (section *Architecture*).
