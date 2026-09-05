export function GlowBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Concentric ring pattern */}
      <div className="absolute inset-0 rings-pattern animate-drift" />

      {/* Drifting glow orbs */}
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/12 blur-[120px] animate-drift" />
      <div className="absolute left-[18%] top-[22%] h-[280px] w-[280px] rounded-full bg-white/8 blur-[100px] animate-glow-pulse" />
      <div
        className="absolute right-[16%] bottom-[20%] h-[320px] w-[320px] rounded-full bg-white/8 blur-[110px] animate-glow-pulse"
        style={{ animationDelay: '2s' }}
      />

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_30%,rgba(0,0,0,0.85)_100%)]" />

      {/* Top hairline sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  )
}
