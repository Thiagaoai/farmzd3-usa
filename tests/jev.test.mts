import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { systemOne } from '../lib/typesafe/client.ts';
import { buildMediationRequest, composeMediation } from '../lib/typesafe/decision-mediation.ts';
import { buildTriageQuestions, composeTriage } from '../lib/typesafe/order-triage.ts';
import { getDecision } from '../lib/decisions/registry.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TYPESAFE_API_KEY;
});

const clean = { has_required_details: 0.95, licensed_ip: 0.02, inappropriate: 0.01, rush_request: 0.05 };

test('triage verdicts follow the thresholds', () => {
  assert.equal(composeTriage(clean).verdict, 'ready');
  assert.equal(composeTriage({ ...clean, has_required_details: 0.65 }).verdict, 'check');
  assert.equal(composeTriage({ ...clean, has_required_details: 0.2 }).verdict, 'ask_details');
  assert.equal(composeTriage({ ...clean, licensed_ip: 0.9 }).verdict, 'review');
  assert.equal(composeTriage({ ...clean, inappropriate: 0.7, has_required_details: 0.1 }).verdict, 'review');
  assert.ok(composeTriage({ ...clean, rush_request: 0.8 }).reasons.some((reason) => reason.includes('urgência')));
});

test('triage asks four noul questions', () => {
  const questions = buildTriageQuestions();
  assert.deepEqual(Object.keys(questions).sort(), ['has_required_details', 'inappropriate', 'licensed_ip', 'rush_request']);
  for (const question of Object.values(questions)) assert.equal(question.type, 'noul');
});

const decision = getDecision('price:christmas-name-ornament')!;
const positions = {
  thiago: { optionId: 'high', reason: 'Quero posicionar como presente premium e artesanal.' },
  bruna: { optionId: 'low', reason: 'Quero vender volume nos grupos locais, preço competitivo.' },
};

test('mediation request: one choice, one conflict noul, and a noul per option per partner — no raw prices', () => {
  const { state, questions } = buildMediationRequest(decision, positions);
  assert.equal(Object.keys(questions).length, 2 + decision.options.length * 2);
  const choice = questions.common_ground;
  assert.equal(choice.type, 'choice');
  assert.deepEqual(Object.keys(choice.criteria!).sort(), decision.options.map((option) => option.id).sort());
  const payload = JSON.stringify({ state, questions });
  for (const option of decision.options) {
    assert.equal(payload.includes(String(option.value)), false, 'numeric prices stay in code (Jev is weak at numbers)');
  }
  assert.ok(payload.includes('margin'));
});

function answers(fits: Record<string, [number, number]>, choice: string, confidence: number) {
  const out: Record<string, { type: string; noul?: number; choice?: string; probabilities?: Record<string, number>; confidence?: number }> = {
    common_ground: { type: 'choice', choice, probabilities: {}, confidence },
    conflict: { type: 'noul', noul: 0.8 },
  };
  for (const [id, [t, b]] of Object.entries(fits)) {
    out[`fits_thiago__${id}`] = { type: 'noul', noul: t };
    out[`fits_bruna__${id}`] = { type: 'noul', noul: b };
  }
  return out;
}

test('mediation picks the option whose less-satisfied partner is best served', () => {
  const fits = { low: [0.1, 0.95], market: [0.7, 0.75], high: [0.95, 0.1] } as Record<string, [number, number]>;
  const strong = composeMediation(decision, answers(fits, 'market', 0.8), 'jev-test');
  assert.equal(strong.suggestedOptionId, 'market');
  assert.equal(strong.strength, 'strong');
  assert.equal(strong.fairness.market.both, 0.7);

  assert.equal(composeMediation(decision, answers(fits, 'high', 0.8), 'jev-test').strength, 'moderate');
  assert.equal(composeMediation(decision, answers(fits, 'market', 0.3), 'jev-test').strength, 'moderate');

  const none = composeMediation(decision, answers({ low: [0.1, 0.9], market: [0.3, 0.4], high: [0.9, 0.2] }, 'market', 0.9), 'jev-test');
  assert.equal(none.strength, 'none');
});

function mockFetch(...responses: Array<{ status: number; body: unknown }>) {
  const calls: RequestInit[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}

const okBody = {
  model: 'jev-1.13.0',
  answers: { urgent: { type: 'noul', noul: 0.9 }, team: { type: 'choice', choice: 'billing', probabilities: { billing: 0.9, other: 0.1 }, confidence: 0.8 } },
  usage: { input_tokens: 10, output_tokens: 5 },
};
const questions = {
  urgent: { type: 'noul' as const, instructions: 'Urgent?' },
  team: { type: 'choice' as const, instructions: 'Team?', criteria: { billing: null, other: null } },
};

test('client refuses to call without an API key', async () => {
  const result = await systemOne('x', questions);
  assert.equal(result.ok, false);
});

test('client sends the documented request and returns typed answers', async () => {
  process.env.TYPESAFE_API_KEY = 'ts_test';
  const calls = mockFetch({ status: 200, body: okBody });
  const result = await systemOne({ a: 1 }, questions);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.answers.urgent.noul, 0.9);
    assert.equal(result.answers.team.choice, 'billing');
  }
  const sent = JSON.parse(String(calls[0].body));
  assert.equal(sent.model, 'jev-latest');
  assert.deepEqual(sent.state, { a: 1 });
  assert.equal((calls[0].headers as Record<string, string>).Authorization, 'Bearer ts_test');
});

test('client retries 529 then succeeds, and rejects answers outside the options', async () => {
  process.env.TYPESAFE_API_KEY = 'ts_test';
  const calls = mockFetch({ status: 529, body: {} }, { status: 200, body: okBody });
  assert.equal((await systemOne('x', questions)).ok, true);
  assert.equal(calls.length, 2);

  mockFetch({ status: 200, body: { ...okBody, answers: { ...okBody.answers, team: { ...okBody.answers.team, choice: 'hacked' } } } });
  assert.equal((await systemOne('x', questions)).ok, false);

  mockFetch({ status: 200, body: { ...okBody, answers: { urgent: okBody.answers.urgent } } });
  assert.equal((await systemOne('x', questions)).ok, false, 'missing answer is an error');

  mockFetch({ status: 401, body: { detail: 'bad key' } });
  const unauthorized = await systemOne('x', questions);
  assert.equal(unauthorized.ok, false);
  if (!unauthorized.ok) assert.equal(unauthorized.status, 401);
});
