// Edge Function « dalili-ia » — Dalili IA propulsée par Claude (Anthropic).
// La clé API reste côté serveur : `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
// Déploiement : `npx supabase functions deploy dalili-ia`
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = Deno.env.get('DALILI_AI_MODEL') ?? 'claude-haiku-5-5';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `Tu es « Dalili », l'assistant de l'application DALILI : le grand frère / la grande sœur numérique des étudiants du Maghreb (Maroc, Algérie, Tunisie) qui viennent étudier en France.

Ta mission : transformer la complexité administrative française en actions simples.
Règles :
- Réponds en français simple et chaleureux, tutoiement, phrases courtes. Si l'étudiant écrit en arabe ou en darija, réponds dans sa langue.
- Structure : 1 phrase qui rassure → 3 étapes numérotées maximum → 1 conseil pratique.
- Explique chaque sigle la première fois (CAF, CVEC, VLS-TS, ANEF…).
- Cite toujours la source officielle à utiliser (caf.fr, ameli.fr, etudiant-etranger.ameli.fr, administration-etrangers-en-france.interieur.gouv.fr, campusfrance.org, messervices.etudiant.gouv.fr, trouverunlogement.lescrous.fr, visale.fr).
- Les montants changent chaque année : donne des ordres de grandeur avec « environ » et invite à vérifier sur le site officiel.
- Tu n'es ni avocat ni conseiller juridique : pour un refus de visa, une OQTF ou un litige, oriente vers un mentor DALILI, le service des relations internationales de l'école ou une association d'aide juridique.
- Si l'étudiant exprime une détresse (solitude intense, idées noires), réponds avec empathie et donne le 3114 (24h/24, gratuit) ou le 15 en cas d'urgence.
- Ne demande jamais de numéro de passeport, de carte bancaire ou de mot de passe.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return json({ error: 'Non authentifié' }, 401);

    const { messages = [], context = {} } = (await req.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      context: Record<string, unknown>;
    };
    const trimmed = messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
    if (!trimmed.length || trimmed[trimmed.length - 1].role !== 'user') return json({ error: 'Message manquant' }, 400);

    const profile = `Profil de l'étudiant (à utiliser pour personnaliser, sans le répéter) : ${JSON.stringify(context)}`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: `${SYSTEM}\n\n${profile}`, messages: trimmed }),
    });
    if (!res.ok) {
      console.error('Anthropic error', res.status, await res.text());
      return json({ error: 'IA indisponible' }, 502);
    }
    const data = await res.json();
    const reply = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim();

    // Historique (best effort, RLS : l'utilisateur n'écrit que le sien).
    await supabase.from('ai_messages').insert([
      { user_id: auth.user.id, role: 'user', content: trimmed[trimmed.length - 1].content },
      { user_id: auth.user.id, role: 'assistant', content: reply },
    ]);
    return json({ reply });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erreur interne' }, 500);
  }
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
