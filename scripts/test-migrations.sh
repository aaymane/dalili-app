#!/usr/bin/env bash
# Rejoue le schéma actuel de dalili.web + toutes les migrations de l'app dans un
# Postgres jetable (Docker), puis les tests de sécurité. Ne touche jamais la prod.
#   npm run test:migrations
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=dalili-migrations-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test pgvector/pgvector:pg17 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT

until docker exec "$NAME" pg_isready -U postgres -q; do sleep 1; done
sleep 1

run() { docker exec -i "$NAME" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }

run < supabase/tests/00_stub_supabase.sql
run < supabase/tests/01_site_prod.sql
for f in supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  run < "$f"
done
run < supabase/seed.sql
run -o /dev/null < supabase/tests/rls.sql
