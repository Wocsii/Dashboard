import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('conecta Spotify con PKCE y elige una playlist personal sin pegar enlaces', async ({ page, context }) => {
  let challenge = ''
  await context.route('https://accounts.spotify.com/authorize**', async (route) => {
    const params = new URL(route.request().url()).searchParams
    expect(params.get('scope')).toContain('playlist-read-private')
    expect(params.get('code_challenge_method')).toBe('S256')
    challenge = params.get('code_challenge')!
    const callback = `${params.get('redirect_uri')}?code=test-code&state=${params.get('state')}`
    await route.fulfill({ contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(callback)})</script>` })
  })
  await context.route('https://accounts.spotify.com/api/token', async (route) => {
    const params = new URLSearchParams(route.request().postData()!)
    expect(createHash('sha256').update(params.get('code_verifier')!).digest('base64url')).toBe(challenge)
    expect(params.has('client_secret')).toBe(false)
    await route.fulfill({ json: { access_token: 'test-manuela-access', refresh_token: 'test-manuela-refresh', expires_in: 3600 } })
  })
  await context.route('https://api.spotify.com/v1/me/playlists**', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer test-manuela-access')
    const offset = new URL(route.request().url()).searchParams.get('offset')
    const items = offset === '50' ? [{ id: 'c'.repeat(22), name: 'Mi jazz', images: [], owner: { display_name: 'Manuela' } }] : [
      { id: 'a'.repeat(22), name: 'Mis mañanas', images: [], owner: { display_name: 'Manuela' } },
      { id: 'b'.repeat(22), name: 'Mis viajes', images: [], owner: { display_name: 'Manuela' } },
    ]
    await route.fulfill({ json: { items, next: offset === '50' ? null : 'https://api.spotify.com/v1/me/playlists?offset=50' } })
  })
  await context.route('https://open.spotify.com/embed/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>Spotify player</p>' }))
  await page.goto('/')
  const music = page.getByRole('region', { name: 'Música para concentrarte' })
  await music.getByRole('button', { name: 'Conectar Spotify' }).click()
  await expect(music.getByRole('button', { name: /Mis mañanas/ })).toBeVisible()
  await expect(music.getByRole('button', { name: /Mis viajes/ })).toBeVisible()
  await music.getByRole('button', { name: /Mis mañanas/ }).click()
  await expect(music.locator('iframe')).toHaveAttribute('src', new RegExp(`/playlist/${'a'.repeat(22)}`))
  await page.reload()
  await expect(music.locator('iframe')).toHaveAttribute('src', new RegExp(`/playlist/${'a'.repeat(22)}`))
  await music.getByRole('button', { name: 'Mis playlists' }).click()
  await music.getByRole('button', { name: 'Cargar más playlists' }).click()
  await expect(music.getByRole('button', { name: /Mi jazz/ })).toBeVisible()
  await music.getByRole('searchbox').fill('viajes')
  await expect(music.getByRole('button', { name: /Mis mañanas/ })).toHaveCount(0)
  await expect(music.getByRole('button', { name: /Mis viajes/ })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await music.scrollIntoViewIfNeeded()
  await expect.poll(async () => { const box = await music.boundingBox(); return !!box && box.x >= 0 && box.x + box.width <= 390 }).toBe(true)
  await music.screenshot({ path: '/tmp/spotify-personal-mobile.png', animations: 'disabled' })
  await music.getByRole('button', { name: 'Desconectar' }).click()
  await expect(music.getByRole('button', { name: 'Conectar Spotify' })).toBeVisible()
  await expect(music.locator('iframe')).toHaveCount(0)
})

test('una segunda persona no hereda la cuenta de Spotify de la primera', async ({ page, context, browser }) => {
  await context.addInitScript(() => localStorage.setItem('dashboard.spotify.personal.demo.session', JSON.stringify({ accessToken: 'first-person', refreshToken: 'first-refresh', clientId: '0'.repeat(32), expiresAt: Date.now() + 3600000 })))
  await context.route('https://api.spotify.com/v1/me/playlists**', (route) => route.fulfill({ json: { items: [{ id: 'a'.repeat(22), name: 'Solo para Manuela', images: [], owner: { display_name: 'Manuela' } }], next: null } }))
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Solo para Manuela/ })).toBeVisible()
  const partner = await browser.newContext()
  try {
    const partnerPage = await partner.newPage()
    await partnerPage.goto('/')
    await expect(partnerPage.getByRole('button', { name: 'Conectar Spotify' })).toBeVisible()
    await expect(partnerPage.getByText('Solo para Manuela')).toHaveCount(0)
  } finally { await partner.close() }
})
