import {
  BadgeCheck,
  Bus,
  CreditCard,
  FileText,
  GraduationCap,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Languages,
  Plane,
  Receipt,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { StepIcon as StepIconName } from '../steps';

const MAP: Record<StepIconName, LucideIcon> = {
  languages: Languages,
  graduation: GraduationCap,
  file: FileText,
  passport: BadgeCheck,
  home: House,
  handshake: Handshake,
  receipt: Receipt,
  plane: Plane,
  shield: ShieldCheck,
  badge: BadgeCheck,
  bank: Landmark,
  phone: Smartphone,
  health: Stethoscope,
  wallet: Wallet,
  card: CreditCard,
  bus: Bus,
  heart: HeartPulse,
};

export function StepIcon({ name, size = 20, color }: { name: StepIconName; size?: number; color: string }) {
  const I = MAP[name];
  return <I size={size} color={color} />;
}
