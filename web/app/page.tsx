import { Fragment } from "react";
import { fraunces, manrope,groups,steps,comparison,specs,faqs, } from "./constant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Wifi,
  ArrowRight,
  X,
  Printer,
  Check,
  GraduationCap,
} from "lucide-react";



export default function PrimeLanding() {
  return (
    <div
      className={`${fraunces.variable} ${manrope.variable} min-h-screen bg-[#FFFBF0] text-[#201A10]`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#EADFC0] bg-[#FFFBF0]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span
            className="text-xl tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            PRIME
          </span>
          <nav className="hidden items-center gap-8 text-sm text-[#4A4030] md:flex">
            <a href="#features" className="hover:text-[#201A10]">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#201A10]">
              How it works
            </a>
            <a href="#faq" className="hover:text-[#201A10]">
              FAQ
            </a>
            <a href="#contact" className="hover:text-[#201A10]">
              Contact
            </a>
          </nav>
          <Button className="bg-[#C9971C] text-[#201A10] hover:bg-[#A97815]">
            Request a demo
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <Badge className="mb-6 border border-[#EADFC0] bg-[#FBEFD1] text-[#8A6414] hover:bg-[#FBEFD1]">
            Built for kitchens without a touchscreen KDS
          </Badge>
          <h1
            className="text-[2.75rem] leading-[1.05] md:text-6xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Every table orders itself.{" "}
            <em className="not-italic text-[#A97815]">Every ticket still prints.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-[#4A4030]">
            PRIME runs QR ordering, kitchen ticketing, and staff management from one
            system — so your kitchen keeps its printer, and your front of house
            stops running on sticky notes.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button
              size="lg"
              className="bg-[#201A10] text-[#FFFBF0] hover:bg-[#3A2F1D]"
            >
              See PRIME in action
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a
              href="#features"
              className="text-sm font-medium text-[#4A4030] underline underline-offset-4 hover:text-[#201A10]"
            >
              Browse features
            </a>
          </div>
        </div>

        {/* Ticket mockup */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-sm border border-[#EADFC0] bg-white p-6 shadow-[0_1px_0_#EADFC0]">
            <div className="flex items-center justify-between text-xs text-[#8A6414]">
              <span>TABLE 07</span>
              <span>#0142</span>
            </div>
            <div className="mt-4 space-y-3 border-t border-dashed border-[#EADFC0] pt-4">
              {[
                ["1x", "Sisig Rice Bowl"],
                ["2x", "Iced Calamansi"],
                ["1x", "Halo-Halo"],
              ].map(([qty, item]) => (
                <div key={item} className="flex justify-between text-sm">
                  <span className="text-[#4A4030]">
                    <span className="mr-2 text-[#C9971C]">{qty}</span>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#EADFC0] pt-4 text-xs text-[#8A6414]">
              <span>SYNCED · 0.4s</span>
              <span className="flex items-center gap-1 text-[#A97815]">
                <Wifi className="h-3.5 w-3.5" /> LIVE
              </span>
            </div>
          </div>
          {/* printing ticket */}
          <div className="relative -mt-1 ml-6 w-[85%] rounded-b-sm border border-t-0 border-[#EADFC0] bg-[#FBEFD1] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#8A6414]">
              <Printer className="h-3.5 w-3.5" />
              SENT TO KITCHEN
            </div>
            <div
              className="mt-2 h-2 w-full bg-[repeating-linear-gradient(90deg,#EADFC0_0_6px,transparent_6px_12px)]"
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* Problem / solution */}
      <section className="border-t border-[#EADFC0]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2
            className="mb-14 border-b border-[#EADFC0] pb-4 text-3xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            What service looks like without it
          </h2>
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            <span className="hidden text-sm font-medium text-[#8A6414] md:block">
              Without PRIME
            </span>
            <span className="hidden text-sm font-medium text-[#8A6414] md:block">
              With PRIME
            </span>
            {comparison.map((row) => (
              <Fragment key={row.before}>
                <div className="flex gap-3 border-t border-[#EADFC0] pt-6 md:border-t">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-[#B0A98A]" />
                  <p className="text-[#4A4030]">{row.before}</p>
                </div>
                <div className="flex gap-3 border-t border-[#EADFC0] pt-6">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9971C]" />
                  <p className="text-[#201A10]">{row.after}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Feature groups */}
      <section id="features" className="border-t border-[#EADFC0] bg-[#FBEFD1]/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 flex items-end justify-between border-b border-[#EADFC0] pb-4">
            <h2
              className="text-3xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              One system, three counters
            </h2>
            <span className="hidden text-sm text-[#8A6414] md:inline">
              11 features, grouped by who uses them
            </span>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {groups.map((group) => (
              <div key={group.label}>
                <h3
                  className="text-lg"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {group.label}
                </h3>
                <p className="mt-1 text-sm text-[#8A6414]">{group.description}</p>
                <ul className="mt-6 space-y-6">
                  {group.items.map(({ icon: Icon, title, detail }) => (
                    <li key={title} className="flex gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#C9971C]" />
                      <div>
                        <p className="font-medium text-[#201A10]">{title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#4A4030]">
                          {detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <h2
          className="mb-14 border-b border-[#EADFC0] pb-4 text-3xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          From scan to receipt
        </h2>
        <div className="grid gap-10 md:grid-cols-4">
          {steps.map((step) => (
            <div key={step.n}>
              <span
                className="text-sm text-[#C9971C]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {step.n}
              </span>
              <p className="mt-3 font-medium text-[#201A10]">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4030]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section className="border-t border-[#EADFC0] bg-[#FBEFD1]/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2
            className="mb-14 border-b border-[#EADFC0] pb-4 text-3xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Under the hood
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="flex flex-col gap-1 border-b border-[#EADFC0] pb-6 md:flex-row md:gap-6"
              >
                <span
                  className="w-40 shrink-0 text-sm text-[#8A6414]"
                  style={{ fontFamily: "var(--font-body)", fontFeatureSettings: '"tnum"' }}
                >
                  <code className="rounded-sm bg-[#EADFC0]/60 px-1.5 py-0.5 text-xs text-[#4A4030]">
                    {spec.label}
                  </code>
                </span>
                <p className="text-[#4A4030]">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-6 py-20">
        <h2
          className="mb-10 border-b border-[#EADFC0] pb-4 text-3xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Common questions
        </h2>
        <Accordion type="single" className="max-w-3xl">
          {faqs.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`item-${i}`}
              className="border-[#EADFC0]"
            >
              <AccordionTrigger className="text-left text-[#201A10] hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[#4A4030]">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* About the project */}
      <section className="border-t border-[#EADFC0] bg-[#FBEFD1]/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <Badge className="mb-6 border border-[#EADFC0] bg-white text-[#8A6414] hover:bg-white">
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
            Capstone project
          </Badge>
          <h2
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            PRIME — Point-of-sale Restaurant Integrated Management Ecosystem
          </h2>
          <p className="mt-4 text-[#4A4030]">
            A QR-based ordering, inventory, and employee management system for
            restaurant operations, built for restaurants that run on printed
            kitchen tickets and want to add contactless ordering without
            replacing that workflow.
          </p>
          {/* TODO: swap in your school, section, and team member names */}
          <p className="mt-4 text-sm text-[#8A6414]">
            Developed by Resty Gonzales
          </p>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-[#EADFC0] bg-[#201A10]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <h2
              className="text-3xl text-[#FFFBF0]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Ready to see PRIME on your own menu?
            </h2>
            <p className="mt-2 text-[#C9AF7E]">
              We'll walk through it with your actual dishes and your actual printer.
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 bg-[#C9971C] text-[#201A10] hover:bg-[#E0AE33]"
          >
            Request a demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EADFC0]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <span
              className="text-lg"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              PRIME
            </span>
            <p className="mt-2 max-w-xs text-sm text-[#8A6414]">
              Point-of-sale Restaurant Integrated Management Ecosystem — QR
              ordering, kitchen ticketing, and staff management in one system.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#201A10]">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-[#8A6414]">
              <li>
                <a href="#features" className="hover:text-[#201A10]">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#201A10]">
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#201A10]">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-[#201A10]">Project</p>
            <ul className="mt-3 space-y-2 text-sm text-[#8A6414]">
              <li>
                <a href="#contact" className="hover:text-[#201A10]">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#EADFC0]">
          <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-[#8A6414]">
            © 2026 PRIMEOS
          </div>
        </div>
      </footer>
    </div>
  );
}