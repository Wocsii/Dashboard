// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { appleFetch } from './apple-transport'

afterEach(() => vi.unstubAllGlobals())

it('refuses a redirect outside iCloud before sending credentials again', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status:307, headers:{ location:'https://example.com/steal' } }))
  vi.stubGlobal('fetch',fetch)
  await expect(appleFetch('https://caldav.icloud.com/', { headers:{ Authorization:'Basic test' } })).rejects.toMatchObject({ code:'bad_request' })
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('turns a stale version response into a conflict without exposing the upstream body', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private upstream data', { status:412 })))
  await expect(appleFetch('https://caldav.icloud.com/event.ics', { method:'PUT',body:'event' })).rejects.toMatchObject({ code:'conflict',status:409 })
})
