import { z } from 'zod';

// Minimal typed client for TypeSafe's System One HTTP API (docs.typesafe.ai/api).
// Jev returns typed judgments with calibrated probabilities; code owns thresholds and actions.

type Description = string | Record<string, unknown> | unknown[];

export type NoulQuestion = {
  type: 'noul';
  instructions: Description;
  criteria?: { true?: Description; false?: Description };
};

export type ChoiceQuestion<K extends string = string> = {
  type: 'choice';
  instructions: Description;
  criteria: Record<K, Description | null>;
};

export type ScoreQuestion = {
  type: 'score';
  instructions: Description;
  criteria: Description[];
};

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: 'noul'; noul: number };
export type ChoiceAnswer<K extends string = string> = {
  type: 'choice';
  choice: K;
  probabilities: Record<K, number>;
  confidence: number;
};
export type ScoreAnswer = {
  type: 'score';
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type AnswerFor<Q> = Q extends { type: 'noul' }
  ? NoulAnswer
  : Q extends ChoiceQuestion<infer K>
    ? ChoiceAnswer<K>
    : ScoreAnswer;

export type Answers<Q extends Record<string, Question>> = { [Id in keyof Q]: AnswerFor<Q[Id]> };

const Probability = z.number().min(0).max(1);

const AnswerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), noul: Probability }),
  z.object({
    type: z.literal('choice'),
    choice: z.string(),
    probabilities: z.record(z.string(), Probability),
    confidence: Probability,
  }),
  z.object({
    type: z.literal('score'),
    score: z.number(),
    legend: z.record(z.string(), z.string()),
    probabilities: z.record(z.string(), Probability),
    confidence: Probability,
  }),
]);

const ResponseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), AnswerSchema),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

export type SystemOneResult<Q extends Record<string, Question>> =
  | { ok: true; model: string; answers: Answers<Q>; usage: { input_tokens: number; output_tokens: number } }
  | { ok: false; status: number | null; error: string };

export function isTypeSafeConfigured() {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

function endpoint() {
  return `${(process.env.TYPESAFE_BASE_URL || 'https://api.typesafe.ai').replace(/\/+$/, '')}/v1/systemone`;
}

const RETRYABLE = new Set([429, 529]);

export async function systemOne<Q extends Record<string, Question>>(
  state: unknown,
  questions: Q,
  { timeoutMs = 8000, retries = 2 }: { timeoutMs?: number; retries?: number } = {},
): Promise<SystemOneResult<Q>> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return { ok: false, status: null, error: 'TYPESAFE_API_KEY is not configured.' };

  const body = JSON.stringify({ state, model: process.env.TYPESAFE_MODEL || 'jev-latest', questions });

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(endpoint(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt < retries) continue;
      return { ok: false, status: null, error: error instanceof Error ? error.message : 'TypeSafe request failed.' };
    }

    // 429 rate limit / 529 overloaded: exponential backoff, as the API docs recommend.
    if (RETRYABLE.has(response.status) && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      continue;
    }

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = json && typeof json === 'object' ? JSON.stringify(json).slice(0, 300) : '';
      return { ok: false, status: response.status, error: `TypeSafe HTTP ${response.status} ${detail}`.trim() };
    }

    const parsed = ResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, status: response.status, error: 'Unexpected TypeSafe response shape.' };

    // Every question must come back with the same type, and choices must be one of our options.
    for (const [id, question] of Object.entries(questions)) {
      const answer = parsed.data.answers[id];
      if (!answer || answer.type !== question.type) {
        return { ok: false, status: response.status, error: `Missing or mistyped answer for "${id}".` };
      }
      if (answer.type === 'choice' && question.type === 'choice' && !(answer.choice in question.criteria)) {
        return { ok: false, status: response.status, error: `Answer for "${id}" is not one of the options.` };
      }
    }

    return {
      ok: true,
      model: parsed.data.model,
      answers: parsed.data.answers as Answers<Q>,
      usage: parsed.data.usage,
    };
  }
}
