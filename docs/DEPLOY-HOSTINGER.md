# Deploy na Hostinger (hospedagem compartilhada)

Guia passo a passo para publicar a loja em um plano **compartilhado** da Hostinger
(sem VPS), usando o recurso **Node.js** do hPanel + GitHub.

> ⚠️ **PostgreSQL**: a hospedagem compartilhada da Hostinger **não oferece
> PostgreSQL** (apenas MySQL). Este projeto usa Prisma/PostgreSQL, então você
> precisa de um PostgreSQL externo. Opções gratuitas: **Neon**, **Supabase**,
> **Aiven** (plano free). Opções da própria Hostinger: Cloud Database ou um VPS.

---

## 1. Pré-requisitos

- Plano Hostinger compartilhado com **SSH habilitado** (hPanel → Avançado → SSH).
- Domínio apontado para a Hostinger (A record para o IP do servidor).
- Um **PostgreSQL externo** criado (guarde a URL de conexão).
- Repositório já no GitHub: `https://github.com/Souna223/sagrox-shop`.

## 2. Banco de dados

1. Crie o banco no provedor escolhido (ex.: Neon).
2. Copie a connection string, ex.:
   ```
   postgresql://user:password@host.neon.tech/wbsite?sslmode=require
   ```
3. Você vai usá-la como `DATABASE_URL`.

## 3. Criar a aplicação Node.js no hPanel

1. hPanel → **Websites** → selecione o domínio.
2. **Node.js** → **Criar aplicação**.
3. Preencha:
   - **Application root**: `sagrox-shop` (pasta onde o app vai morar)
   - **Application startup file**: `server.js`
   - **Application URL**: `https://seudominio.com.br`
   - **Node.js version**: `22`
4. Salve. Isso cria a estrutura de pastas (ex.: `public_html/sagrox-shop`).

## 4. Enviar o código e compilar via SSH

Conecte via SSH (usuário e senha da conta Hostinger):

```bash
cd public_html/sagrox-shop
git clone https://github.com/Souna223/sagrox-shop.git .
```

Crie o arquivo de ambiente (nunca versionado):

```bash
cp .env.example .env
nano .env
```

Preencha no mínimo:

```env
DATABASE_URL="postgresql://user:password@host:5432/wbsite?sslmode=verify-full"
NEXT_PUBLIC_APP_URL="https://seudominio.com.br"
NEXT_PUBLIC_SITE_URL="https://seudominio.com.br"
AUTH_URL="https://seudominio.com.br"
NEXTAUTH_URL="https://seudominio.com.br"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_TRUST_HOST="true"  # evita "UntrustedHost" (a Hostinger/Nginx faz proxy na frente do app)
ADMIN_EMAIL="admin@seudominio.com.br"
ADMIN_PASSWORD="uma-senha-forte"
```

> `NEXT_PUBLIC_*` são embutidos no **build**; as demais são lidas em **runtime**.
> As variáveis de integração (Google, Appmax, Cloudinary, SMTP, analytics, OpenAI)
> entram aqui também, quando você tiver as chaves.

**AppMax (pagamentos)** — além do `.env`, a loja só processa pagamentos após a
**instalação do merchant** (as credenciais de merchant são geradas e salvas no
banco durante o fluxo de autorização, e não via env):

```env
APPMAX_CLIENT_ID="..."
APPMAX_CLIENT_SECRET="..."
APPMAX_ENV="production"        # sandbox | production
APPMAX_ENABLED="true"
APPMAX_APP_ID_UUID="..."       # ID do app no painel do AppMax (obrigatório)
APPMAX_EXTERNAL_KEY="sagrox"   # opcional
APPMAX_CALLBACK_BASE_URL="https://seudominio.com.br"
```

Após subir o app: **Admin → Configurações → AppMax → "Autorizar instalação no
AppMax"**. Confirme que o card mostra **"Instalado e pronto para receber
pagamentos"**. Cadastre o webhook
`https://seudominio.com.br/api/webhooks/appmax` no painel do AppMax.

Instale, prepare o banco e compile:

```bash
npm ci
npm run db:deploy        # aplica as migrations (prisma migrate deploy)
npm run db:seed:admin    # cria APENAS o admin + configurações (sem dados demo)
npm run build:prod       # prisma generate + next build
```

> ⚠️ **Não** rode `npm run db:seed`: ele recria o catálogo/cupons/FAQs de
> demonstração. Use `db:seed:admin` para um ambiente de produção limpo.

## 5. Variáveis de ambiente no hPanel

Em hPanel → Node.js → sua aplicação → **Variáveis de ambiente**, adicione as
mesmas chaves do `.env` (a Hostinger injeta no processo). É redundante com o
`.env`, mas garante disponibilidade em qualquer reinício do painel.

## 6. Subir o app

No hPanel → Node.js → sua aplicação → **Iniciar**.

O `server.js` escuta em `0.0.0.0:3000` (ou `PORT` se definida) e o hPanel
faz o proxy com seu domínio. Verifique em **Logs** que aparece:

```
> Ready on http://0.0.0.0:3000 (production)
```

Acesse `https://seudominio.com.br/login` e entre com `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Depois `https://seudominio.com.br/admin`.

## 7. SSL (HTTPS)

hPanel → **Segurança → SSL** → **Instalar certificado** (Let's Encrypt grátis).
Depois force HTTPS em **SSL → Configurações**.

## 8. Publicar atualizações

```bash
cd public_html/sagrox-shop
git pull
npm ci
npm run db:deploy
npm run build:prod
```

No hPanel: **Reiniciar** a aplicação Node.js.

---

## Troubleshooting

| Problema | Solução |
|---|---|
| Build morre sem memória | Compartilhado tem limite (~1–2 GB). Libere RAM (mate processos) ou rode `NODE_OPTIONS=--max-old-space-size=1536 npm run build:prod`. Em plano básico, considere VPS. |
| `prisma generate` não encontra o cliente | Sempre rode via `npm run build:prod` (gera antes do build). |
| 502 no site | App não subiu; veja **Logs** no hPanel. Confirme que o startup file é `server.js` e que `.next` foi compilado. |
| Migrations divergentes | `npx prisma migrate status`; se houver drift, alinhe com a branch correta do repositório. |
| Tela "Não autenticado" no `/admin` | `AUTH_SECRET` divergente entre build/runtime; use o mesmo valor no `.env` e no painel. |
| Erro "UntrustedHost" no login | Falta `AUTH_TRUST_HOST="true"` (a Hostinger/Nginx faz proxy na frente do app). |
| Botão "Entrar com Google" some | Comportamento esperado enquanto `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` estiverem vazios. |
| AppMax "Configurado, mas ainda não instalado" | Complete a instalação do merchant em **Admin → Configurações → AppMax** (exige `APPMAX_APP_ID_UUID` no env). |
| Checkout falha com "AppMax não está instalado" | A instalação do merchant não foi concluída; veja a linha acima. |
| E-mails não saem | SMTP vazio → `lib/mail.ts` só loga no console. Configure `SMTP_*` (e instale um provedor) quando for produzir e-mails. |

> **Recomendação**: para escala/confiabilidade reais, a Hostinger VPS (ou Cloud)
> roda o mesmo `npm run build:prod` + `npm run start` sob PM2 com Nginx, com
> PostgreSQL próprio. Este guia cobre o compartilhado conforme solicitado.
