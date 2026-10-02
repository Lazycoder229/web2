import { ChefHat } from "lucide-react"

export function AuthBrandCard({
  eyebrow,
  title,
  description,
  imageOnly = false,
}: {
  eyebrow: string
  title: string
  description: string
  imageOnly?: boolean
}) {
  return (
    <section
      className="relative hidden min-h-dvh overflow-hidden bg-cover bg-center p-9 text-white lg:flex xl:p-14"
      style={{ backgroundImage: "url('/pardslogo.jpg')" }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-black/65 via-red-950/35 to-black/75" />
      {!imageOnly && <div className="relative flex w-full flex-col justify-between gap-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-sm">
            <ChefHat className="size-5" />
          </span>
          <div>
            <p className="font-bold tracking-tight">PRIME POS</p>
            <p className="text-xs text-white/75">Pards Litsong Manok at Tsibugan</p>
          </div>
        </div>
        <div className="max-w-sm">
          <p className="text-xs font-semibold tracking-[.18em] text-amber-200 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/80">
            {description}
          </p>
        </div>
      </div>}
    </section>
  )
}
