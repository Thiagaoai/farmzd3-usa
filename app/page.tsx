import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { COLLECTIONS, formatUsd, type CollectionId } from '@/lib/farmz3d/catalog';
import { FARMZ3D_WHATSAPP, formatUsPhone, whatsappLink } from '@/lib/farmz3d/contact';
import { CUSTOM_PRODUCT } from '@/lib/farmz3d/custom';
import { LIFESTYLE_MEDIA } from '@/lib/farmz3d/media';
import { getLiveCatalog } from '@/lib/farmz3d/pricing';
import { formatLongDate, getActiveCampaign, getUpcomingCampaigns, newYorkToday } from '@/lib/farmz3d/season';
import { body, display, mono } from './fonts';
import HeroCanvas from './HeroCanvas';
import { MotionRoot, Reveal, TiltCard } from './Motion';
import OrderForm from './OrderForm';
import WhatsAppIcon from './WhatsAppIcon';

// Re-render hourly so the active campaign and countdown follow the calendar.
export const revalidate = 3600;

const STORE_URL = process.env.FARMZ3D_SITE_URL ? `${process.env.FARMZ3D_SITE_URL.replace(/\/$/, '')}/` : '/';
const CHAT_LINK = whatsappLink(FARMZ3D_WHATSAPP, 'Hi Bruna! I have a question about a Farmz3D order.');

export const metadata: Metadata = {
  title: 'Farmz3D — Personalized 3D-Printed Holiday Gifts',
  description:
    'Custom 3D-printed Halloween, Thanksgiving and Christmas gifts: name ornaments, photo lithophanes, place cards and more. Made to order.',
  // With its own domain (FARMZ3D_SITE_URL=https://farmz3d.shop) the store root is the canonical URL.
  alternates: { canonical: STORE_URL },
  openGraph: {
    title: 'Farmz3D — Personalized 3D-Printed Holiday Gifts',
    description: 'Made-to-order personalized gifts for Halloween, Thanksgiving and Christmas.',
    url: STORE_URL,
    type: 'website',
    locale: 'en_US',
  },
};

const FAQ = [
  {
    q: 'When do I pay?',
    a: 'After we review your order we email you a confirmation and a secure payment link. Nothing is charged before you approve it.',
  },
  {
    q: 'How do photo lithophanes work?',
    a: 'We turn your photo into a 3D print with different thicknesses. When light shines through it, the photo appears. Attach the photo in the order form (or send it on WhatsApp).',
  },
  {
    q: 'What are the pieces made of?',
    a: 'PLA printed in our workshop. Cookie cutters use food-contact PLA; hand wash only.',
  },
  {
    q: 'Can I talk to someone?',
    a: `Yes — message Bruna on WhatsApp at ${formatUsPhone(FARMZ3D_WHATSAPP)}. After you order, the confirmation screen has a button that sends us your order number.`,
  },
  {
    q: 'What if I need it faster?',
    a: 'Add your date in "Needed by". We confirm by email whether we can make it before you pay.',
  },
];

const STEPS = [
  ['Order', 'Pick the piece and tell us the names, text or date.'],
  ['Confirm', 'You get the final price and a secure payment link by email.'],
  ['Print', 'Printed layer by layer at 0.12 mm, finished by hand.'],
  ['Deliver', 'Shipped by USPS, or picked up locally.'],
];

export default async function Farmz3dPage() {
  const { products: PRODUCTS, leadDays, shippingCents } = await getLiveCatalog();
  const campaign = getActiveCampaign(new Date(), leadDays);
  const upcoming = getUpcomingCampaigns(new Date(), leadDays);
  const today = newYorkToday();
  const instagram = process.env.NEXT_PUBLIC_FARMZ3D_INSTAGRAM?.replace(/^@/, '');

  const collectionOrder: CollectionId[] = [
    campaign.id,
    ...COLLECTIONS.map((collection) => collection.id).filter((id) => id !== campaign.id),
  ];
  const firstProduct = PRODUCTS.find((product) => product.collection === campaign.id && !product.soldOut) ?? PRODUCTS.find((product) => !product.soldOut) ?? PRODUCTS[0];
  const customOption = {
    id: CUSTOM_PRODUCT.id,
    name: CUSTOM_PRODUCT.name,
    collectionName: 'Custom design',
    priceCents: 0,
    unitLabel: CUSTOM_PRODUCT.unitLabel,
    personalizationHint: CUSTOM_PRODUCT.personalizationHint,
  };
  const catalogOptions = collectionOrder.flatMap((collectionId) => {
    const collection = COLLECTIONS.find((item) => item.id === collectionId);
    return PRODUCTS.filter((product) => product.collection === collectionId && !product.soldOut).map((product) => ({
      id: product.id,
      name: product.name,
      collectionName: collection?.name ?? collectionId,
      priceCents: product.priceCents,
      unitLabel: product.unitLabel,
      personalizationHint: product.personalizationHint,
    }));
  });
  // "Custom design" is always offered first: no price, a quote by email.
  const productOptions = [customOption, ...catalogOptions];

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-[#F5F5F3] text-[#0B0C0E] fz-root selection:bg-[#2B5BFF] selection:text-white`}
    >
      {/* Floating glass nav */}
      <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#0B0C0E]/85 px-4 py-2.5 text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-5">
          <a href="#top" className="text-[15px] font-semibold tracking-[0.18em] fz-display">
            FARMZ<span className="text-[#8EA3FF]">3D</span>
          </a>
          <nav className="flex items-center gap-1 text-[13px] sm:gap-2">
            <a href="#collections" className="hidden rounded-full px-3 py-1.5 text-white/70 transition hover:text-white sm:inline">
              Shop
            </a>
            <a href="#how" className="hidden rounded-full px-3 py-1.5 text-white/70 transition hover:text-white sm:inline">
              Process
            </a>
            <a
              href={CHAT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-white/70 transition hover:text-white sm:inline-flex"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a href="#order" className="rounded-full bg-white px-4 py-1.5 font-medium text-[#0B0C0E] transition hover:bg-[#DDE4FF]">
              Order now
            </a>
          </nav>
        </div>
      </header>

      <MotionRoot>
        <main id="top">
          {/* HERO */}
          <section className="relative overflow-hidden bg-[#0B0C0E] text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  'radial-gradient(60% 55% at 72% 45%, rgba(91,124,255,0.22), transparent 70%), radial-gradient(40% 40% at 15% 90%, rgba(255,255,255,0.06), transparent 70%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              }}
            />

            <div className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-6 px-4 pb-14 pt-28 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70 fz-mono">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8EA3FF]" />
                  {campaign.name} · now printing
                </p>
                <h1 className="mt-6 text-[42px] font-medium leading-[1.02] tracking-[-0.02em] fz-display sm:text-6xl lg:text-[76px]">
                  Gifts,
                  <br />
                  printed
                  <br />
                  <span className="bg-gradient-to-r from-white via-[#C9D3FF] to-[#8EA3FF] bg-clip-text text-transparent">layer by layer.</span>
                </h1>
                <p className="mt-6 max-w-md text-[17px] leading-relaxed text-white/60">
                  Personalized ornaments, photo lithophanes and keepsakes — designed with you, 3D-printed to order.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#order"
                    data-product-id={firstProduct.id}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-[#0B0C0E] transition hover:bg-[#DDE4FF]"
                  >
                    Order for {campaign.name}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href="#collections"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 font-medium text-white/90 transition hover:border-white/40 hover:bg-white/5"
                  >
                    Explore the shop
                  </a>
                </div>

                <div className="mt-12 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center fz-mono">
                  <div className="bg-[#0B0C0E]/80 px-3 py-4">
                    <p className="text-2xl text-white">{String(campaign.daysUntilOrderBy).padStart(2, '0')}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">days left</p>
                  </div>
                  <div className="bg-[#0B0C0E]/80 px-3 py-4">
                    <p className="text-2xl text-white">{formatLongDate(campaign.orderByDate).split(', ')[1]}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">order by</p>
                  </div>
                  <div className="bg-[#0B0C0E]/80 px-3 py-4">
                    <p className="text-2xl text-white">{formatUsd(shippingCents).replace('.00', '')}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">flat ship</p>
                  </div>
                </div>
              </Reveal>

              <div className="relative h-[380px] sm:h-[480px] lg:h-[640px]">
                <HeroCanvas />
                <div className="pointer-events-none absolute bottom-3 right-2 text-right text-[10px] uppercase tracking-[0.2em] text-white/35 fz-mono sm:bottom-6">
                  PLA · 0.12 mm layers
                  <br />
                  drag to rotate
                </div>
              </div>
            </div>

            {/* Upcoming campaign rail */}
            <div className="relative border-t border-white/10">
              <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 px-4 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
                {upcoming.map((item, index) => (
                  <div key={`${item.id}-${item.holidayDate}`} className="flex items-center justify-between gap-4 py-4 sm:px-6 first:sm:pl-0">
                    <span className={index === 0 ? 'text-white' : 'text-white/55'}>{item.name}</span>
                    <span className="text-[12px] uppercase tracking-[0.14em] text-white/45 fz-mono">
                      order by {formatLongDate(item.orderByDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Ticker */}
          <div className="overflow-hidden border-b border-[#E4E5E8] bg-white py-3">
            <div className="fz-marquee flex w-max gap-10 whitespace-nowrap text-[12px] uppercase tracking-[0.25em] text-[#8A8F97] fz-mono">
              {Array.from({ length: 2 }).map((_, copy) => (
                <div key={copy} className="flex gap-10" aria-hidden={copy === 1}>
                  {['Made to order', 'Personalized', 'Printed at 0.12 mm', 'Finished by hand', 'Pay after we confirm', 'Ships USPS', 'Local pickup'].map((item) => (
                    <span key={item} className="flex items-center gap-10">
                      {item}
                      <span className="h-1 w-1 rounded-full bg-[#2B5BFF]" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* SHOP */}
          <section id="collections" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#2B5BFF] fz-mono">The shop</p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em] fz-display sm:text-5xl">Pick a piece.</h2>
              </div>
              <nav className="flex flex-wrap gap-2 text-[13px]">
                {collectionOrder.map((id) => {
                  const collection = COLLECTIONS.find((item) => item.id === id);
                  return (
                    <a
                      key={id}
                      href={`#c-${id}`}
                      className="rounded-full border border-[#DCDDE0] bg-white px-3.5 py-1.5 text-[#5A5F66] transition hover:border-[#0B0C0E] hover:text-[#0B0C0E]"
                    >
                      {collection?.name}
                    </a>
                  );
                })}
                <a
                  href="#custom"
                  className="rounded-full border border-[#2B5BFF] bg-[#2B5BFF] px-3.5 py-1.5 text-white transition hover:bg-[#1E47D9]"
                >
                  ✨ Custom design
                </a>
              </nav>
            </Reveal>

            {collectionOrder.map((collectionId) => {
              const collection = COLLECTIONS.find((item) => item.id === collectionId);
              const products = PRODUCTS.filter((product) => product.collection === collectionId);
              if (!collection || products.length === 0) return null;
              return (
                <div key={collection.id} id={`c-${collection.id}`} className="mt-16 scroll-mt-28">
                  <Reveal className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E4E5E8] pb-4">
                    <h3 className="text-xl font-medium fz-display">{collection.name}</h3>
                    <p className="text-sm text-[#8A8F97]">{collection.tagline}</p>
                  </Reveal>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product, index) => {
                      return (
                        <Reveal key={product.id} delay={index * 0.06} className="h-full">
                          <TiltCard className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E4E5E8] bg-white transition-shadow duration-500 hover:shadow-[0_40px_80px_-40px_rgba(11,12,14,0.35)]">
                            <div className="relative aspect-[4/5] overflow-hidden bg-[#ECEDEF]">
                              {product.imageSrc ? (
                                <Image
                                  src={product.imageSrc}
                                  alt={product.imageAlt}
                                  fill
                                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                                />
                              ) : (
                                <span className="grid h-full place-items-center text-6xl">{product.emoji}</span>
                              )}
                              {product.soldOut && (
                                <span className="absolute right-4 top-4 rounded-full bg-[#0B0C0E] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white fz-mono">
                                  Sold out
                                </span>
                              )}
                              {!product.soldOut && product.stock !== null && product.stock <= product.lowStockAt && (
                                <span className="absolute right-4 top-4 rounded-full bg-[#2B5BFF] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white fz-mono">
                                  Only {product.stock} left
                                </span>
                              )}
                              <span className="absolute left-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#0B0C0E] backdrop-blur fz-mono">
                                {product.unitLabel}
                              </span>
                            </div>
                            <div className="flex flex-1 flex-col p-5 [transform:translateZ(30px)]">
                              <h4 className="text-[17px] font-medium">{product.name}</h4>
                              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[#5A5F66]">{product.description}</p>
                              <div className="mt-5 flex items-center justify-between">
                                <p className="text-lg fz-mono">{formatUsd(product.priceCents)}</p>
                                {product.soldOut ? (
                                  <span className="rounded-full bg-[#ECEDEF] px-4 py-2 text-[13px] font-medium text-[#8A8F97]">Sold out</span>
                                ) : (
                                  <a
                                    href="#order"
                                    data-product-id={product.id}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0C0E] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2B5BFF]"
                                  >
                                    Order <ArrowUpRight className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </TiltCard>
                        </Reveal>
                      );
                    })}
                  </div>
                  {collection.id === 'business' && (
                    <p className="mt-5 text-sm text-[#5A5F66]">
                      Need 50+ pieces or a custom logo?{' '}
                      <a href={CHAT_LINK} target="_blank" rel="noopener noreferrer" className="font-medium text-[#2B5BFF] underline-offset-4 hover:underline">
                        Ask for a volume quote on WhatsApp →
                      </a>
                    </p>
                  )}
                </div>
              );
            })}
            <Reveal>
              <div id="custom" className="mt-16 grid scroll-mt-28 gap-6 overflow-hidden rounded-[28px] bg-[#0B0C0E] p-8 text-white sm:grid-cols-[1.4fr_1fr] sm:items-center sm:p-12">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#8EA3FF] fz-mono">Custom design</p>
                  <h3 className="mt-3 text-3xl font-medium leading-tight fz-display sm:text-4xl">Have an idea? We print it.</h3>
                  <p className="mt-3 max-w-lg text-white/70">
                    Replacement parts, gifts, signs, logos, cosplay pieces — describe it, attach a photo or sketch, and we email you a quote. Free, no obligation.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <a
                    href="#order"
                    data-product-id={CUSTOM_PRODUCT.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#0B0C0E] transition hover:bg-[#DDE4FF]"
                  >
                    Get a free quote <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href={CHAT_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
                    <WhatsAppIcon className="h-4 w-4" /> or send the idea on WhatsApp
                  </a>
                </div>
              </div>
            </Reveal>
          </section>

          {/* LIFESTYLE */}
          <section className="bg-[#0B0C0E] text-white">
            <div className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.4fr_1fr]">
              <Reveal className="relative min-h-[320px] overflow-hidden rounded-[28px] lg:min-h-[520px]">
                <Image src={LIFESTYLE_MEDIA.tree.src} alt={LIFESTYLE_MEDIA.tree.alt} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-6 sm:p-8">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/60 fz-mono">Photo lithophane</p>
                  <p className="mt-2 max-w-sm text-2xl font-medium leading-tight fz-display sm:text-3xl">The photo appears when the light comes on.</p>
                </div>
              </Reveal>
              <div className="grid gap-5">
                <Reveal delay={0.1} className="relative min-h-[320px] overflow-hidden rounded-[28px]">
                  <Image src={LIFESTYLE_MEDIA.family.src} alt={LIFESTYLE_MEDIA.family.alt} fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" />
                </Reveal>
                <Reveal delay={0.2} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#8EA3FF] fz-mono">Made for keeping</p>
                  <p className="mt-2 text-lg leading-relaxed text-white/75">
                    Every piece carries a name, a date or a face — the details that make it theirs.
                  </p>
                </Reveal>
              </div>
            </div>
          </section>

          {/* PROCESS */}
          <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
            <Reveal>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#2B5BFF] fz-mono">The process</p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em] fz-display sm:text-5xl">From your words to layers.</h2>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-[#E4E5E8] bg-[#E4E5E8] sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([title, text], index) => (
                <Reveal key={title} delay={index * 0.08} className="bg-white p-6 sm:p-8">
                  <div>
                    <span className="text-[12px] tracking-[0.2em] text-[#2B5BFF] fz-mono">0{index + 1}</span>
                    <h3 className="mt-6 text-xl font-medium fz-display">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5A5F66]">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ORDER */}
          <section id="order" className="border-t border-[#E4E5E8] bg-[#ECEDEF]/60">
            <div className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#2B5BFF] fz-mono">Order</p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em] fz-display sm:text-5xl">Make it theirs.</h2>
                <p className="mt-4 text-[#5A5F66]">
                  {campaign.name} orders close on <strong className="text-[#0B0C0E]">{formatLongDate(campaign.orderByDate)}</strong>. You only pay after we confirm the details.
                </p>
                <dl className="mt-10 divide-y divide-[#DCDDE0] border-y border-[#DCDDE0]">
                  {FAQ.map((item) => (
                    <details key={item.q} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                        {item.q}
                        <span className="text-[#8A8F97] transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-[#5A5F66]">{item.a}</p>
                    </details>
                  ))}
                </dl>
              </div>
              <OrderForm products={productOptions} defaultProductId={firstProduct.id} today={today} shippingCents={shippingCents} whatsapp={FARMZ3D_WHATSAPP} />
            </div>
          </section>
        </main>
      </MotionRoot>

      {/* Floating WhatsApp button */}
      <a
        href={CHAT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Farmz3D on WhatsApp"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.7)] transition hover:scale-105 hover:bg-[#1EBE5A]"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>

      <footer className="bg-[#0B0C0E] py-10 pb-24 text-white/50 sm:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="tracking-[0.18em] text-white fz-display">
            FARMZ<span className="text-[#8EA3FF]">3D</span>
          </p>
          <p className="text-xs">
            © {today.slice(0, 4)} Farmz3D · Personalized 3D-printed gifts ·{' '}
            <a href={CHAT_LINK} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">
              WhatsApp {formatUsPhone(FARMZ3D_WHATSAPP)}
            </a>
            {instagram && (
              <>
                {' · '}
                <a href={`https://www.instagram.com/${instagram}/`} className="text-white/80 hover:text-white" rel="noopener noreferrer" target="_blank">
                  @{instagram}
                </a>
              </>
            )}
          </p>
          <p className="text-xs">Product images are AI-generated previews; each piece is printed to order and may vary slightly.</p>
        </div>
      </footer>
    </div>
  );
}
