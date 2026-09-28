# Farmz3D — farmz3d.shop

Loja de presentes personalizados impressos em 3D (Farmz3D) + painel do Thiago e da Bruna.

- **Loja** (`/`): 34 produtos, preços aprovados no painel, pedido com **imagem** (foto/logo), **WhatsApp da Bruna** em toda a página.
- **Pedido personalizado (orçamento)**: no dropdown, a primeira opção é "✨ Custom design — free quote by email" (e o bloco "Have an idea? We print it." na loja). O cliente descreve a ideia e anexa foto; **não aparece preço**. No painel o pedido vem marcado **ORÇAMENTO**: preencha "Valor do orçamento" em *Atualizar pedido*, gere o link de pagamento (opcional) e envie com o modelo **Enviar orçamento**.
- **Pedido**: chega por **email** (com a imagem anexada e botão "Reply on WhatsApp") e aparece no **painel**.
- **Painel** (`/admin`):
  - **Visão geral**: pedidos novos, para enviar, sem pagamento, vendas 30 dias, estoque baixo, últimas conversas.
  - **Pedidos**: filtros e busca; página de cada pedido com imagem do cliente, endereço, rastreio (USPS/UPS/FedEx), pagamento, notas internas e **histórico** de tudo.
  - **Falar com o cliente**: email enviado pelo painel (com modelos prontos: confirmar + pagamento, pedir detalhes, em produção, enviado com rastreio, pronto p/ retirar, agradecer), WhatsApp com mensagem pronta, nota interna, "Responder email" e "Abrir conversa no Gmail".
  - **Produtos e estoque**: criar/editar/excluir produto, **foto real**, preço, custo (margem), estoque (+1/−1/+10), aviso de estoque baixo, ativar/desativar. Estoque zerado = "Sold out" na loja; cancelar pedido devolve ao estoque.
  - **Comunicação**: tudo que foi enviado + atalhos para Gmail, WhatsApp Web e entregas do Resend.
  - **Preços e decisões**: preço de mercado com fonte e o Jev (TypeSafe).
  - **Pagamento Stripe** (opcional): botão "Gerar link de pagamento"; quando o cliente paga, o pedido vira "Pago" sozinho.

Stack: Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres + Storage privado) · Resend · Docker.

---

## 1. Rodar no seu computador (sem configurar nada)
```bash
git clone https://github.com/Thiagaoai/farmzd3-usa.git
cd farmzd3-usa
npm ci
npm run local
```
- Loja: http://localhost:3002
- Painel: http://localhost:3002/admin/login → usuário `admin`, senha `farmz3d-local`

A senha do site (farmz3d.shop) **não vale** no modo local — lá é sempre `admin` / `farmz3d-local`, a menos que você defina `ADMIN_DASHBOARD_USER` e `ADMIN_DASHBOARD_PASSWORD` no `.env.local`. Atenção: o repositório antigo `thiagao.ai` tem outro painel (newsletter); a loja é **este** repositório.

No modo local, pedidos e imagens ficam em `.data/` (apague a pasta para zerar) e emails não são enviados. Se criar `.env.local` com Supabase/Resend reais, eles são usados.

Checagem completa: `npm run check` (lint + tipos + testes + build).

## 2. Banco (Supabase)
O projeto `thiagao-newsletter` (qropstlezhnxtwkxirwb) **já tem tudo aplicado** — é só usar a mesma URL e service role key.

Para um projeto novo: SQL Editor → rode em ordem `supabase/migrations/001…005`. Tudo com RLS ligado e sem políticas públicas (só o servidor acessa). O bucket `farmz3d-order-images` é **privado**.

## 3. Variáveis de ambiente (Dokploy → Environment)
Obrigatórias:
```
NEXT_PUBLIC_SUPABASE_URL=https://qropstlezhnxtwkxirwb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
FARMZ3D_ORDERS_EMAIL=<email da Bruna>             # recebe os pedidos
FARMZ3D_FROM_EMAIL="Farmz3D <orders@farmz3d.shop>" # domínio verificado no Resend (passo 5)
ADMIN_DASHBOARD_USER=thiago
ADMIN_DASHBOARD_PASSWORD=<senha do Thiago, 12+ caracteres>
ADMIN_DASHBOARD_USER_2=bruna                 # segundo login (opcional)
ADMIN_DASHBOARD_PASSWORD_2=<senha da Bruna, 12+ caracteres>
ADMIN_DASHBOARD_TOKEN=<aleatório: openssl rand -hex 32>
FARMZ3D_SITE_URL=https://farmz3d.shop
```
Opcionais:
```
NEXT_PUBLIC_FARMZ3D_WHATSAPP=17747225366   # padrão: WhatsApp da Bruna (774) 722-5366
NEXT_PUBLIC_FARMZ3D_INSTAGRAM=@farmz3d
TYPESAFE_API_KEY=...                       # liga o Jev no painel
STRIPE_SECRET_KEY=sk_live_...              # liga o botão "Gerar link de pagamento"
STRIPE_WEBHOOK_SECRET=whsec_...            # marca o pedido como pago automaticamente
ADMIN_API_TOKEN=<aleatório>                # acesso por API (Bearer), opcional
```
`NEXT_PUBLIC_*` entram no **build**: no Dokploy, marque-as também como build args (ou refaça o deploy depois de mudar).

## 4. Publicar em farmz3d.shop (Hostinger + Dokploy)
1. **Dokploy** → *Create Application* → GitHub → repositório `Thiagaoai/farmzd3-usa`, branch `main` → *Build type*: **Dockerfile**.
2. *Environment*: cole as variáveis do passo 3.
3. *Domains* → adicione `farmz3d.shop` e `www.farmz3d.shop`, **porta 3000**, HTTPS ligado, certificado **Let's Encrypt**.
4. **Hostinger** → *Domínios → farmz3d.shop → DNS*: apague os registros A/CNAME padrão de `@` e `www` (os que apontam para o parking da Hostinger) e crie:

   | Tipo | Nome | Valor | TTL |
   |---|---|---|---|
   | A | `@` | IP do servidor do Dokploy (o mesmo de `thiagao.io`) | 300 |
   | CNAME | `www` | `farmz3d.shop` | 300 |

5. Deploy. Em alguns minutos (até algumas horas) `https://farmz3d.shop` abre a loja. Teste: `dig +short farmz3d.shop` deve mostrar o IP do servidor, e `https://farmz3d.shop/api/health` responde `{"ok":true}`.

## 5. Emails dos pedidos (Resend)
1. Resend → *Domains → Add domain* → `farmz3d.shop`.
2. Copie os registros que o Resend mostrar (TXT/MX de SPF e DKIM) para o **DNS da Hostinger**. Espere ficar *Verified*.
3. Use `FARMZ3D_FROM_EMAIL="Farmz3D <orders@farmz3d.shop>"`.
4. Teste: faça um pedido com foto → a Bruna recebe o email com a imagem anexada; o cliente recebe a confirmação com o WhatsApp da loja.

## 6. WhatsApp — como fica o atendimento
- Cliente: botão verde flutuante, link no topo/rodapé e, depois do pedido, **Chat with us on WhatsApp** com o número do pedido já escrito.
- Bruna: no email do pedido, **Reply on WhatsApp**; no painel, **WhatsApp do cliente** com mensagem pronta. O número de WhatsApp do cliente é obrigatório no pedido.
- Usa links oficiais `wa.me` (funciona no WhatsApp normal ou Business, sem aprovação da Meta). Resposta automática/robô exige a API oficial do WhatsApp Business (verificação da Meta) — próximo passo, se quiserem.

## 6b. Stripe (pagamento online, opcional)
1. dashboard.stripe.com → *Developers → API keys* → copie a **Secret key** → `STRIPE_SECRET_KEY` no Dokploy.
2. *Developers → Webhooks → Add endpoint*: URL `https://farmz3d.shop/api/stripe/webhook`, eventos `checkout.session.completed` e `checkout.session.async_payment_succeeded` → copie o **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
3. Deploy. No pedido: **Gerar link de pagamento** → use o modelo "Confirmar + pagamento" (o link vai no email). Quando pagar, o pedido fica **Pago**, vai para **Confirmado** e chega um email para a loja.

Sem Stripe, marque "Pago" manualmente (Zelle, Venmo, dinheiro).

## 7. Segurança
- Upload: tipo conferido pelos bytes (JPG/PNG/WebP/HEIC), máx. 8 MB, nome aleatório, bucket privado; só admin logado vê.
- Login: limite de 10 tentativas/hora por IP e por usuário, comparação em tempo constante, cookie `httpOnly` + `secure` + `sameSite`.
- Rotas do painel recusam requisições de outros sites (CSRF); cada rota confere a autenticação.
- Preços e total calculados no servidor (nunca vêm do navegador); anti-spam (honeypot + tempo mínimo + limite por IP).
- Cabeçalhos: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`. Next.js 16.3.6, `npm audit` sem vulnerabilidades.
- Trocar `ADMIN_DASHBOARD_TOKEN` desloga todo mundo.
- Cada pessoa tem seu login (Thiago e Bruna). O usuário não diferencia maiúsculas. Para conferir uma senha sem sair: abra uma janela anônima e faça login lá. Só tentativas erradas contam para o bloqueio (20 por hora).

## 8. Produtos, preços e licenças
- Produtos: `lib/farmz3d/catalog.ts` · imagens: `lib/farmz3d/media.ts` (prévias geradas por IA — troque por fotos reais em `public/`).
- Preços: `lib/decisions/products.ts` (3 opções + fontes de mercado); aprovação no painel muda o site na hora.
- Licenças dos modelos 3D: [docs/MODELOS-E-LICENCAS.md](docs/MODELOS-E-LICENCAS.md) (inclui por que não imprimimos escudos de times).
