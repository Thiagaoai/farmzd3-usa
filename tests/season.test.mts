import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getActiveCampaign, getUpcomingCampaigns, holidayDates, newYorkToday, thanksgivingDate } from '../lib/farmz3d/season.ts';

test('Thanksgiving is the fourth Thursday of November', () => {
  assert.equal(thanksgivingDate(2024), '2024-11-28');
  assert.equal(thanksgivingDate(2025), '2025-11-27');
  assert.equal(thanksgivingDate(2026), '2026-11-26');
  assert.equal(thanksgivingDate(2027), '2027-11-25');
  for (const year of [2026, 2027, 2028, 2029, 2030]) {
    assert.equal(new Date(`${thanksgivingDate(year)}T12:00:00Z`).getUTCDay(), 4);
  }
});

test('holiday dates for 2026', () => {
  assert.deepEqual(holidayDates(2026), { halloween: '2026-10-31', thanksgiving: '2026-11-26', christmas: '2026-12-25' });
});

test('New York calendar day is used, not UTC', () => {
  // 02:00 UTC on Oct 23 is still Oct 22 in New York (EDT, UTC-4).
  assert.equal(newYorkToday(new Date('2026-10-23T02:00:00Z')), '2026-10-22');
});

test('active campaign follows the order deadlines', () => {
  const sept = getActiveCampaign(new Date('2026-09-26T15:00:00Z'));
  assert.equal(sept.id, 'halloween');
  assert.equal(sept.orderByDate, '2026-10-22');
  assert.equal(sept.daysUntilOrderBy, 26);

  const lastHalloweenDay = getActiveCampaign(new Date('2026-10-23T02:00:00Z'));
  assert.equal(lastHalloweenDay.id, 'halloween');
  assert.equal(lastHalloweenDay.daysUntilOrderBy, 0);

  const afterHalloweenCutoff = getActiveCampaign(new Date('2026-10-23T16:00:00Z'));
  assert.equal(afterHalloweenCutoff.id, 'thanksgiving');
  assert.equal(afterHalloweenCutoff.orderByDate, '2026-11-16');

  const december = getActiveCampaign(new Date('2026-12-01T16:00:00Z'));
  assert.equal(december.id, 'christmas');
  assert.equal(december.orderByDate, '2026-12-12');

  const afterChristmasCutoff = getActiveCampaign(new Date('2026-12-20T16:00:00Z'));
  assert.equal(afterChristmasCutoff.id, 'halloween');
  assert.equal(afterChristmasCutoff.holidayDate, '2027-10-31');
});

test('upcoming campaigns list three open campaigns in order', () => {
  const ids = getUpcomingCampaigns(new Date('2026-09-26T15:00:00Z')).map((campaign) => campaign.id);
  assert.deepEqual(ids, ['halloween', 'thanksgiving', 'christmas']);
});
