import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { SheetEditor } from '@/features/mentors/components/SheetEditor';
import { useMyMentor } from '@/features/mentors/hooks';

/** Ma fiche publique (espace mentor) : titre, études, citation, spécialités, langues, avec aperçu. */
export default function MaFiche() {
  const mentor = useMyMentor().data;
  // La fiche n'est lue qu'une fois prête : l'éditeur part de ses valeurs.
  if (!mentor) return <Screen padded={false} header={<AppHeader back hideActions />}>{null}</Screen>;
  return <SheetEditor mentor={mentor} />;
}
