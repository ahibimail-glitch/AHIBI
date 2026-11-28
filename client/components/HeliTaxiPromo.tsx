import Image from "next/image";
import Link from "next/link";

type HeliTaxiPromoProps = {
  linked?: boolean;
};

export default function HeliTaxiPromo({ linked = true }: HeliTaxiPromoProps) {
  const artwork = (
    <>
      <Image
        src="/images/HeliTaxii/heli-desktop.jpg"
        alt="Hornbill HeliTaxii 2026 — book your experience"
        width={2048}
        height={1024}
        sizes="(max-width: 767px) 100vw, 96vw"
        className="hidden h-auto w-full md:block"
      />
      <Image
        src="/images/HeliTaxii/heli-mobile.jpg"
        alt="Hornbill HeliTaxii 2026 — book your experience"
        width={1280}
        height={1600}
        sizes="100vw"
        className="h-auto w-full md:hidden"
      />
    </>
  );

  return (
    <section aria-label="Hornbill HeliTaxii 2026" className="w-full bg-white">
      <div className="mx-auto max-w-screen-2xl px-3 py-4 sm:px-4 sm:py-6">
        {linked ? (
          <Link
            href="/HeliTaxii/book"
            aria-label="Book Hornbill HeliTaxii 2026"
            className="block overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {artwork}
          </Link>
        ) : (
          <div className="overflow-hidden rounded-xl shadow-sm">{artwork}</div>
        )}
      </div>
    </section>
  );
}
