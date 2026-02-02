export async function readJson<T>(response: Response, fallback?: T): Promise<T> {
  const text = await response.text()
  if (!text) {
    if (fallback !== undefined) return fallback
    throw new Error('Resposta vazia do servidor.')
  }

  try {
    return JSON.parse(text) as T
  } catch {
    if (fallback !== undefined) return fallback
    throw new Error('Resposta inválida do servidor.')
  }
}
