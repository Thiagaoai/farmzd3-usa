import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { FARMZ3D_WHATSAPP, whatsappLink } from '@/lib/farmz3d/contact';

export const metadata: Metadata = { title: 'Thank you — Farmz3D', robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const orderNumber = /^FZ-\d{6}-[A-Z2-9]{4}$/.test(order ?? '') ? order : null;

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F5F3] px-6 text-center text-[#0B0C0E]">
      <div className="max-w-md">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#2B5BFF]" />
        <h1 className="mt-5 text-3xl font-semibold">Payment received — thank you!</h1>
        <p className="mt-3 text-[#5A5F66]">
          {orderNumber ? (
            <>
              Your order <strong className="font-mono text-[#0B0C0E]">{orderNumber}</strong> is now in our print queue.
            </>
          ) : (
            'Your order is now in our print queue.'
          )}{' '}
          We will email you when it ships or is ready for pickup.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-[#0B0C0E] px-6 py-3 text-sm font-semibold text-white">
            Back to the shop
          </Link>
          <a
            href={whatsappLink(FARMZ3D_WHATSAPP, orderNumber ? `Hi! I just paid for order ${orderNumber}.` : 'Hi Farmz3D!')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
          >
            WhatsApp us
          </a>
        </div>
      </div>
    </main>
  );
}
