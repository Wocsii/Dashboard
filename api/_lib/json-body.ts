import { HttpError } from './http.js'

export async function readJsonBody(req: Request) {
  const text = await req.text()
  if (text.length > 64000) throw new HttpError(400, 'bad_request', 'La solicitud es demasiado grande')
  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
    return value as Record<string, unknown>
  } catch { throw new HttpError(400, 'bad_request', 'Datos no válidos') }
}

