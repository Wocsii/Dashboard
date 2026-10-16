# Despliegue: GitHub y Vercel

Para publicar los proyectos de ejercicio, aplica primero la migración `20261016110000_exercise_projects.sql` en Supabase. Consulta [EXERCISE.md](EXERCISE.md).

La app vive en la nube. Una vez desplegada **no necesitas tener el repositorio descargado** para usarla: entras desde cualquier ordenador iniciando sesión con Google.

## 1. Subir a GitHub

El repositorio ya tiene `origin` apuntando a `https://github.com/Wocsii/Dashboard.git`.

```bash
git config user.name "Tu nombre"          # si aún no lo tienes configurado
git config user.email "tu-email@ejemplo.com"
npm run secrets:scan                      # debe decir "Sin secretos"
git add -A
git commit -m "Primera versión de Mi espacio"
git push -u origin main
```

`.env.local`, `dist/`, `dist-extension/` y los `.zip` están en `.gitignore`.

## 2. Conectar Vercel (plan Hobby, gratis)

1. En [vercel.com](https://vercel.com), entra con GitHub y pulsa **Add New → Project**. Importa `Wocsii/Dashboard`.
2. Vercel detecta **Vite**. Build command `npm run build`, output `dist`: no cambies nada.
3. En **Environment Variables** añade (para *Production* y *Preview*):

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` |
| `GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-…` |
| `GOOGLE_REDIRECT_URI` | `https://TU-APP.vercel.app/api/google/callback` |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes aleatorios en base64 (distintos de los locales) |
| `OAUTH_STATE_SECRET` | 32 bytes aleatorios en base64 |
| `APP_URL` | `https://TU-APP.vercel.app` |

4. Pulsa **Deploy**. Cada `git push` a `main` desplegará producción automáticamente, y las demás ramas generan *previews*.

> Si cambias una variable en Vercel, vuelve a desplegar (**Deployments → … → Redeploy**).

## 3. Después del primer despliegue

- **Supabase → Authentication → URL Configuration:** pon la URL de Vercel como *Site URL* y añádela a *Redirect URLs*.
- **Google Cloud → Clients:** añade `https://TU-APP.vercel.app/api/google/callback` como URI de redirección.
- **Extensión:** `npm run build:extension -- --url https://TU-APP.vercel.app` (ver [EXTENSION.md](EXTENSION.md)).

## Qué hace `vercel.json`

- Redirige todas las rutas a `index.html` (SPA), salvo `/api/*` y `/assets/*`.
- Añade `Content-Security-Policy: frame-ancestors 'self' chrome-extension://ckdphaplpoocdjbopcngoejjegmkkjaa`: solo tu extensión puede mostrar la app dentro de la nueva pestaña.

## Límites del plan gratuito

- **Vercel Hobby:** uso personal y no comercial. Las 6 funciones de `api/` están muy por debajo del límite.
- **Supabase Free:** 500 MB de base de datos. **Pausa el proyecto tras 7 días sin actividad.** Usándolo a diario como nueva pestaña no ocurrirá. Si pasa, se reactiva desde el panel.
