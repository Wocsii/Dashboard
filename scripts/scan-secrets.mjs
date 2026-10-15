// Busca secretos en los archivos que Git subiría (versionados + nuevos no ignorados).
// Uso: npm run secrets:scan   (sale con código 1 si encuentra algo)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

const patterns = [
  ['Clave secreta de Supabase', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['JWT (posible service_role)', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ['Client secret de Google', /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ['API key de Google', /AIza[0-9A-Za-z_-]{35}/],
  ['Refresh token de Google', /1\/\/0[A-Za-z0-9_-]{30,}/],
  ['Clave privada', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
]
const placeholder = (m) => /x{8,}/i.test(m)

let found = 0
for (const f of files) {
  if (/^\.env(\.|$)/.test(f.split('/').pop()) && !f.endsWith('.env.example')) {
    console.error(`✘ ${f}: archivo .env versionable (debería estar en .gitignore)`)
    found++
    continue
  }
  if (/\.(png|jpe?g|webp|zip|woff2?)$/i.test(f)) continue
  let text
  try {
    text = readFileSync(f, 'utf8')
  } catch {
    continue
  }
  for (const [name, re] of patterns) {
    const m = text.match(re)
    if (m && !placeholder(m[0])) {
      console.error(`✘ ${f}: ${name}`)
      found++
    }
  }
}
if (found) {
  console.error(`\n${found} posible(s) secreto(s). No hagas commit.`)
  process.exit(1)
}
console.log(`✔ Sin secretos en ${files.length} archivos`)
