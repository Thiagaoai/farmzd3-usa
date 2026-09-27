// Holiday campaign calendar. Dates are compared as New York calendar days.

export type CampaignId = 'halloween' | 'thanksgiving' | 'christmas';

export type Campaign = {
  id: CampaignId;
  name: string;
  holidayDate: string;
  orderByDate: string;
  daysUntilOrderBy: number;
  daysUntilHoliday: number;
};

// Days between the last accepted order and the holiday (production + shipping).
// Defaults only: the live values come from the approved decisions in /admin/farmz3d.
export const ORDER_LEAD_DAYS: Record<CampaignId, number> = {
  halloween: 9,
  thanksgiving: 10,
  christmas: 13,
};

const CAMPAIGN_NAMES: Record<CampaignId, string> = {
  halloween: 'Halloween',
  thanksgiving: 'Thanksgiving',
  christmas: 'Christmas',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIso(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function newYorkToday(now: Date = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function daysBetween(fromIso: string, toIsoDate: string) {
  return Math.round((parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / DAY_MS);
}

export function addDays(isoDate: string, days: number) {
  return toIso(new Date(parseIso(isoDate).getTime() + days * DAY_MS));
}

// US Thanksgiving: fourth Thursday of November.
export function thanksgivingDate(year: number) {
  const novFirstWeekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThursday = 1 + ((4 - novFirstWeekday + 7) % 7);
  return toIso(new Date(Date.UTC(year, 10, firstThursday + 21)));
}

export function holidayDates(year: number): Record<CampaignId, string> {
  return {
    halloween: `${year}-10-31`,
    thanksgiving: thanksgivingDate(year),
    christmas: `${year}-12-25`,
  };
}

export type LeadDays = Record<CampaignId, number>;

export function campaignsForYear(year: number, today: string, leadDays: LeadDays = ORDER_LEAD_DAYS): Campaign[] {
  const dates = holidayDates(year);
  return (Object.keys(dates) as CampaignId[]).map((id) => {
    const orderByDate = addDays(dates[id], -leadDays[id]);
    return {
      id,
      name: CAMPAIGN_NAMES[id],
      holidayDate: dates[id],
      orderByDate,
      daysUntilOrderBy: daysBetween(today, orderByDate),
      daysUntilHoliday: daysBetween(today, dates[id]),
    };
  });
}

// The campaign still accepting orders that closes soonest.
export function getActiveCampaign(now: Date = new Date(), leadDays: LeadDays = ORDER_LEAD_DAYS): Campaign {
  const today = newYorkToday(now);
  const year = Number(today.slice(0, 4));
  const upcoming = [...campaignsForYear(year, today, leadDays), ...campaignsForYear(year + 1, today, leadDays)].filter(
    (campaign) => campaign.daysUntilOrderBy >= 0,
  );
  return upcoming[0];
}

export function getUpcomingCampaigns(now: Date = new Date(), leadDays: LeadDays = ORDER_LEAD_DAYS): Campaign[] {
  const today = newYorkToday(now);
  const year = Number(today.slice(0, 4));
  return [...campaignsForYear(year, today, leadDays), ...campaignsForYear(year + 1, today, leadDays)]
    .filter((campaign) => campaign.daysUntilOrderBy >= 0)
    .slice(0, 3);
}

export function formatLongDate(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseIso(isoDate));
}
