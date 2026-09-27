import { z } from 'zod';

// Products. Prices are not set here: each product has a typed pricing decision
// (`price:<product id>`) in lib/decisions/registry.ts, approved in /admin.

export const COLLECTION_IDS = ['halloween', 'thanksgiving', 'christmas', 'year-round', 'business'] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export type Collection = {
  id: CollectionId;
  name: string;
  tagline: string;
};

export type PricedProduct = Product & { priceCents: number };

export type Product = {
  id: string;
  collection: CollectionId;
  name: string;
  description: string;
  personalizationHint: string;
  // What the personalization must contain before printing (used by the Jev order check).
  requiredDetails: string;
  unitLabel: string;
  emoji: string;
};

export const COLLECTIONS: Collection[] = [
  { id: 'halloween', name: 'Halloween', tagline: 'Spooky, personalized, printed in our workshop.' },
  { id: 'thanksgiving', name: 'Thanksgiving', tagline: 'Set a table everyone remembers.' },
  { id: 'christmas', name: 'Christmas', tagline: 'Ornaments and gifts with their name on it.' },
  { id: 'year-round', name: 'Year-round gifts', tagline: 'Keepsakes for birthdays, pets and celebrations.' },
  { id: 'business', name: 'For businesses', tagline: 'Branded pieces that work at the counter.' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'halloween-bucket-tag',
    collection: 'halloween',
    name: 'Trick-or-Treat Name Tag',
    description: 'Custom name tag that clips onto any candy bucket or bag. Pumpkin, ghost or bat shape.',
    personalizationHint: 'Name + shape (pumpkin, ghost or bat)',
    requiredDetails: 'A name, and a shape: pumpkin, ghost or bat.',
    unitLabel: 'each',
    emoji: '🎃',
  },
  {
    id: 'halloween-cookie-cutters',
    collection: 'halloween',
    name: 'Halloween Cookie Cutter Set',
    description: 'Set of 3 food-contact PLA cutters. Add a name or monogram cutter for your family.',
    personalizationHint: 'Name or monogram for the custom cutter',
    requiredDetails: 'The name or monogram for the custom cutter.',
    unitLabel: 'set of 3',
    emoji: '🦇',
  },
  {
    id: 'halloween-lithophane',
    collection: 'halloween',
    name: 'Spooky Photo Lithophane Light',
    description: 'Your photo printed in 3D — it appears when the warm LED behind it turns on.',
    personalizationHint: 'Attach the photo below (or send it later on WhatsApp). Caption optional.',
    requiredDetails: 'Nothing in the text is required: the photo is attached to the order or sent later by email/WhatsApp. A caption is optional.',
    unitLabel: 'each',
    emoji: '👻',
  },
  {
    id: 'thanksgiving-place-cards',
    collection: 'thanksgiving',
    name: 'Personalized Place Card Holders',
    description: 'Leaf or pumpkin holders with each guest name printed in.',
    personalizationHint: 'Guest names, separated by commas',
    requiredDetails: 'The guest names, up to six.',
    unitLabel: 'set of 6',
    emoji: '🍂',
  },
  {
    id: 'thanksgiving-napkin-rings',
    collection: 'thanksgiving',
    name: 'Name Napkin Rings',
    description: 'Napkin rings with each name — doubles as a take-home keepsake.',
    personalizationHint: 'Names, separated by commas',
    requiredDetails: 'The names, up to six.',
    unitLabel: 'set of 6',
    emoji: '🦃',
  },
  {
    id: 'christmas-name-ornament',
    collection: 'christmas',
    name: 'Personalized Name Ornament',
    description: 'Layered ornament with name and year. Snowflake, star or tree.',
    personalizationHint: 'Name + year + shape (snowflake, star or tree)',
    requiredDetails: 'A name, a year, and a shape: snowflake, star or tree.',
    unitLabel: 'each',
    emoji: '🎄',
  },
  {
    id: 'christmas-stocking-tags',
    collection: 'christmas',
    name: 'Stocking Name Tags',
    description: 'Clip-on name tags so every stocking is claimed.',
    personalizationHint: 'Names, separated by commas',
    requiredDetails: 'The names, up to four.',
    unitLabel: 'set of 4',
    emoji: '🧦',
  },
  {
    id: 'christmas-photo-lithophane',
    collection: 'christmas',
    name: 'Photo Lithophane Ornament',
    description: 'Family photo lithophane ornament — the gift grandparents keep forever.',
    personalizationHint: 'Attach the photo below (or send it later on WhatsApp). Caption optional.',
    requiredDetails: 'Nothing in the text is required: the photo is attached to the order or sent later by email/WhatsApp. A caption is optional.',
    unitLabel: 'each',
    emoji: '⭐',
  },
  {
    id: 'pet-memorial',
    collection: 'year-round',
    name: 'Pet Memorial Keepsake',
    description: 'Paw-print plaque with your pet name and dates, or a photo lithophane.',
    personalizationHint: 'Pet name + dates (attach the photo below)',
    requiredDetails: 'The pet name and the dates (the photo is attached or sent later by email/WhatsApp).',
    unitLabel: 'each',
    emoji: '🐾',
  },
  {
    id: 'cake-topper',
    collection: 'year-round',
    name: 'Custom Cake Topper',
    description: 'Name and age topper for birthdays, weddings and baby showers.',
    personalizationHint: 'Text + color',
    requiredDetails: 'The text to print and a color.',
    unitLabel: 'each',
    emoji: '🎂',
  },
  {
    id: 'business-review-stand',
    collection: 'business',
    name: 'Google Review NFC + QR Stand',
    description: 'Counter stand with your logo. Customers tap their phone or scan to leave a review.',
    personalizationHint: 'Business name (attach your logo below)',
    requiredDetails: 'The business name (the logo is attached or sent later by email/WhatsApp).',
    unitLabel: 'each',
    emoji: '📲',
  },
  {
    id: 'halloween-bat-wall-set',
    collection: 'halloween',
    name: 'Flying Bat Wall Set',
    description: '12 matte bats in three sizes — stick-on decor for walls, doors and mirrors.',
    personalizationHint: 'Color (black, white or silver)',
    requiredDetails: 'A color choice: black, white or silver.',
    unitLabel: 'set of 12',
    emoji: '🦇',
  },
  {
    id: 'halloween-skull-planter',
    collection: 'halloween',
    name: 'Geometric Skull Planter',
    description: 'Low-poly skull planter for succulents, with a drainage hole.',
    personalizationHint: 'Color (bone white, black or gray)',
    requiredDetails: 'A color choice.',
    unitLabel: 'each',
    emoji: '💀',
  },
  {
    id: 'halloween-pumpkin-lantern',
    collection: 'halloween',
    name: 'Pumpkin Glow Lantern',
    description: 'Translucent pumpkin with a carved geometric face. LED tealight included.',
    personalizationHint: 'Face style (classic, geometric or cute) + optional name',
    requiredDetails: 'A face style: classic, geometric or cute.',
    unitLabel: 'each',
    emoji: '🎃',
  },
  {
    id: 'thanksgiving-pumpkin-trio',
    collection: 'thanksgiving',
    name: 'Pumpkin Tealight Trio',
    description: 'Three ribbed pumpkins in three sizes. LED tealights included.',
    personalizationHint: 'Colors (sand, cream, sage or white)',
    requiredDetails: 'A color choice for the set.',
    unitLabel: 'set of 3',
    emoji: '🎃',
  },
  {
    id: 'thanksgiving-leaf-garland',
    collection: 'thanksgiving',
    name: 'Autumn Leaf Garland',
    description: 'Maple and oak leaves on natural jute twine — for mantels and tables.',
    personalizationHint: 'Length (4 ft or 6 ft) + color mix',
    requiredDetails: 'A length (4 ft or 6 ft).',
    unitLabel: 'each',
    emoji: '🍂',
  },
  {
    id: 'christmas-snowflake-set',
    collection: 'christmas',
    name: 'Geometric Snowflake Set',
    description: 'Six original snowflake ornaments, each a different design.',
    personalizationHint: 'Color (white, silver or mixed)',
    requiredDetails: 'A color choice.',
    unitLabel: 'set of 6',
    emoji: '❄️',
  },
  {
    id: 'christmas-village-lantern',
    collection: 'christmas',
    name: 'Village House Lantern',
    description: 'Three little houses with glowing windows. LED tealight included.',
    personalizationHint: 'Optional family name on the door',
    requiredDetails: 'Nothing is required; a family name is optional.',
    unitLabel: 'each',
    emoji: '🏠',
  },
  {
    id: 'christmas-star-topper',
    collection: 'christmas',
    name: 'Faceted Star Tree Topper',
    description: 'Pearl-white geometric star that fits most tree tips.',
    personalizationHint: 'Color (pearl white, silver or champagne)',
    requiredDetails: 'A color choice.',
    unitLabel: 'each',
    emoji: '⭐',
  },
  {
    id: 'christmas-gift-tags',
    collection: 'christmas',
    name: 'Name Gift Tags',
    description: 'Reusable gift tags with each name raised — no more lost labels.',
    personalizationHint: 'Names, separated by commas (up to 10)',
    requiredDetails: 'The names, up to ten.',
    unitLabel: 'set of 10',
    emoji: '🎁',
  },
  {
    id: 'christmas-baby-first',
    collection: 'christmas',
    name: 'Baby\'s First Christmas Ornament',
    description: 'Keepsake ornament with the baby name and year.',
    personalizationHint: 'Baby name + year',
    requiredDetails: 'The baby name and the year.',
    unitLabel: 'each',
    emoji: '👶',
  },
  {
    id: 'christmas-countdown',
    collection: 'christmas',
    name: 'Christmas Countdown Blocks',
    description: 'House-shaped frame with two number cubes to count the days.',
    personalizationHint: 'Optional family name on the roof',
    requiredDetails: 'Nothing is required; a family name is optional.',
    unitLabel: 'each',
    emoji: '📅',
  },
  {
    id: 'moon-lamp',
    collection: 'year-round',
    name: 'Moon Lithophane Lamp',
    description: 'Every crater appears when the warm light comes on. Stand and LED included.',
    personalizationHint: 'Size (4 in or 6 in) + optional engraved name on the stand',
    requiredDetails: 'A size: 4 in or 6 in.',
    unitLabel: 'each',
    emoji: '🌕',
  },
  {
    id: 'geometric-planter',
    collection: 'year-round',
    name: 'Faceted Planter + Tray',
    description: 'Geometric planter with a matching drainage tray.',
    personalizationHint: 'Size (4 in or 6 in) + color',
    requiredDetails: 'A size and a color.',
    unitLabel: 'each',
    emoji: '🪴',
  },
  {
    id: 'name-keychains',
    collection: 'year-round',
    name: 'Name Keychains',
    description: 'Raised-letter name keychains on steel split rings.',
    personalizationHint: 'Names, separated by commas + colors',
    requiredDetails: 'The names.',
    unitLabel: 'set of 3',
    emoji: '🔑',
  },
  {
    id: 'phone-stand',
    collection: 'year-round',
    name: 'Personalized Phone Stand',
    description: 'Stable desk stand for phones and small tablets, with a name on the front.',
    personalizationHint: 'Name + color',
    requiredDetails: 'The name to print.',
    unitLabel: 'each',
    emoji: '📱',
  },
  {
    id: 'desk-nameplate',
    collection: 'year-round',
    name: 'Desk Nameplate',
    description: 'Two-tone nameplate for the office, clinic or classroom.',
    personalizationHint: 'Name + title (e.g. "Dr. Maria Costa")',
    requiredDetails: 'The name to print.',
    unitLabel: 'each',
    emoji: '🪪',
  },
  {
    id: 'soccer-jersey-keychain',
    collection: 'year-round',
    name: 'Soccer Jersey Keychain',
    description: 'Mini jersey with the name and number raised on the back, printed in the colors you choose. No club crests or logos.',
    personalizationHint: 'Name + number + 2 colors (e.g. "LUCAS 10, green and yellow")',
    requiredDetails: 'The name, the number and the colors.',
    unitLabel: 'each',
    emoji: '⚽',
  },
  {
    id: 'soccer-ball-keychain',
    collection: 'year-round',
    name: 'Soccer Ball Name Keychain',
    description: 'Classic pentagon soccer ball with a raised name tag — great for team gifts and bags.',
    personalizationHint: 'Name + text color',
    requiredDetails: 'The name to print.',
    unitLabel: 'each',
    emoji: '🥅',
  },
  {
    id: 'couple-heart-keychains',
    collection: 'year-round',
    name: 'Couple Heart Keychains',
    description: 'One heart that splits in two, each half with a name. Anniversaries and Valentine gifts.',
    personalizationHint: 'Two names + two colors',
    requiredDetails: 'The two names.',
    unitLabel: 'set of 2',
    emoji: '💞',
  },
  {
    id: 'kids-name-sign',
    collection: 'year-round',
    name: 'Kids Room Name Sign',
    description: 'Chunky standing name sign on a colored base, for shelves and nurseries.',
    personalizationHint: 'Name (up to 8 letters) + letter and base colors',
    requiredDetails: 'The name to print.',
    unitLabel: 'each',
    emoji: '🧸',
  },
  {
    id: 'business-card-holder',
    collection: 'business',
    name: 'Logo Business Card Holder',
    description: 'Counter card holder with your logo raised on the front.',
    personalizationHint: 'Business name (attach your logo below)',
    requiredDetails: 'The business name (the logo is attached or sent later by email/WhatsApp).',
    unitLabel: 'each',
    emoji: '💼',
  },
  {
    id: 'business-table-numbers',
    collection: 'business',
    name: 'Table Number Set',
    description: 'Clean table numbers for restaurants, weddings and events.',
    personalizationHint: 'Numbers range (e.g. 1-10) + color',
    requiredDetails: 'The range of numbers.',
    unitLabel: 'set of 10',
    emoji: '🔢',
  },
  {
    id: 'business-logo-keychains',
    collection: 'business',
    name: 'Logo Keychains (bulk)',
    description: 'Branded keychains for clients and events, in your colors.',
    personalizationHint: 'Business name + colors (attach your logo below)',
    requiredDetails: 'The business name (the logo is attached or sent later by email/WhatsApp).',
    unitLabel: 'pack of 50',
    emoji: '🏷️',
  },
];

const PRODUCT_IDS = PRODUCTS.map((product) => product.id) as [string, ...string[]];

export function getProduct(productId: string) {
  return PRODUCTS.find((product) => product.id === productId) ?? null;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const OrderInputSchema = z
  .object({
    productId: z.enum(PRODUCT_IDS, { error: 'Please choose a product.' }),
    quantity: z.coerce.number().int().min(1).max(50),
    personalization: z.string().trim().min(1, 'Tell us what to personalize.').max(300),
    neededBy: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    fulfillment: z.enum(['pickup', 'shipping']),
    shippingZip: optionalText(10),
    name: z.string().trim().min(2, 'Please enter your name.').max(120),
    email: z.email('Please enter a valid email.').max(200),
    // Required: customer service continues on WhatsApp after the order.
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((value) => { const digits = value.replace(/\D/g, ''); return digits.length === 10 || (digits.length >= 11 && digits.length <= 15); }, {
        message: 'Enter a WhatsApp or mobile number (US: 10 digits; other countries: start with +country code).',
      }),
    notes: optionalText(1000),
    company: z.string().max(120).optional(),
    startedAt: z.number().optional(),
  })
  .refine(
    (order) => order.fulfillment === 'pickup' || /^\d{5}(-\d{4})?$/.test(order.shippingZip ?? ''),
    { message: 'Enter a 5-digit US ZIP code for shipping.', path: ['shippingZip'] },
  );

export type OrderInput = z.infer<typeof OrderInputSchema>;
