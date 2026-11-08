import { currentLanguage, t } from '@/i18n';
import { formatDayMonth } from '@/lib/date';

import type { Category } from './categories';
import type { VaultDoc } from './store';

/** « 240 Ko », « 1,8 Mo » (« 1.8 MB » en anglais). */
export function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return t('vault.kb', { n: Math.max(1, Math.round(bytes / 1024)) });
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return t('vault.mb', { n: currentLanguage() === 'en' ? mb : mb.replace('.', ',') });
}

export const categoryName = (c: Category) => t(`vault.categories.${c}`);

/** « PDF · 1,2 Mo · 3 novembre ». */
export const docMeta = (d: VaultDoc) =>
  t('vault.meta', { type: d.type === 'application/pdf' ? t('vault.pdf') : t('vault.photo'), size: sizeLabel(d.size), date: formatDayMonth(d.createdAt) });
