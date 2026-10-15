// Carga el dashboard alojado. No contiene código ni datos de la app:
// todo vive en la nube, así que la extensión no necesita actualizarse al desplegar.
;(function () {
  var cfg = window.DASHBOARD_CONFIG || {}
  var url = cfg.url
  var loading = document.getElementById('loading')
  var fallback = document.getElementById('fallback')

  function showFallback() {
    loading.hidden = true
    fallback.hidden = false
    var link = document.getElementById('open-link')
    link.href = url
    link.addEventListener('click', function (e) {
      e.preventDefault()
      location.replace(url)
    })
  }

  if (!url || url.indexOf('TU-APP') !== -1) {
    loading.querySelector('p').textContent = 'Configura la URL del dashboard en config.js (ver docs/EXTENSION.md)'
    return
  }

  if (cfg.mode === 'redirect') {
    location.replace(url)
    return
  }

  var frame = document.createElement('iframe')
  frame.src = url
  frame.title = 'Mi espacio'
  frame.allow = 'clipboard-write; notifications'
  var timer = setTimeout(showFallback, 10000)
  frame.addEventListener('load', function () {
    clearTimeout(timer)
    loading.hidden = true
    frame.classList.add('ready')
    frame.focus()
  })
  document.body.appendChild(frame)
})()
