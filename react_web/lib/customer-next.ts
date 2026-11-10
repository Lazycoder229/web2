/**
 * Where to send a customer after signing in. Only same-site /customer paths are
 * accepted, so a crafted `next` link can't redirect someone to another site.
 */
export function safeCustomerNextPath(value: string | null | undefined) {
  if (!value || value.startsWith("//") || !/^\/customer(\/|\?|$)/.test(value)) {
    return null
  }
  if (/^\/customer\/(login|register)(\/|\?|$)/.test(value)) return null
  return value
}
