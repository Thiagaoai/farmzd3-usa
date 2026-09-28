import { getResolvedNumbers } from '@/lib/decisions/store';
import { CUSTOM_PRODUCT, CUSTOM_PRODUCT_ID } from './custom';
import { listProducts, type StoreProduct } from './products';
import { ORDER_LEAD_DAYS, type CampaignId, type LeadDays } from './season';

export { priceDecisionId } from './products';
export const leadDaysDecisionId = (campaign: CampaignId) => `lead-days:${campaign}`;
export const SHIPPING_DECISION_ID = 'shipping:flat';

// Live catalog: products from the panel (price typed there, or the approved/recommended
// price decision), plus the operational decisions (deadlines, shipping).
export async function getLiveCatalog(): Promise<{ products: StoreProduct[]; leadDays: LeadDays; shippingCents: number }> {
  const [{ products }, numbers] = await Promise.all([listProducts(), getResolvedNumbers()]);

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

export async function findProduct(id: string) {
  if (id === CUSTOM_PRODUCT_ID) return CUSTOM_PRODUCT;
  const { products } = await listProducts({ includeInactive: true });
  return products.find((product) => product.id === id) ?? null;
}
