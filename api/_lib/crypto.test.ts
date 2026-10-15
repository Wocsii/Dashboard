// @vitest-environment node
import { randomBytes } from 'node:crypto'
import { decrypt, encrypt, signState, verifyState } from './crypto'

const key = randomBytes(32).toString('base64')

describe('crypto del servidor', () => {
  it('cifra y descifra (AES-GCM) y detecta manipulación', () => {
    const c = encrypt('1//refresh-token', key)
    expect(c).not.toContain('refresh')
    expect(decrypt(c, key)).toBe('1//refresh-token')
    const [iv, tag, data] = c.split('.')
    const tampered = [iv, tag, Buffer.from('x' + data).toString('base64url')].join('.')
    expect(() => decrypt(tampered, key)).toThrow()
    expect(() => decrypt(c, randomBytes(32).toString('base64'))).toThrow()
  })

  it('rechaza claves de tamaño incorrecto', () => {
    expect(() => encrypt('x', Buffer.from('corta').toString('base64'))).toThrow(/32 bytes/)
  })

  it('firma y verifica el state de OAuth', () => {
    const state = { uid: 'user-1', nonce: 'n', exp: Date.now() + 60_000 }
    const token = signState(state, 'secreto')
    expect(verifyState(token, 'secreto')).toEqual(state)
    expect(verifyState(token, 'otro')).toBeNull()
    expect(verifyState(token.replace(/^./, 'A'), 'secreto')).toBeNull()
    expect(verifyState(signState({ ...state, exp: Date.now() - 1 }, 'secreto'), 'secreto')).toBeNull()
    expect(verifyState('basura', 'secreto')).toBeNull()
  })
})
