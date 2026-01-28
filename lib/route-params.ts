export type RouteParams<T extends Record<string, string | undefined>> =
  | T
  | Promise<T>
  | undefined

export const resolveRouteParams = async <
  T extends Record<string, string | undefined>,
>(params?: RouteParams<T>) => {
  if (!params) return undefined
  const maybePromise = params as Promise<T>
  return typeof (maybePromise as Promise<T>)?.then === 'function'
    ? await maybePromise
    : (params as T)
}
