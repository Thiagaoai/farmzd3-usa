'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Minus, Plus, Trash2, X } from 'lucide-react';

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' },
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; field?: string; id?: string };
  if (!response.ok || !data.ok) throw Object.assign(new Error(data.message ?? 'Falha ao salvar.'), { field: data.field });
  return data;
}

export function StockControl({ id, stock, lowStockAt, active }: { id: string; stock: number | null; lowStockAt: number; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      await send(`/api/admin/products/${id}`, 'PATCH', body);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha');
    } finally {
      setBusy(false);
    }
  }

  const tone = stock === null ? 'text-zinc-400' : stock === 0 ? 'text-red-300' : stock <= lowStockAt ? 'text-amber-200' : 'text-emerald-300';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stock === null ? (
        <button type="button" disabled={busy} onClick={() => patch({ stock: 0 })} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:text-white">
          Sob encomenda · controlar estoque
        </button>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={() => patch({ adjust: -1 })} className="rounded-full bg-white/5 p-1.5 hover:bg-white/10" aria-label="Menos 1">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className={`min-w-10 text-center font-mono font-bold ${tone}`}>{stock}</span>
          <button type="button" disabled={busy} onClick={() => patch({ adjust: 1 })} className="rounded-full bg-white/5 p-1.5 hover:bg-white/10" aria-label="Mais 1">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" disabled={busy} onClick={() => patch({ adjust: 10 })} className="rounded-full bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
            +10
          </button>
          <button type="button" disabled={busy} onClick={() => patch({ stock: null })} className="text-[11px] text-zinc-500 hover:text-white">
            sob encomenda
          </button>
        </>
      )}
      <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
        <input type="checkbox" checked={active} disabled={busy} onChange={(event) => patch({ active: event.target.checked })} className="accent-cyan-300" />
        à venda
      </label>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
      {error && <span className="w-full text-xs text-red-300">{error}</span>}
    </div>
  );
}

export type ProductFormValues = {
  id: string;
  collection: string;
  name: string;
  description: string;
  personalizationHint: string;
  requiredDetails: string;
  unitLabel: string;
  emoji: string;
  price: string;
  cost: string;
  stock: string;
  lowStockAt: string;
  active: boolean;
  sortOrder: string;
  imageAlt: string;
};

const input =
  'w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/60 placeholder:text-zinc-600';
const label = 'grid gap-1.5 text-xs font-semibold text-zinc-400';

export function ProductForm({
  mode,
  initial,
  collections,
  imageSrc,
  hasUpload = false,
  decisionPrice,
}: {
  mode: 'create' | 'edit';
  hasUpload?: boolean;
  initial: ProductFormValues;
  collections: { id: string; name: string }[];
  imageSrc: string | null;
  decisionPrice: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [state, setState] = useState<{ busy: boolean; error: string; field?: string }>({ busy: false, error: '' });
  const set = (key: keyof ProductFormValues) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));

  function onImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setState({ busy: false, error: 'A foto deve ter no máximo 8 MB.', field: 'image' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState({ busy: true, error: '' });
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.append(key, String(value));
    form.append('mode', mode);
    if (image) form.append('image', image, image.name);
    if (removeImage) form.append('removeImage', 'true');
    try {
      const data = await send('/api/admin/products', 'POST', form);
      router.push(`/admin/produtos?saved=${encodeURIComponent(data.id ?? values.id)}`);
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : 'Falha', field: (error as { field?: string }).field });
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir "${values.name}"? Pedidos antigos continuam com o nome e o preço.`)) return;
    setState({ busy: true, error: '' });
    try {
      await send(`/api/admin/products/${values.id}`, 'DELETE');
      router.push('/admin/produtos');
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : 'Falha' });
    }
  }

  const shownImage = preview ?? (removeImage ? null : imageSrc);
  const err = (field: string) => (state.field === field ? 'border-red-400/60' : '');

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <div className="grid content-start gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
          {shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of the admin's own upload
            <img src={shownImage} alt={values.imageAlt || values.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-6xl">{values.emoji || '🎁'}</div>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black">
          <ImagePlus className="h-4 w-4" /> {shownImage ? 'Trocar foto' : 'Enviar foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} className="sr-only" />
        </label>
        {(hasUpload || preview) && !removeImage && (
          <button
            type="button"
            onClick={() => {
              setImage(null);
              setPreview(null);
              setRemoveImage(true);
            }}
            className="inline-flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Remover foto enviada
          </button>
        )}
        <p className="text-xs text-zinc-500">JPG, PNG ou WebP até 8 MB. Formato ideal: vertical 4:5 (ex.: 1600×2000), fundo claro. Sem foto enviada, a loja usa a prévia de IA.</p>
        <label className={label}>
          Descrição da foto (acessibilidade)
          <input value={values.imageAlt} onChange={set('imageAlt')} className={input} placeholder="Ex.: Ornamento branco com o nome EMMA" />
        </label>
      </div>

      <div className="grid content-start gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Nome do produto (aparece na loja, em inglês)
            <input value={values.name} onChange={set('name')} required className={`${input} ${err('name')}`} />
          </label>
          <label className={label}>
            Código (URL interna)
            <input value={values.id} onChange={set('id')} disabled={mode === 'edit'} required className={`${input} ${err('id')} disabled:opacity-50`} placeholder="ex.: caneca-com-nome" />
          </label>
          <label className={label}>
            Coleção
            <select value={values.collection} onChange={set('collection')} className={input}>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Descrição
            <textarea value={values.description} onChange={set('description')} rows={3} className={input} />
          </label>
          <label className={label}>
            Dica de personalização (formulário)
            <input value={values.personalizationHint} onChange={set('personalizationHint')} className={input} placeholder="Name + color" />
          </label>
          <label className={label}>
            O que é obrigatório (para o Jev)
            <input value={values.requiredDetails} onChange={set('requiredDetails')} className={input} placeholder="The name to print." />
          </label>
        </div>

        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Preço e estoque</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={label}>
            Preço de venda (US$)
            <input value={values.price} onChange={set('price')} inputMode="decimal" className={`${input} ${err('price')}`} placeholder={decisionPrice ? `vazio = ${decisionPrice}` : '19.00'} />
            {decisionPrice && <span className="font-normal text-zinc-500">Vazio = segue a decisão aprovada ({decisionPrice}).</span>}
          </label>
          <label className={label}>
            Custo (US$, opcional)
            <input value={values.cost} onChange={set('cost')} inputMode="decimal" className={input} placeholder="3.50" />
          </label>
          <label className={label}>
            Unidade
            <input value={values.unitLabel} onChange={set('unitLabel')} className={input} placeholder="each / set of 3" />
          </label>
          <label className={label}>
            Estoque (unidades)
            <input value={values.stock} onChange={set('stock')} inputMode="numeric" className={`${input} ${err('stock')}`} placeholder="vazio = sob encomenda" />
          </label>
          <label className={label}>
            Avisar quando chegar em
            <input value={values.lowStockAt} onChange={set('lowStockAt')} inputMode="numeric" className={input} />
          </label>
          <label className={label}>
            Ordem na loja
            <input value={values.sortOrder} onChange={set('sortOrder')} inputMode="numeric" className={input} />
          </label>
          <label className={label}>
            Emoji
            <input value={values.emoji} onChange={set('emoji')} className={input} maxLength={8} />
          </label>
          <label className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <input type="checkbox" checked={values.active} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-cyan-300" />
            À venda na loja
          </label>
        </div>

        {state.error && <p className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{state.error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-black disabled:opacity-50">
            {state.busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
          </button>
          {mode === 'edit' && (
            <button type="button" onClick={remove} disabled={state.busy} className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-red-300 hover:bg-red-400/10">
              <Trash2 className="h-4 w-4" /> Excluir produto
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
