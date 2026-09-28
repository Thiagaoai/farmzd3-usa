import type { StoreProduct } from './products';

// "Custom design": the customer describes an idea and gets a quote by email.
// It is not a catalog product and has no price until the shop sets one in the panel.
export const CUSTOM_PRODUCT_ID = 'custom-quote';

export const CUSTOM_PRODUCT: StoreProduct = {
  id: CUSTOM_PRODUCT_ID,
  collection: 'year-round',
  name: 'Custom design (quote)',
  description: 'Tell us your idea and we will email you a quote.',
  personalizationHint: 'Describe what you want: object, size, colors, names or text, and where it will be used.',
  requiredDetails: 'A description of what to make (object, approximate size, colors, any text). A reference image is helpful but optional.',
  unitLabel: 'quote',
  emoji: '✨',
  priceCents: 0,
  priceSource: 'manual',
  decisionPriceCents: null,
  costCents: null,
  stock: null,
  lowStockAt: 0,
  active: true,
  sortOrder: 0,
  imagePath: null,
  imageSrc: null,
  imageAlt: 'Custom design',
  soldOut: false,
};

export function isCustomOrder(order: { product_id?: string; productId?: string }) {
  return (order.product_id ?? order.productId) === CUSTOM_PRODUCT_ID;
}
