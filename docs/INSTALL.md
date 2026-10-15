# Instalación local y Supabase

## 1. Requisitos

- Node.js 20 o superior (probado con Node 24) y npm.
- Una cuenta gratuita en [supabase.com](https://supabase.com).

```bash
npm install
npm run dev     # modo demo en http://localhost:5173
```

## 2. Crear el proyecto de Supabase (gratis)

1. En Supabase pulsa **New project**. Ponle nombre, contraseña de la base de datos y la región más cercana (por ejemplo, *West EU*).
2. Ve a **Project Settings → API Keys** y copia:
   - **Publishable key** (`sb_publishable_…`): va al frontend.
   - **Secret key** (`sb_secret_…`): **solo** para el servidor (Vercel). Nunca la pongas en una variable `VITE_`.
   - La **Project URL** (`https://xxxx.supabase.co`).

## 3. Crear las tablas

**Opción A, sin instalar nada:** abre **SQL Editor**, pega el contenido de `supabase/migrations/20261015120000_initial_schema.sql` y ejecútalo.

**Opción B, con la CLI:**

```bash
npx supabase login
npx supabase init          # solo si te lo pide; no sobrescribe supabase/migrations
npx supabase link --project-ref TU_REF
npm run db:push
```

## 4. Darte acceso (lista blanca)

La app es personal: **solo pueden entrar los emails de `allowed_emails`**. En el SQL Editor ejecuta el contenido de `supabase/seed.sql`, que ya incluye las dos cuentas permitidas. Para añadir otra:

```sql
insert into public.allowed_emails (email) values ('otro-email@gmail.com');
```

Usa siempre minúsculas. Si otra persona intenta entrar, Supabase rechaza el alta.

## 5. Login con Google

1. Crea las credenciales OAuth siguiendo [GOOGLE_CALENDAR.md](GOOGLE_CALENDAR.md) (pasos 1 a 4). Es el mismo cliente para el login y para el calendario.
2. En Supabase ve a **Authentication → Sign In / Providers → Google**: actívalo y pega el *Client ID* y el *Client Secret*.
3. En **Authentication → URL Configuration**:
   - **Site URL:** la URL de Vercel (o `http://localhost:5173` mientras pruebas).
   - **Redirect URLs:** `http://localhost:5173` y `https://TU-APP.vercel.app`.

## 6. Variables de entorno locales

```bash
cp .env.example .env.local
```

Rellena `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. Para el calendario rellena también las variables de Google y genera las dos claves aleatorias:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # OAUTH_STATE_SECRET
```

Reinicia `npm run dev`. Verás la pantalla de login en lugar del modo demo.

## 7. Comprobar la seguridad (opcional)

En el SQL Editor, ejecuta `supabase/tests/rls_check.sql`. Todas las cuentas deben salir a 0: un usuario ajeno no ve nada.

## 8. Tipos de TypeScript

`src/types/database.types.ts` está escrito a mano a partir de la migración. Si cambias el esquema, regenéralo con la base enlazada:

```bash
npm run db:types
```
