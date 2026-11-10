import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
  type LinkProps,
} from "react-router-dom"
import { forwardRef, useCallback, useMemo } from "react"

export const Link = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, "to"> & { href: string }
>(({ href, ...props }, ref) => (
  <RouterLink {...props} ref={ref} to={href} />
))
Link.displayName = "Link"

export default Link
export { useLocation, useNavigate }

export function useSearchParams() {
  return useRouterSearchParams()[0]
}

export function usePathname() {
  return useLocation().pathname
}

export function useRouter() {
  const navigate = useNavigate()
  const push = useCallback((href: string) => navigate(href), [navigate])
  const replace = useCallback(
    (href: string) => navigate(href, { replace: true }),
    [navigate]
  )
  const back = useCallback(() => navigate(-1), [navigate])
  const refresh = useCallback(() => window.location.reload(), [])

  return useMemo(
    () => ({ push, replace, back, refresh }),
    [back, push, refresh, replace]
  )
}
