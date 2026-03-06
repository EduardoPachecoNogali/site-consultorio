import crypto from 'crypto'

const SCRYPT_PREFIX = 'scrypt'
const SCRYPT_KEY_LENGTH = 64

const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

const scryptAsync = (value: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(value, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey as Buffer)
    })
  })

export const isHashedSecret = (value: string | null | undefined) =>
  typeof value === 'string' && value.startsWith(`${SCRYPT_PREFIX}$`)

export const hashSecret = async (value: string) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = await scryptAsync(value, salt)
  return `${SCRYPT_PREFIX}$${salt}$${hash.toString('hex')}`
}

export const verifySecret = async (candidate: string, storedValue: string | null | undefined) => {
  if (!storedValue) {
    return false
  }

  if (!isHashedSecret(storedValue)) {
    return timingSafeEqual(candidate, storedValue)
  }

  const [, salt, expectedHash] = storedValue.split('$')
  if (!salt || !expectedHash) {
    return false
  }

  const derivedHash = await scryptAsync(candidate, salt)
  return timingSafeEqual(derivedHash.toString('hex'), expectedHash)
}
