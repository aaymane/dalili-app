import { MentorHome } from '@/features/home/MentorHome';
import { StudentHome } from '@/features/home/StudentHome';
import { useProfile } from '@/features/profile/store';

export default function Home() {
  const role = useProfile((s) => s.profile.activeRole);
  return role === 'mentor' ? <MentorHome /> : <StudentHome />;
}
