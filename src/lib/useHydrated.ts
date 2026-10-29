import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/store';
import { useJourneyStore } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { useLocalDb } from '@/data/local-db';
import { useLanguage } from '@/i18n';

const stores = [useAuth, useProfile, useJourneyStore, useLocalDb, useLanguage];

/** Vrai quand tous les stores persistés ont été relus depuis le stockage. */
export function useHydrated() {
  const [ok, setOk] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ok) return;
    const check = () => setOk(stores.every((s) => s.persist.hasHydrated()));
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ok]);
  return ok;
}
