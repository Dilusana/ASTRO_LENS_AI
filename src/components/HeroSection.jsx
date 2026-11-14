export default function HeroSection({ onNavigate, selectedObject }) {
  return (
    <section className="relative overflow-hidden border-b border-line/60 bg-gradient-to-b from-panel/70 via-void/80 to-void px-4 pt-8 pb-10 sm:px-6 sm:pt-12 sm:pb-14 lg:px-8">
      {/* Decorative ambient cosmic glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-glint/15 via-brass/10 to-glint/10 blur-3xl" />

      <div className="mx-auto max-w-4xl text-center">
        {/* NASA & Challenge Badges */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-3.5 py-1 text-xs text-brass shadow-xs">
          <span className="flex h-2 w-2 rounded-full bg-brass animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[0.68rem]">NASA Space Apps Challenge 2026</span>
          <span className="text-brass/40">•</span>
          <span className="font-mono text-[0.7rem] text-glint">SPHEREx Mission &amp; IRSA Archive</span>
        </div>

        {/* Main Headline & Subtitle */}
        <h1 className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight">
          Your Universe. <span className="italic text-glint">Your Discovery.</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-2xl text-base sm:text-lg leading-relaxed text-muted">
          Explore real NASA observations, watch the sky change, and learn with Astro AI.
        </p>
        <p className="mx-auto mt-1 max-w-xl text-xs text-muted/75">
          Connecting students, educators, and stargazers directly to genuine infrared spectral data from NASA/IPAC IRSA.
        </p>

        {/* 4 Clear Entry Points */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Entry 1: Explore the Sky */}
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="group cursor-pointer flex flex-col items-center rounded-2xl border border-line/70 bg-panel/70 p-3.5 text-center transition hover:border-glint/60 hover:bg-panel hover:shadow-[0_0_20px_rgba(159,215,255,0.12)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-glint/30 bg-glint/10 text-xl text-glint group-hover:scale-105 transition">
              🔭
            </div>
            <span className="mt-2 text-xs font-semibold text-ink group-hover:text-glint">Explore the Sky</span>
            <span className="mt-0.5 text-[0.68rem] text-muted">Browse celestial targets</span>
          </button>

          {/* Entry 2: Sky Time Machine */}
          <button
            type="button"
            onClick={() => onNavigate('timemachine')}
            className="group cursor-pointer flex flex-col items-center rounded-2xl border border-line/70 bg-panel/70 p-3.5 text-center transition hover:border-brass/60 hover:bg-panel hover:shadow-[0_0_20px_rgba(228,194,122,0.12)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brass/30 bg-brass/10 text-xl text-brass group-hover:scale-105 transition">
              ⏱️
            </div>
            <span className="mt-2 text-xs font-semibold text-ink group-hover:text-brass">Sky Time Machine</span>
            <span className="mt-0.5 text-[0.68rem] text-muted">Blink &amp; compare epochs</span>
          </button>

          {/* Entry 3: Student Space Lab */}
          <button
            type="button"
            onClick={() => onNavigate('spacelab')}
            className="group cursor-pointer flex flex-col items-center rounded-2xl border border-line/70 bg-panel/70 p-3.5 text-center transition hover:border-emerald-500/60 hover:bg-panel hover:shadow-[0_0_20px_rgba(52,211,153,0.12)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xl text-emerald-300 group-hover:scale-105 transition">
              🧪
            </div>
            <span className="mt-2 text-xs font-semibold text-ink group-hover:text-emerald-300">Student Space Lab</span>
            <span className="mt-0.5 text-[0.68rem] text-muted">Interactive experiment</span>
          </button>

          {/* Entry 4: Ask Astro AI */}
          <button
            type="button"
            onClick={() => onNavigate('askai')}
            className="group cursor-pointer flex flex-col items-center rounded-2xl border border-line/70 bg-panel/70 p-3.5 text-center transition hover:border-amber-400/60 hover:bg-panel hover:shadow-[0_0_20px_rgba(251,191,36,0.12)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-xl text-amber-300 group-hover:scale-105 transition">
              ✨
            </div>
            <span className="mt-2 text-xs font-semibold text-ink group-hover:text-amber-300">Ask Astro AI</span>
            <span className="mt-0.5 text-[0.68rem] text-muted">Astronomy learning tutor</span>
          </button>
        </div>

        {/* Selected target quick status pill if active */}
        {selectedObject && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line/60 bg-void/60 px-4 py-1.5 text-xs text-muted backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Currently exploring:</span>
            <span className="font-semibold text-glint">{selectedObject.name}</span>
            <span className="text-muted/50">•</span>
            <span>{selectedObject.kind}</span>
          </div>
        )}
      </div>
    </section>
  )
}
