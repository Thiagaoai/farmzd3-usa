import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { verifyStripeSignature } from '../lib/farmz3d/stripe.ts';

const secret = 'whsec_test';
const payload = JSON.stringify({ type: 'checkout.session.completed' });
const sign = (t: number, body = payload, key = secret) => `t=${t},v1=${createHmac('sha256', key).update(`${t}.${body}`).digest('hex')}`;

test('accepts a valid, recent Stripe signature', () => {
  const now = Date.now();
  assert.equal(verifyStripeSignature(payload, sign(Math.floor(now / 1000)), secret, 300, now), true);
});

test('rejects tampered bodies, wrong secrets, old timestamps and missing headers', () => {
  const now = Date.now();
  const t = Math.floor(now / 1000);
  assert.equal(verifyStripeSignature(`${payload} `, sign(t), secret, 300, now), false);
  assert.equal(verifyStripeSignature(payload, sign(t, payload, 'whsec_other'), secret, 300, now), false);
  assert.equal(verifyStripeSignature(payload, sign(t - 3600), secret, 300, now), false);
  assert.equal(verifyStripeSignature(payload, null, secret, 300, now), false);
  assert.equal(verifyStripeSignature(payload, 't=abc,v1=zz', secret, 300, now), false);
});
