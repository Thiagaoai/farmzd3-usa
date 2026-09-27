import { getResolvedNumbers } from '@/lib/decisions/store';
import { PRODUCTS, type PricedProduct } from './catalog';
import { ORDER_LEAD_DAYS, type CampaignId, type LeadDays } from './season';

export const priceDecisionId = (productId: string) => `price:${productId}`;
export const leadDaysDecisionId = (campaign: CampaignId) => `lead-days:${campaign}`;

// Live catalog: approved decisions, or the recommended option while a decision is pending.
export const SHIPPING_DECISION_ID = 'shipping:flat';

export async function getLiveCatalog(): Promise<{ products: PricedProduct[]; leadDays: LeadDays; shippingCents: number }> {
  const numbers = await getResolvedNumbers();

  const products = PRODUCTS.map((product) => {
    const priceCents = numbers.get(priceDecisionId(product.id));
    if (priceCents === undefined) throw new Error(`Missing pricing decision for ${product.id}`);
    return { ...product, priceCents };
  });

  const leadDays = Object.fromEntries(
    (Object.keys(ORDER_LEAD_DAYS) as CampaignId[]).map((campaign) => [
      campaign,
      numbers.get(leadDaysDecisionId(campaign)) ?? ORDER_LEAD_DAYS[campaign],
    ]),
  ) as LeadDays;

  const shippingCents = numbers.get(SHIPPING_DECISION_ID);
  if (shippingCents === undefined) throw new Error('Missing shipping decision');

  return { products, leadDays, shippingCents };
}
