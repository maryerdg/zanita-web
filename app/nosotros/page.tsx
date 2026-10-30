import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

const storyParagraphs = [
  'Zanita nació de algo muy simple: las ganas de encontrar un snack que se sintiera rico, fresco y diferente.',
  'Lo que empezó como una idea entre fruta, chamoy y toppings fue creciendo hasta convertirse en una marca local que hoy lleva más de dos años preparando pedidos en Tijuana.',
  'Detrás de Zanita está Ximena, quien prepara y coordina cada pedido cuidando desde las combinaciones hasta la entrega. Cada producto se hace bajo pedido y puede adaptarse a distintos antojos, desde manzanas y uvas hasta charolas y snacks para compartir.',
  'Y si algo ha hecho crecer a Zanita, ha sido la gente que vuelve, recomienda y comparte sus pedidos con nosotros ❤️',
  'Gracias por dejarnos ser parte de tus antojos.',
];

export default function NosotrosPage() {
  return (
    <div className="pb-12 md:pb-16">
      <section className="relative overflow-hidden border-b border-[#E4D5C1] bg-gradient-to-br from-[#F5EBDC] via-[#FFF9F2] to-[#F09CA9]/20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F09CA9]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#A73832]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F09CA9]/50 bg-[#F09CA9]/20 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A73832] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Sobre Zanita
            </div>

            <h1 className="mt-5 font-serif text-4xl font-bold leading-tight text-[#261C19] sm:text-5xl lg:text-6xl">
              Un antojo que se convirtió en
              <span className="ml-2 font-script font-normal text-[#A73832]">Zanita</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#6E564F] sm:text-base">
              {storyParagraphs[0]}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/productos"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#8E2E28]"
              >
                Conoce el catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="https://www.instagram.com/zanita.tj/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#A73832] bg-white/70 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#A73832] transition-colors hover:bg-white"
              >
                <span className="text-base leading-none">@</span>
                @zanita.tj
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[#E4D5C1] bg-white shadow-sm">
                <Image
                  src="/products/manzanita-roja-gala.webp"
                  alt="Manzanitas preparadas de Zanita"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 45vw, 280px"
                  priority
                />
              </div>

              <div className="space-y-3 pt-8 sm:space-y-4 sm:pt-12">
                <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-[#E4D5C1] bg-white shadow-sm">
                  <Image
                    src="/products/charola-grande-4-toppings.webp"
                    alt="Charola preparada de Zanita"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 250px"
                  />
                </div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-[#E4D5C1] bg-white shadow-sm">
                  <Image
                    src="/products/uvas-forradas.webp"
                    alt="Uvas preparadas de Zanita"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 250px"
                  />
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-[#F09CA9]/50 bg-[#FFF9F2] px-4 py-3 shadow-md sm:block">
              <span className="font-serif text-sm font-bold text-[#261C19]">Tijuana · hecho bajo pedido</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="rounded-3xl border border-[#E4D5C1] bg-[#A73832] p-6 text-white sm:p-8 lg:sticky lg:top-32">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F6C4C9]">
              Detrás de la marca
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight">
              Una marca local construida pedido a pedido
            </h2>
            <div className="relative mt-7 aspect-square overflow-hidden rounded-2xl border border-white/15 bg-white/10">
              <Image
                src="/products/mix-de-frutas.webp"
                alt="Producto preparado por Zanita"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 80vw, 360px"
              />
            </div>
          </div>

          <article className="rounded-3xl border border-[#E4D5C1] bg-white p-6 shadow-xs sm:p-8 md:p-10">
            <div className="space-y-6 text-sm leading-7 text-[#5F4B45] sm:text-base sm:leading-8">
              {storyParagraphs.slice(1).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-9 border-t border-[#E4D5C1] pt-7">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/productos"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#8E2E28]"
                >
                  Conoce el catálogo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://www.instagram.com/zanita.tj/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E4D5C1] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#A73832] transition-colors hover:bg-[#FFF9F2]"
                >
                  <span className="text-base leading-none">@</span>
                  Síguenos en Instagram
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
