// ─────────────────────────────────────────────────────────────
// Configuración de la extensión. Normalmente la rellena
// `npm run build:extension -- --url https://tu-app.vercel.app`.
//   url:  dirección de tu dashboard desplegado en Vercel
//   mode: 'iframe'   → la app se carga dentro de la nueva pestaña (la barra
//                      de direcciones queda vacía y lista para buscar)
//         'redirect' → la nueva pestaña salta a la URL de la app (más simple
//                      y robusto si el iframe da problemas de sesión)
// ─────────────────────────────────────────────────────────────
window.DASHBOARD_CONFIG = {
  url: 'https://TU-APP.vercel.app',
  mode: 'iframe',
}
