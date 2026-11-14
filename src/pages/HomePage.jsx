import NightSkyViewer from '../components/NightSkyViewer'

export default function HomePage({ onNavigate, onSelectTarget, catalog = [] }) {
  function handleSurpriseTarget() {
    if (catalog.length === 0) {
      onNavigate?.('explore')
      return
    }
    const randomIndex = Math.floor(Math.random() * catalog.length)
    const randomObject = catalog[randomIndex]
    onSelectTarget?.(randomObject.id)
    onNavigate?.('explore')
  }

  return (
    <div className="space-y-16 py-4 sm:py-8">
      {/* 1. Hero Header */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-6">
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/30 px-3.5 py-1 text-xs text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono tracking-wide text-[0.7rem] uppercase">
            POWERED BY NASA SPHEREx OBSERVATIONS
          </span>
          <span className="text-[0.65rem] text-muted">🔄</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
          Explore the Universe with{' '}
          <span className="block sm:inline bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
            AstroLens X
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl mx-auto font-normal">
          Discover space, explore NASA images, and learn with AI. Unveil celestial nurseries, distant galaxies, and real cosmic spectroscopy made effortlessly simple.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => onNavigate?.('explore')}
            className="cursor-pointer flex items-center gap-2 rounded-full border border-pink-400/50 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(236,72,153,0.4)] transition hover:scale-105 active:scale-95"
          >
            <span>Start Exploring</span>
            <span>→</span>
          </button>
          <button
            type="button"
            onClick={handleSurpriseTarget}
            className="cursor-pointer flex items-center gap-2 rounded-full border border-line bg-panel/70 px-5 py-3 text-sm font-medium text-slate-200 shadow-sm transition hover:border-glint/50 hover:bg-white/5 hover:text-white"
          >
            <span className="text-xs">⏱</span>
            <span>Quick Cosmic Tour</span>
          </button>
        </div>
      </section>

      {/* 2. Large Immersive Night Sky Viewer Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <NightSkyViewer
          onNavigate={onNavigate}
          onSelectTarget={onSelectTarget}
          catalog={catalog}
        />
      </section>

      {/* 3. "WHAT YOU CAN DO" Three Cards Section */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[0.72rem] font-mono font-medium tracking-[0.2em] text-purple-400 uppercase">
            ✦ WHAT YOU CAN DO
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            A Telescope and Astronomer in Your Pocket
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto">
            Built for curious beginners, classrooms, and universe admirers of every age
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Explore the Sky */}
          <div className="group rounded-2xl border border-line/80 bg-panel/50 p-6 flex flex-col justify-between transition hover:border-purple-400/50 hover:bg-panel/80 hover:shadow-[0_10px_30px_rgba(139,92,246,0.15)]">
            <div className="space-y-4">
              {/* Thumbnail Container */}
              <div className="h-36 rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
                <div
                  className="w-full h-full bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `radial-gradient(circle at center, rgba(139, 92, 246, 0.4), transparent 70%), url('https://images-assets.nasa.gov/image/PIA04921/PIA04921~thumb.jpg')`,
                  }}
                />
                <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.62rem] font-mono text-cyan-300 backdrop-blur-sm">
                  • SKY ATLAS
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                Explore the Sky
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Interactive visual map of stars, nebulae, and deep space objects. Zoom in seamlessly from full constellations to planetary nebulae.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => onNavigate?.('explore')}
                className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
              >
                <span>Open Star Map</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Card 2: Compare Over Time */}
          <div className="group rounded-2xl border border-line/80 bg-panel/50 p-6 flex flex-col justify-between transition hover:border-cyan-400/50 hover:bg-panel/80 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)]">
            <div className="space-y-4">
              {/* Thumbnail Container */}
              <div className="h-36 rounded-xl overflow-hidden border border-white/10 bg-black/40 relative flex">
                <div
                  className="w-1/2 h-full bg-cover bg-center border-r border-cyan-400/40"
                  style={{
                    backgroundImage: `url('https://images-assets.nasa.gov/image/PIA14445/PIA14445~thumb.jpg')`,
                  }}
                />
                <div
                  className="w-1/2 h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg')`,
                  }}
                />
                <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.62rem] font-mono text-amber-300 backdrop-blur-sm">
                  • TIME MACHINE
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                Compare Over Time
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                See how stars, supernovae remnants, and orbiting planets move across historical NASA captures and newly beamed SPHEREx surveys.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => {
                  onSelectTarget?.('sirius')
                  onNavigate?.('explore')
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>Compare Observations</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Card 3: Ask Astro AI */}
          <div className="group rounded-2xl border border-line/80 bg-panel/50 p-6 flex flex-col justify-between transition hover:border-pink-400/50 hover:bg-panel/80 hover:shadow-[0_10px_30px_rgba(236,72,153,0.15)]">
            <div className="space-y-4">
              {/* Thumbnail Container */}
              <div className="h-36 rounded-xl overflow-hidden border border-white/10 bg-black/40 relative flex items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="soundwave-bar w-1.5 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full" />
                  <span className="soundwave-bar w-1.5 bg-gradient-to-t from-pink-500 to-cyan-400 rounded-full" />
                  <span className="soundwave-bar w-1.5 bg-gradient-to-t from-cyan-400 to-purple-400 rounded-full" />
                  <span className="soundwave-bar w-1.5 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full" />
                </div>
                <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.62rem] font-mono text-pink-300 backdrop-blur-sm">
                  • CONVERSATIONAL ASSISTANT
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition">
                Ask Astro AI
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Your friendly conversational space companion. Inquire about cosmic distances, how water forms in nebulae, or decode spectral colors.
              </p>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => onNavigate?.('ai')}
                className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition"
              >
                <span>Start a Chat</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom "Curious where to start?" Banner */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="rounded-2xl border border-line/80 bg-gradient-to-r from-panel/90 via-panel/60 to-purple-950/30 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-900/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <span className="text-base">💡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Curious where to start?</p>
              <p className="text-xs text-muted">
                Try asking: <span className="text-cyan-300">"What are the Pillars of Creation made of?"</span> or click below for a surprise wonder.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSurpriseTarget}
            className="cursor-pointer shrink-0 rounded-xl border border-line bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-purple-400/60 hover:bg-purple-900/20 active:scale-95 shadow-sm"
          >
            🎲 Surprise Celestial Target
          </button>
        </div>
      </section>
    </div>
  )
}
