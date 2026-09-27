import type { Decision } from './schema';

const USPS_RATES = 'https://pe.usps.com/cpim/ftp/manuals/dmm300/notice123.pdf';
const USPS_GROUND = 'https://www.usps.com/ship/ground-advantage.htm';
const USPS_HOLIDAY_2026 = 'https://www.thetelegraph.com/news/article/usps-holiday-shipping-deadlines-22445455.php';

export const OPERATIONS_DECISIONS: Decision[] = [
  {
    id: 'shipping:flat',
    group: 'operations',
    title: 'Frete fixo (USPS Ground Advantage)',
    question: 'Quanto cobrar de frete por pedido enviado (pacote < 1 lb)?',
    owner: 'both',
    unit: 'usd_cents',
    unitCostCents: 746,
    options: [
      { id: 'subsidized', label: 'Subsidiado', value: 599, rationale: 'Abaixo do custo comercial ($6.93–$8.40): perde ~$1–2 por envio, mas converte mais.' },
      { id: 'cost', label: 'Cobre o custo', value: 799, rationale: 'Cobre as zonas 1–7 da tarifa comercial ($6.93–$8.07); pequena perda só na zona 8 ($8.40).' },
      { id: 'full', label: 'Cobre tudo', value: 899, rationale: 'Cobre todas as zonas mesmo na tarifa de balcão (retail $7.90–$9.45).' },
    ],
    recommendedOptionId: 'cost',
    evidence: [
      { label: 'Comercial < 1 lb (desde 12/jul/2026)', value: '$6.93 (zona 1) – $8.40 (zona 8)', sourceUrl: USPS_RATES },
      { label: 'Balcão 4–8 oz', value: '$7.90 – $9.45', sourceUrl: USPS_RATES },
      { label: 'Custo usado na margem', value: '$7.46 (zona 4, comercial)', sourceUrl: USPS_RATES },
    ],
  },
  {
    id: 'lead-days:halloween',
    group: 'operations',
    title: 'Prazo de pedido — Halloween (sáb, 31/out)',
    question: 'Quantos dias antes do Halloween fechar os pedidos? (produção + envio)',
    owner: 'bruna',
    unit: 'days',
    options: [
      { id: 'tight', label: 'Fecha sáb, 24/out', value: 7, rationale: '~2 dias de produção + 2–5 dias úteis de envio. Arriscado para o oeste do país.' },
      { id: 'standard', label: 'Fecha qui, 22/out', value: 9, rationale: '~3–4 dias de produção + 2–5 dias úteis de envio.' },
      { id: 'safe', label: 'Fecha seg, 19/out', value: 12, rationale: 'Folga para fila grande ou reimpressão.' },
    ],
    recommendedOptionId: 'standard',
    evidence: [{ label: 'USPS Ground Advantage', value: '2–5 dias úteis', sourceUrl: USPS_GROUND }],
  },
  {
    id: 'lead-days:thanksgiving',
    group: 'operations',
    title: 'Prazo de pedido — Thanksgiving (qui, 26/nov)',
    question: 'Quantos dias antes do Thanksgiving fechar os pedidos?',
    owner: 'bruna',
    unit: 'days',
    options: [
      { id: 'tight', label: 'Fecha qua, 18/nov', value: 8, rationale: 'Apertado: conjuntos de 6 levam mais tempo de impressão.' },
      { id: 'standard', label: 'Fecha seg, 16/nov', value: 10, rationale: '~4–5 dias de produção + envio.' },
      { id: 'safe', label: 'Fecha sáb, 14/nov', value: 12, rationale: 'Folga para pedidos grandes (vários conjuntos).' },
    ],
    recommendedOptionId: 'standard',
    evidence: [{ label: 'USPS Ground Advantage', value: '2–5 dias úteis', sourceUrl: USPS_GROUND }],
  },
  {
    id: 'lead-days:christmas',
    group: 'operations',
    title: 'Prazo de pedido — Natal (sex, 25/dez)',
    question: 'Quantos dias antes do Natal fechar os pedidos?',
    owner: 'bruna',
    unit: 'days',
    options: [
      { id: 'tight', label: 'Fecha seg, 14/dez', value: 11, rationale: 'Só 3 dias até o prazo USPS de 17/dez. Pico de fila.' },
      { id: 'standard', label: 'Fecha sáb, 12/dez', value: 13, rationale: '5 dias de produção até o prazo USPS Ground de 17/dez.' },
      { id: 'safe', label: 'Fecha qua, 9/dez', value: 16, rationale: '8 dias de produção. Recomendado se a fila passar de ~50 peças.' },
    ],
    recommendedOptionId: 'standard',
    evidence: [
      { label: 'Prazo USPS Ground Advantage 2026 (não confirmado no usps.com)', value: '17/dez', sourceUrl: USPS_HOLIDAY_2026 },
      { label: 'USPS Ground Advantage', value: '2–5 dias úteis', sourceUrl: USPS_GROUND },
    ],
  },
  {
    id: 'channel:etsy',
    group: 'operations',
    title: 'Vender também no Etsy?',
    question: 'Além do site próprio, listar os produtos no Etsy nesta temporada?',
    owner: 'both',
    unit: 'text',
    options: [
      { id: 'site-only', label: 'Só site próprio', value: 'Só site', rationale: 'Sem taxas, mas todo o tráfego depende de vocês (Instagram, grupos locais).' },
      { id: 'site-etsy-top', label: 'Site + Etsy (top 3 produtos)', value: 'Site + Etsy top 3', rationale: 'Etsy traz compradores procurando presente; taxa ~10% (sem Offsite Ads). Testar com os 3 mais vendidos.' },
      { id: 'etsy-all', label: 'Etsy com tudo', value: 'Etsy tudo', rationale: 'Mais alcance; mais trabalho de listagem e Offsite Ads podem levar 22–28% do pedido.' },
    ],
    recommendedOptionId: 'site-etsy-top',
    evidence: [
      { label: 'Taxa de listagem / transação', value: '$0.20 · 6.5%', sourceUrl: 'https://www.etsy.com/legal/fees' },
      { label: 'Processamento (EUA)', value: '3% + $0.25', sourceUrl: 'https://craftybase.com/blog/the-complete-guide-to-etsy-fees' },
      { label: 'Offsite Ads', value: '15% (<$10k/ano, pode sair) · 12%', sourceUrl: 'https://nifty.ai/post/how-much-does-etsy-take-per-sale' },
    ],
  },
];
