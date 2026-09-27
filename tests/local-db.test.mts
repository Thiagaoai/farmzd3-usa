import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

process.env.LOCAL_DEMO_DB_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'local-db-')), 'db.json');
const { localDemoFetch } = await import('../lib/dev/local-db.ts');

// Exercise the adapter through the real supabase-js client, exactly as the app does.
const db = createClient('http://local-demo-db.invalid', 'local-demo', {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: localDemoFetch },
});

const order = (n: string, extra = {}) => ({
  order_number: n,
  product_id: 'cake-topper',
  product_name: 'Cake',
  unit_price_cents: 1400,
  quantity: 1,
  estimated_total_cents: 1400,
  personalization: 'Ana 5',
  fulfillment: 'pickup',
  customer_name: 'Ana',
  customer_email: 'a@x.com',
  campaign: 'halloween',
  ...extra,
});

test('insert applies column defaults and persists to disk', async () => {
  const { error } = await db.from('farmz3d_orders').insert(order('FZ-1'));
  assert.equal(error, null);
  const { data } = await db.from('farmz3d_orders').select('*').eq('order_number', 'FZ-1');
  assert.equal(data?.[0].status, 'new');
  assert.equal(data?.[0].shipping_cents, 0);
  assert.ok(JSON.parse(readFileSync(process.env.LOCAL_DEMO_DB_FILE!, 'utf8')).farmz3d_orders.length === 1);
});

test('duplicate unique key returns 23505 so the order-number retry works', async () => {
  const { error } = await db.from('farmz3d_orders').insert(order('FZ-1'));
  assert.equal(error?.code, '23505');
});

test('order + limit + update with returned rows', async () => {
  await db.from('farmz3d_orders').insert(order('FZ-2', { estimated_total_cents: 900 }));
  const { data } = await db.from('farmz3d_orders').select('*').order('order_number', { ascending: false }).limit(1);
  assert.equal(data?.[0].order_number, 'FZ-2');
  const updated = await db.from('farmz3d_orders').update({ status: 'printing' }).eq('order_number', 'FZ-2').select('order_number');
  assert.equal(updated.data?.length, 1);
  const missing = await db.from('farmz3d_orders').update({ status: 'printing' }).eq('order_number', 'FZ-404').select('order_number');
  assert.equal(missing.data?.length, 0);
});

test('composite upsert keeps one row per partner', async () => {
  const upsert = (person: string, option: string) =>
    db.from('business_decision_positions').upsert({ decision_id: 'd1', person, option_id: option, reason: 'r' }, { onConflict: 'decision_id,person' });
  await upsert('thiago', 'high');
  await upsert('bruna', 'low');
  await upsert('bruna', 'market');
  const { data } = await db.from('business_decision_positions').select('*').eq('decision_id', 'd1');
  assert.deepEqual(data?.map((row) => `${row.person}:${row.option_id}`).sort(), ['bruna:market', 'thiago:high']);
});

test('count, range filters, maybeSingle and delete', async () => {
  const { count } = await db.from('farmz3d_orders').select('*', { count: 'exact', head: true });
  assert.equal(count, 2);
  const cheap = await db.from('farmz3d_orders').select('*').lt('estimated_total_cents', 1000);
  assert.equal(cheap.data?.length, 1);
  const none = await db.from('farmz3d_orders').select('*').eq('order_number', 'nope').maybeSingle();
  assert.equal(none.data, null);
  assert.equal(none.error, null);
  await db.from('farmz3d_order_triage').insert({ order_number: 'FZ-2', verdict: 'ready', nouls: {}, model: 'm' });
  await db.from('farmz3d_orders').delete().eq('order_number', 'FZ-2');
  const triage = await db.from('farmz3d_order_triage').select('*');
  assert.equal(triage.data?.length, 0, 'triage cascades like the real foreign key');
});

test('a second module instance sees writes from the first (Next.js dev loads modules per route)', async () => {
  const secondInstance = '../lib/dev/local-db.ts?second-instance';
  const other = (await import(secondInstance)) as typeof import('../lib/dev/local-db.ts');
  const otherDb = createClient('http://local-demo-db.invalid', 'local-demo', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: other.localDemoFetch },
  });
  await otherDb.from('farmz3d_orders').select('*'); // warm the second instance first
  await db.from('business_decisions').upsert({ decision_id: 'price:x', option_id: 'high', decided_by: 'bruna' }, { onConflict: 'decision_id' });
  const { data } = await otherDb.from('business_decisions').select('*').eq('decision_id', 'price:x');
  assert.equal(data?.[0]?.option_id, 'high');
});
