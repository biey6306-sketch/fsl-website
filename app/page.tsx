import Image from 'next/image'
import { GlowBackground } from '@/components/glow-background'
import { UserSearch } from '@/components/user-search'

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <GlowBackground />

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <div className="relative animate-float-up">
          {/* Glow halo behind the logo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 scale-110 rounded-full bg-white/25 blur-3xl animate-glow-pulse"
          />
          <Image
            src="/images/fsl-logo.png"
            alt="Freestyle Super League logo"
            width={200}
            height={200}
            priority
            className="h-36 w-auto drop-shadow-[0_0_35px_rgba(255,255,255,0.55)] sm:h-44"
          />
        </div>

        <h1
          className="relative animate-float-up font-display text-balance text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-8xl md:text-9xl"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Layered glow behind the wordmark */}
          <span
            aria-hidden="true"
            className="absolute inset-0 select-none text-white opacity-60 blur-2xl animate-glow-pulse"
          >
            Freestyle Super League
          </span>
          <span className="shine-text animate-shine relative">Freestyle Super League</span>
        </h1>

        <p
          className="max-w-md animate-float-up text-pretty text-sm leading-relaxed text-white/50 sm:text-base"
          style={{ animationDelay: '0.2s' }}
        >
          Where raw talent meets the spotlight. The definitive stage for freestyle competition.
        </p>

        <div className="mt-2 h-px w-2/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div
          className="flex w-full animate-float-up justify-center"
          style={{ animationDelay: '0.3s' }}
        >
          <UserSearch />
        </div>
      </section>
    </main>
  )
}
