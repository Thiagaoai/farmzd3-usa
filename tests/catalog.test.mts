import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLLECTIONS, OrderInputSchema, PRODUCTS } from '../lib/farmz3d/catalog.ts';

const valid = {
  productId: 'christmas-name-ornament',
  quantity: 2,
  personalization: 'Emma 2026',
  neededBy: '',
  fulfillment: 'shipping',
  shippingZip: '02601',
  shipLine1: '12 Main St',
  shipCity: 'Hyannis',
  shipState: 'MA',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '(508) 555-0123',
  notes: '',
};

test('catalog is consistent', () => {
  const ids = PRODUCTS.map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length, 'product ids are unique');
  const collections = new Set(COLLECTIONS.map((collection) => collection.id));
  for (const product of PRODUCTS) {
    assert.ok(collections.has(product.collection), `${product.id} has a known collection`);
    assert.equal('priceCents' in product, false, 'prices live in the decisions registry, not the catalog');
  }
  for (const collection of collections) {
    assert.ok(PRODUCTS.some((product) => product.collection === collection), `${collection} has products`);
  }
});

test('valid order parses and blanks become undefined', () => {
  const order = OrderInputSchema.parse(valid);
  assert.equal(order.neededBy, undefined);
  assert.equal(order.phone, '(508) 555-0123');
  assert.equal(order.quantity, 2);
});

test('pickup does not need a ZIP; shipping does', () => {
  assert.equal(OrderInputSchema.safeParse({ ...valid, fulfillment: 'pickup', shippingZip: '' }).success, true);
  const missingZip = OrderInputSchema.safeParse({ ...valid, shippingZip: '' });
  assert.equal(missingZip.success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, shippingZip: 'abcde' }).success, false);
});

test('invalid orders are rejected', () => {
  // Unknown ids are rejected by the server against the live product list; the schema rejects malformed ones.
  assert.equal(OrderInputSchema.safeParse({ ...valid, productId: 'Not a product!' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, quantity: 0 }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, quantity: 51 }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, email: 'nope' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, personalization: '   ' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, neededBy: '12/15/2026' }).success, false);
});

test('a WhatsApp number is required', () => {
  assert.equal(OrderInputSchema.safeParse({ ...valid, phone: '' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, phone: '555-0123' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, phone: '+55 11 91234-5678' }).success, true);
});

test('shipping needs a full address; pickup does not', () => {
  assert.equal(OrderInputSchema.safeParse({ ...valid, shipLine1: '' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, shipState: 'Massachusetts' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, fulfillment: 'pickup', shipLine1: '', shipCity: '', shipState: '', shippingZip: '' }).success, true);
});

test('product ids must be slugs', () => {
  assert.equal(OrderInputSchema.safeParse({ ...valid, productId: 'Bad Id!' }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, productId: 'new-mug-2026' }).success, true);
});

test('custom quote requests can describe the idea at length; regular orders stay short', () => {
  const long = 'x'.repeat(800);
  assert.equal(OrderInputSchema.safeParse({ ...valid, productId: 'custom-quote', personalization: long }).success, true);
  assert.equal(OrderInputSchema.safeParse({ ...valid, personalization: long }).success, false);
  assert.equal(OrderInputSchema.safeParse({ ...valid, productId: 'custom-quote', personalization: 'x'.repeat(1001) }).success, false);
});
