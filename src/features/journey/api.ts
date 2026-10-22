import { supabase } from '@/lib/supabase';

/** Synchronisation du Parcours-quête vers Supabase (no-op en démo). Lève une erreur si l'enregistrement échoue. */
export async function syncStep(stepId: string, done: boolean) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from('step_progress').upsert({ user_id: data.user.id, step_id: stepId, done, updated_at: new Date().toISOString() }, { onConflict: 'user_id,step_id' });
  if (error) throw error;
}

export async function syncCustomStep(step: { id: string; title: string; date: string; done: boolean }, remove = false) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  // Les tâches perso gardent un id local ; on les stocke côté serveur par (user, titre, date).
  const { error } = remove
    ? await supabase.from('custom_steps').delete().match({ user_id: data.user.id, title: step.title, due_date: step.date })
    : await supabase.from('custom_steps').upsert({ user_id: data.user.id, title: step.title, due_date: step.date, done: step.done }, { onConflict: 'user_id,title,due_date' });
  if (error) throw error;
}

/** Relit le parcours enregistré en ligne : étapes cochées et tâches perso. */
export async function fetchJourney() {
  if (!supabase) return null;
  const [steps, custom] = await Promise.all([
    supabase.from('step_progress').select('step_id, done'),
    supabase.from('custom_steps').select('id, title, due_date, done').order('due_date'),
  ]);
  if (steps.error) throw steps.error;
  if (custom.error) throw custom.error;
  return {
    overrides: Object.fromEntries(steps.data.map((r) => [r.step_id, r.done])) as Record<string, boolean>,
    custom: custom.data.map((r) => ({ id: `custom-${r.id}`, title: r.title, date: r.due_date, done: r.done })),
  };
}
