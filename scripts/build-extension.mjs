// Prepara la extensión con la URL de tu dashboard y la empaqueta en un .zip.
// Uso:  npm run build:extension -- --url https://mi-espacio.vercel.app [--mode redirect]
// Resultado: dist-extension/ (para "Cargar descomprimida") y dashboard-newtab.zip
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const url = (arg('url') ?? process.env.EXTENSION_APP_URL ?? '').replace(/\/$/, '')
const mode = arg('mode') ?? 'iframe'
if (!/^https:\/\//.test(url) && !/^http:\/\/localhost/.test(url)) {
  console.error('Indica la URL del dashboard:  npm run build:extension -- --url https://tu-app.vercel.app')
  process.exit(1)
}
if (!['iframe', 'redirect'].includes(mode)) {
  console.error('--mode debe ser iframe o redirect')
  process.exit(1)
}

const out = 'dist-extension'
rmSync(out, { recursive: true, force: true })
cpSync('extension', out, { recursive: true })

writeFileSync(
  `${out}/config.js`,
  `// Generado por scripts/build-extension.mjs\nwindow.DASHBOARD_CONFIG = ${JSON.stringify({ url, mode }, null, 2)}\n`,
)
const manifest = JSON.parse(readFileSync(`${out}/manifest.json`, 'utf8'))
manifest.host_permissions = [`${new URL(url).origin}/*`]
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')

try {
  rmSync('dashboard-newtab.zip', { force: true })
  execFileSync('zip', ['-r', '-q', '../dashboard-newtab.zip', '.'], { cwd: out })
  console.log(`✔ Extensión lista en ${out}/ y dashboard-newtab.zip  →  ${url} (${mode})`)
} catch {
  console.log(`✔ Extensión lista en ${out}/ (no se encontró "zip": comprime la carpeta a mano si la necesitas)`)
}
