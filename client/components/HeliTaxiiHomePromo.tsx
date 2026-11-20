import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

export default function HeliTaxiiHomePromo() {
  return (
    <section aria-labelledby="helitaxii-home-title" className="bg-[#f5f5f5] px-3 py-5 sm:px-4 sm:py-8">
      <div className="container mx-auto">
        <div className="relative isolate overflow-hidden rounded-2xl bg-[#111827] shadow-sm sm:rounded-3xl">
          <div className="grid items-stretch lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[220px] overflow-hidden sm:min-h-[300px] lg:order-2 lg:min-h-[360px]">
              <Image
                src="/images/HeliTaxii/hero-helicopter.jpg"
                alt="Helicopter flying over the hills of Nagaland"
                fill
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-black/10 lg:to-[#111827]/20" />
            </div>

            <div className="flex flex-col justify-center px-5 py-6 text-white sm:px-8 sm:py-9 lg:order-1 lg:px-10 lg:py-12">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
                <MapPin className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
                Kohima | Kisama | Nagaland
              </div>

              <h2 id="helitaxii-home-title" className="max-w-xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                Experience Hornbill Festival 2026 from the sky
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                Explore helicopter joyrides, scenic flights and shuttle options around the festival. Choose an option and continue your booking with HeliTaxii.
              </p>

              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/HeliTaxii"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#e31837] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c9142f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Explore helicopter options
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <span className="text-xs text-white/60 sm:text-sm">
                  Booking is completed on the HeliTaxii website
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
