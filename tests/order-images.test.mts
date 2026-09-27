import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toWhatsappDigits, whatsappLink } from '../lib/farmz3d/contact.ts';
import { sniffImage } from '../lib/farmz3d/image-sniff.ts';
import { safeEqual } from '../lib/shared/request-guard.ts';

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((value) => (typeof value === 'string' ? [...value].map((char) => char.charCodeAt(0)) : [value])));

test('images are identified by their bytes, not their name', () => {
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.contentType, 'image/jpeg');
  assert.equal(sniffImage(bytes(0x89, 'PNG\r\n', 0x1a, '\n'))?.contentType, 'image/png');
  assert.equal(sniffImage(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))?.contentType, 'image/webp');
  assert.equal(sniffImage(bytes(0, 0, 0, 24, 'ftypheic'))?.contentType, 'image/heic');
  assert.equal(sniffImage(bytes('<svg onload=alert(1)>')), null);
  assert.equal(sniffImage(bytes('%PDF-1.7')), null);
});

test('WhatsApp numbers: US 10 digits get +1, international kept, short rejected', () => {
  assert.equal(toWhatsappDigits('(774) 722-5366'), '17747225366');
  assert.equal(toWhatsappDigits('+1 774 722 5366'), '17747225366');
  assert.equal(toWhatsappDigits('+55 11 91234-5678'), '5511912345678');
  assert.equal(toWhatsappDigits('722-5366'), null);
  assert.equal(toWhatsappDigits(null), null);
  assert.equal(whatsappLink('17747225366', 'Order FZ-1 & more'), 'https://wa.me/17747225366?text=Order%20FZ-1%20%26%20more');
});

test('safeEqual compares exactly', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
});
