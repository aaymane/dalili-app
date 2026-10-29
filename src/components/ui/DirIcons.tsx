/**
 * Les icônes qui indiquent un sens (retour, suite, ouvrir) : retournées en arabe, pour pointer du bon côté.
 * À importer d'ici plutôt que de `lucide-react-native` : `import { ChevronRight } from '@/components/ui/DirIcons'`.
 */
import { ArrowRight as LArrowRight, ArrowUpRight as LArrowUpRight, ChevronLeft as LChevronLeft, ChevronRight as LChevronRight, type LucideIcon, type LucideProps } from 'lucide-react-native';

import { useIsRTL } from '@/i18n';

const MIRROR = { transform: [{ scaleX: -1 }] };

function mirrored(Icon: LucideIcon): LucideIcon {
  function Directional({ style, ...props }: LucideProps) {
    const rtl = useIsRTL();
    return <Icon {...props} style={rtl ? [style, MIRROR] : style} />;
  }
  return Directional as LucideIcon;
}

export const ArrowRight = mirrored(LArrowRight);
export const ArrowUpRight = mirrored(LArrowUpRight);
export const ChevronLeft = mirrored(LChevronLeft);
export const ChevronRight = mirrored(LChevronRight);
