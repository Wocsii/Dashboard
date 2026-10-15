import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Sirve las funciones de `api/` (las mismas que despliega Vercel) durante `npm run dev`,
 * para no necesitar `vercel dev` en local. Cada archivo exporta GET/POST(request: Request).
 */
function localApi(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server: ViteDevServer) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) process.env[k] ??= v

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()
        try {
          const mod = await server.ssrLoadModule(`/api${url.pathname.slice(4)}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('Method Not Allowed')
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const origin = `http://${req.headers.host}`
          const request = new Request(new URL(req.url!, origin), {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          })
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          if ((err as Error).message?.includes('Failed to load url')) return next()
          console.error(err)
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
})
