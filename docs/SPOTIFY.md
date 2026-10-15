# Spotify personal en el dashboard

El widget bajo «Próximos eventos» muestra las playlists de la cuenta que cada persona autoriza. Ya no contiene playlists genéricas ni pide copiar enlaces.

## Activación (una vez, por quien administra el dashboard)

1. Abre https://developer.spotify.com/dashboard y crea o utiliza una app con Web API.
2. En esa app, añade como Redirect URI **exactamente** `https://TU-DOMINIO/spotify/callback`, sustituyendo TU-DOMINIO por el dominio donde se usa el dashboard. Guarda los cambios. Para local usa `http://127.0.0.1:5173/spotify/callback` y abre el dashboard en esa misma dirección (Spotify no admite `localhost` como redirect).
3. Copia el **Client ID**, identificador público de la app. En Vercel → proyecto → Settings → Environment Variables, crea `VITE_SPOTIFY_CLIENT_ID` con ese valor para Production. Vuelve a desplegar. Para local, añade la misma variable a `.env.local` y reinicia Vite.
4. Si la app está en Development Mode, añade las cuentas de Spotify de las personas que van a usarla a su lista de usuarios autorizados. Spotify permite hasta cinco usuarios autorizados y exige Premium al propietario de la app. Consulta los requisitos vigentes en https://developer.spotify.com/documentation/web-api/concepts/quota-modes.

No se necesita Client Secret. No hay que activar el proveedor Spotify en Supabase ni crear tablas o migraciones. La clave facilitada en el chat no está incluida en el código y no sustituye el Client ID.

## Qué hace cada persona

Pulsa «Conectar Spotify», autoriza la lectura de playlists y elige una portada desde «Mis playlists». Si Chrome ya tiene iniciada la sesión correcta, puede aprovecharla al dar permiso; una sesión de Chrome por sí sola no autoriza el acceso del dashboard. Para usar otra cuenta, elige la cuenta adecuada en Spotify antes de conectar. «Desconectar» permite volver a vincular otra cuenta.

Cada usuario del dashboard tiene claves de sesión y selección distintas, identificadas por su ID de usuario autenticado. Las credenciales de Spotify y la última selección se conservan en el almacenamiento local de este navegador, sin enviarse a Supabase. En otro navegador o dispositivo hay que volver a conectar Spotify. En modo demo todos los datos son locales al perfil del navegador; utiliza cuentas reales del dashboard para compartir un equipo con aislamiento por usuario.

La lectura usa OAuth Authorization Code con PKCE (SHA-256), comprobación de state, permisos mínimos `playlist-read-private playlist-read-collaborative` y renovación de tokens. La autorización se abre en una ventana para funcionar también desde el dashboard dentro de la extensión. Los mensajes de la ventana se aceptan únicamente desde el mismo origen y desde la ventana abierta. Los tokens no se incluyen en las URLs.

El selector incluye playlists propias y seguidas que devuelve Spotify, búsqueda sobre las listas cargadas y carga de más resultados. «De tus listas, para hoy» rota hasta cuatro playlists de la biblioteca cargada y conserva la última selección en primer lugar; es una selección diaria local, no una recomendación algorítmica de Spotify basada en el historial.

La reproducción sigue utilizando el Embed oficial, separado del permiso de lectura de la biblioteca. La disponibilidad de canciones, listas privadas, reproducción completa o previsualizaciones depende de Spotify y de la sesión del reproductor. El enlace «Abrir selección en Spotify» está disponible para listas que Spotify no permita reproducir incrustadas. La conexión de lectura no inicia sesión automáticamente en el Embed.

## Comprobación

Las pruebas automatizadas cubren autorización PKCE con respuestas simuladas, rechazo de state incorrecto, renovación y revocación, paginación, separación de cuentas, elección persistente, búsqueda y desconexión. Para validar la integración real hace falta activar un Client ID, autorizar una cuenta real y comprobar sus playlists en producción.
