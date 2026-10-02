import { Loader2 } from "lucide-react"

export default function CustomerLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid min-h-[40dvh] place-items-center"
    >
      <Loader2 className="size-6 animate-spin text-amber-600" />
    </div>
  )
}
