import { supabase } from '@/lib/supabase';

/** Synchronisation best-effort du Parcours-quête vers Supabase (no-op en démo). */
export async function syncStep(stepId: string, done: boolean) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('step_progress').upsert({ user_id: data.user.id, step_id: stepId, done, updated_at: new Date().toISOString() }, { onConflict: 'user_id,step_id' });
}

export async function syncCustomStep(step: { id: string; title: string; date: string; done: boolean }, remove = false) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  // Les tâches perso gardent un id local ; on les stocke côté serveur par (user, titre, date).
  if (remove) {
    await supabase.from('custom_steps').delete().match({ user_id: data.user.id, title: step.title, due_date: step.date });
    return;
  }
  await supabase.from('custom_steps').upsert({ user_id: data.user.id, title: step.title, due_date: step.date, done: step.done }, { onConflict: 'user_id,title,due_date' });
}
