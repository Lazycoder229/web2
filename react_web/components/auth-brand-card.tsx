import { ChefHat } from "lucide-react"

export function AuthBrandCard({
  eyebrow,
  title,
  description,
  imageOnly = false,
  showImage = true,
}: {
  eyebrow: string
  title: string
  description: string
  imageOnly?: boolean
  showImage?: boolean
}) {
  return (
    <section
      className={`relative hidden min-h-dvh overflow-hidden p-9 text-white lg:flex xl:p-14 ${
        showImage ? "bg-cover bg-center" : "bg-stone-950"
      }`}
      style={showImage ? { backgroundImage: "url('/pardslogo.jpg')" } : undefined}
    >
      {showImage ? (
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-black/65 via-red-950/35 to-black/75" />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]"
          />
          <div aria-hidden="true" className="absolute -right-24 top-1/4 size-72 rounded-full border-[34px] border-amber-400/10" />
          <div aria-hidden="true" className="absolute bottom-10 left-10 h-1 w-24 bg-amber-400" />
        </>
      )}
      {!imageOnly && <div className="relative flex w-full flex-col justify-between gap-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/15 text-amber-200">
            <ChefHat className="size-5" />
          </span>
          <div>
            <p className="font-bold tracking-tight">PRIME POS</p>
            <p className="text-xs text-white/60">Operations control center</p>
          </div>
        </div>
        <div className="max-w-sm">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] text-amber-200 uppercase">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.8)]" />
            Secure workspace
          </div>
          <p className="text-xs font-semibold tracking-[.18em] text-white/55 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
            {description}
          </p>
        </div>
      </div>}
    </section>
  )
}
