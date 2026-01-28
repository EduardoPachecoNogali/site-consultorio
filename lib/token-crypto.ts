import crypto from 'crypto'

const TOKEN_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const getEncryptionKey = () => {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY ausente.')
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  const base64 = raw.replace(/\s+/g, '')
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 32) {
    return buffer
  }

  throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes (hex ou base64).')
}

export const encryptRefreshToken = (token: string) => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(TOKEN_ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
}

export const decryptRefreshToken = (encryptedToken: string) => {
  const parts = encryptedToken.split(':')
  if (parts.length !== 3) {
    return encryptedToken
  }

  const [ivPart, tagPart, dataPart] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivPart, 'base64')
  const tag = Buffer.from(tagPart, 'base64')
  const encrypted = Buffer.from(dataPart, 'base64')

  const decipher = crypto.createDecipheriv(TOKEN_ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
