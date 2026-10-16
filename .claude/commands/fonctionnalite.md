---
description: Ajouter une fonctionnalité complète de bout en bout (UI + données + Supabase + RLS)
argument-hint: <description de la fonctionnalité>
---

Ajoute cette fonctionnalité à DALILI : $ARGUMENTS

1. Lis CLAUDE.md et `docs/ROADMAP.md`. Identifie la feature concernée dans `src/features/`.
2. Écris un plan court : écrans touchés, types, fonctions `api.ts` (démo + Supabase), migration SQL (tables + RLS + index), cas limites.
3. Implémente dans cet ordre : types → migration SQL (`supabase/migrations/<date>_<nom>.sql`) → api/hooks → UI → animations & feedback.
4. Les policies RLS doivent garantir qu'un utilisateur ne lit/écrit que ses propres données (ou celles des groupes dont il est membre).
5. Vérifie : `npm run typecheck && npm run lint`. Si tu as touché au SQL, vérifie la syntaxe et la logique des policies.
6. Mets à jour `docs/ROADMAP.md` (coche ce qui est fait) et commit.
