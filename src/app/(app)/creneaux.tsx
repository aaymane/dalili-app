import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { SlotsEditor } from '@/features/mentors/components/SlotsEditor';
import { useMentorSlots, useMyMentor } from '@/features/mentors/hooks';

/** Mes créneaux (espace mentor) : les horaires de la semaine où les étudiants peuvent demander un appel. */
export default function Creneaux() {
  const mentor = useMyMentor().data;
  const slots = useMentorSlots(mentor?.id);
  // L'éditeur part des créneaux enregistrés : on attend de les avoir.
  if (!mentor || !slots.data) return <Screen padded={false} header={<AppHeader back hideActions />}>{null}</Screen>;
  return <SlotsEditor mentorId={mentor.id} initial={slots.data} />;
}
