import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECISIONS, getDecision } from '../lib/decisions/registry.ts';
import { DecisionSchema } from '../lib/decisions/schema.ts';
import { PRODUCTS } from '../lib/farmz3d/catalog.ts';

test('every decision passes the typed schema and ids are unique', () => {
  for (const decision of DECISIONS) DecisionSchema.parse(decision);
  const ids = DECISIONS.map((decision) => decision.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every product has a pricing decision in USD', () => {
  for (const product of PRODUCTS) {
    const decision = getDecision(`price:${product.id}`);
    assert.ok(decision, `missing price:${product.id}`);
    assert.equal(decision.unit, 'usd_cents');
  }
});

test('order deadlines are decisions for every campaign', () => {
  for (const campaign of ['halloween', 'thanksgiving', 'christmas']) {
    const decision = getDecision(`lead-days:${campaign}`);
    assert.ok(decision);
    assert.equal(decision.unit, 'days');
  }
});

test('every recommended price leaves a positive margin over the estimated cost', () => {
  for (const decision of DECISIONS) {
    if (decision.unit !== 'usd_cents' || decision.unitCostCents === undefined) continue;
    const recommended = decision.options.find((option) => option.id === decision.recommendedOptionId)!;
    assert.ok((recommended.value as number) > decision.unitCostCents, `${decision.id} recommended price is below cost`);
  }
});

test('every piece of market evidence cites a source', () => {
  for (const decision of DECISIONS) {
    if (decision.group === 'operations') continue;
    for (const item of decision.evidence) assert.ok(item.sourceUrl, `${decision.id}: "${item.label}" has no source`);
  }
});

test('schema rejects a recommendation that is not an option and values of the wrong unit', () => {
  const base = DECISIONS[0];
  assert.equal(DecisionSchema.safeParse({ ...base, recommendedOptionId: 'nope' }).success, false);
  assert.equal(
    DecisionSchema.safeParse({ ...base, unit: 'text' }).success,
    false,
    'numeric options must not validate as text',
  );
});
