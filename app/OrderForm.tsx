'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';
import { whatsappLink } from '@/lib/farmz3d/contact';
import WhatsAppIcon from './WhatsAppIcon';

type ProductOption = {
  id: string;
  name: string;
  collectionName: string;
  priceCents: number;
  unitLabel: string;
  personalizationHint: string;
};

type Props = {
  products: ProductOption[];
  defaultProductId: string;
  today: string;
  shippingCents: number;
  whatsapp: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Status = { state: 'idle' | 'loading' | 'error'; message?: string } | { state: 'success'; orderNumber: string; totalCents: number; productName: string; quantity: number };

const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const inputClass =
  'w-full rounded-xl border border-[#DCDDE0] bg-white px-4 py-3 text-[15px] font-normal text-[#0B0C0E] outline-none transition focus:border-[#2B5BFF] focus:ring-2 focus:ring-[#2B5BFF]/20';

export default function OrderForm({ products, defaultProductId, today, shippingCents, whatsapp }: Props) {
  const [productId, setProductId] = useState(defaultProductId);
  const [quantity, setQuantity] = useState(1);
  const [personalization, setPersonalization] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [fulfillment, setFulfillment] = useState<'shipping' | 'pickup'>('shipping');
  const [shippingZip, setShippingZip] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [company, setCompany] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  useEffect(() => {
    setStartedAt(Date.now());

    // "Order this" buttons in the catalog carry data-product-id.
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-product-id]');
      const id = target?.dataset.productId;
      if (id) setProductId(id);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const product = products.find((option) => option.id === productId) ?? products[0];
  const collections = Array.from(new Set(products.map((option) => option.collectionName)));

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setImageError('');
    clearImage();
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('The image must be 8 MB or smaller.');
      return;
    }
    setImage(file);
    // HEIC has no preview outside Safari; the file still uploads.
    setImagePreview(file.type.startsWith('image/') && !/hei[cf]/i.test(file.type) ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ state: 'loading' });

    const form = new FormData();
    const fields: Record<string, string> = {
      productId,
      quantity: String(quantity),
      personalization,
      neededBy,
      fulfillment,
      shippingZip: fulfillment === 'shipping' ? shippingZip : '',
      name,
      email,
      phone,
      notes,
      company,
      startedAt: String(startedAt),
    };
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (image) form.append('image', image, image.name);

    try {
      const response = await fetch('/api/orders', { method: 'POST', body: form });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        orderNumber?: string | null;
        estimatedTotalCents?: number;
      };

      if (!response.ok || !data.ok || !data.orderNumber) {
        throw new Error(data.message ?? 'Something went wrong. Please try again.');
      }

      setStatus({
        state: 'success',
        orderNumber: data.orderNumber,
        totalCents: data.estimatedTotalCents ?? 0,
        productName: product?.name ?? '',
        quantity,
      });
      clearImage();
    } catch (error) {
      setStatus({ state: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' });
    }
  }

  if (status.state === 'success') {
    return (
      <div className="rounded-3xl border border-[#D6DEFF] bg-[#F2F5FF] p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#2B5BFF]" />
        <h3 className="mt-4 text-2xl font-bold text-[#0B0C0E]">Order received!</h3>
        <p className="mt-2 text-[#5A5F66]">
          Your order number is <strong className="font-mono text-[#0B0C0E]">{status.orderNumber}</strong>.
        </p>
        <p className="mt-2 text-[#5A5F66]">
          Estimated total {usd(status.totalCents)}. We will email you a confirmation and a payment link —
          nothing is charged until you approve it.
        </p>
        <a
          href={whatsappLink(whatsapp, `Hi Bruna! I just placed Farmz3D order ${status.orderNumber} (${status.productName} x${status.quantity}).`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1EBE5A]"
        >
          <WhatsAppIcon className="h-4 w-4" /> Chat with us on WhatsApp
        </a>
        <p className="mt-2 text-xs text-[#8A8F97]">Faster answers, photos of your piece while it prints.</p>
        <br />
        <button
          type="button"
          onClick={() => {
            setStatus({ state: 'idle' });
            setPersonalization('');
            setNotes('');
          }}
          className="mt-6 rounded-full border border-[#0B0C0E] px-6 py-2.5 text-sm font-semibold text-[#0B0C0E] transition hover:bg-[#0B0C0E] hover:text-white"
        >
          Place another order
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 rounded-[28px] border border-[#E4E5E8] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(11,12,14,0.25)] sm:p-8" noValidate={false}>
      <label className="hidden" aria-hidden="true">
        Company
        <input value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          Product
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass} required>
            {collections.map((collection) => (
              <optgroup key={collection} label={collection}>
                {products
                  .filter((option) => option.collectionName === collection)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} — {usd(option.priceCents)} {option.unitLabel}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          Quantity
          <input
            type="number"
            min={1}
            max={50}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
            className={inputClass}
            required
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
        Personalization
        <textarea
          value={personalization}
          onChange={(event) => setPersonalization(event.target.value)}
          placeholder={product?.personalizationHint}
          maxLength={300}
          rows={3}
          className={inputClass}
          required
        />
        <span className="text-xs font-normal text-[#8A8F97]">{product?.personalizationHint}</span>
      </label>

      <div className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
        <span>
          Reference image <span className="font-normal text-[#8A8F97]">(optional — photo for lithophanes, your logo or a sketch)</span>
        </span>
        {image ? (
          <div className="flex items-center gap-4 rounded-xl border border-[#DCDDE0] bg-white p-3">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset
              <img src={imagePreview} alt="Selected reference" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-lg bg-[#F2F5FF] text-[#2B5BFF]">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1 font-normal">
              <p className="truncate text-[#0B0C0E]">{image.name}</p>
              <p className="text-xs text-[#8A8F97]">{image.size < 1024 * 1024 ? `${Math.max(1, Math.round(image.size / 1024))} KB` : `${(image.size / 1024 / 1024).toFixed(1)} MB`}</p>
            </div>
            <button type="button" onClick={clearImage} className="rounded-full p-2 text-[#5A5F66] transition hover:bg-[#F5F5F3]" aria-label="Remove image">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#C9CBD0] bg-white px-4 py-5 font-medium text-[#5A5F66] transition hover:border-[#2B5BFF] hover:text-[#2B5BFF]">
            <ImagePlus className="h-5 w-5" /> Add a photo or logo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} className="sr-only" />
          </label>
        )}
        {imageError && <span className="text-xs font-normal text-red-600">{imageError}</span>}
        <span className="text-xs font-normal text-[#8A8F97]">JPG, PNG or WebP up to 8 MB. Only our team sees it.</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          <span>
            Needed by <span className="font-normal text-[#8A8F97]">(optional)</span>
          </span>
          <input type="date" min={today} value={neededBy} onChange={(event) => setNeededBy(event.target.value)} className={inputClass} />
        </label>
        <fieldset className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          <legend className="mb-2">Delivery</legend>
          <div className="flex gap-3">
            {(['shipping', 'pickup'] as const).map((option) => (
              <label
                key={option}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-3 font-medium transition ${
                  fulfillment === option ? 'border-[#2B5BFF] bg-[#2B5BFF]/10 text-[#0B0C0E]' : 'border-[#DCDDE0] bg-white text-[#5A5F66]'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={option}
                  checked={fulfillment === option}
                  onChange={() => setFulfillment(option)}
                  className="sr-only"
                />
                {option === 'shipping' ? 'Ship it' : 'Local pickup'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {fulfillment === 'shipping' && (
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          Shipping ZIP code
          <input
            value={shippingZip}
            onChange={(event) => setShippingZip(event.target.value)}
            inputMode="numeric"
            pattern="\d{5}(-\d{4})?"
            placeholder="02601"
            className={inputClass}
            required
          />
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          Your name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} required minLength={2} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={inputClass} required />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          WhatsApp number
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            placeholder="(508) 555-0123"
            className={inputClass}
            required
            minLength={10}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#0B0C0E]">
          <span>
            Notes <span className="font-normal text-[#8A8F97]">(optional)</span>
          </span>
          <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} className={inputClass} />
        </label>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 border-t border-[#E4E5E8] pt-5 sm:flex-row sm:items-center">
        <p className="text-sm text-[#5A5F66]">
          Estimated: <strong className="text-lg text-[#0B0C0E]">{product ? usd(product.priceCents * quantity + (fulfillment === 'shipping' ? shippingCents : 0)) : '—'}</strong>{' '}
          <span className="text-xs">{fulfillment === 'shipping' ? `incl. ${usd(shippingCents)} shipping` : 'local pickup'} · pay after we confirm</span>
        </p>
        <button
          type="submit"
          disabled={status.state === 'loading'}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#0B0C0E] px-8 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#2B5BFF] disabled:opacity-60 sm:w-auto"
        >
          {status.state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          Send my order
        </button>
      </div>

      {status.state === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.message}
        </p>
      )}
    </form>
  );
}
