export default function CosmicNavbar({
  currentPage = 'home',
  onNavigate,
  archiveStatus: _archiveStatus = 'ready',
  mode = 'explorer',
  onModeChange,
}) {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore' },
    { id: 'learn', label: 'Learn' },
    { id: 'ai', label: 'Astro AI' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-[#050814]/85 backdrop-blur-md px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('home')}
            className="group flex items-center gap-2.5 text-left cursor-pointer"
          >
            {/* 4-Point Cosmic Compass Star */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-950/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition group-hover:scale-105 group-hover:border-purple-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" />
                <circle cx="12" cy="12" r="3" className="fill-cyan-400/30 stroke-cyan-300" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tracking-wide text-ink text-base">AstroLens</span>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-base">X</span>
              </div>
              <p className="text-[0.62rem] font-mono tracking-[0.2em] text-muted uppercase">
                COSMIC TELEMETRY
              </p>
            </div>
          </button>

          {/* NASA SPHEREx Live Data Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-0.5 text-[0.68rem] text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono">NASA SPHEREx DATA</span>
          </div>
        </div>

        {/* Center Navigation Pills */}
        <nav aria-label="Main Navigation" className="flex items-center rounded-full border border-line bg-panel/60 p-1 shadow-inner">
          {navItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition duration-200 ${
                  isActive
                    ? 'border border-purple-400/40 bg-purple-600/85 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'text-muted hover:text-ink hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right CTA & Profile */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher (Discrete) */}
          {onModeChange && (
            <button
              type="button"
              onClick={() => onModeChange(mode === 'explorer' ? 'science' : 'explorer')}
              className={`hidden md:flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.68rem] font-mono transition cursor-pointer ${
                mode === 'science'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-line/60 bg-panel/40 text-muted hover:text-ink'
              }`}
              title="Toggle Science Mode for raw WCS metrics"
            >
              <span>Mode:</span>
              <span className="font-semibold uppercase">{mode}</span>
            </button>
          )}

          {/* Launch Explorer Gradient Button */}
          <button
            type="button"
            onClick={() => onNavigate?.('explore')}
            className="cursor-pointer hidden sm:flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.35)] transition duration-200 hover:scale-105 active:scale-95"
          >
            <span>Launch Explorer</span>
            <span className="text-xs">→</span>
          </button>

          {/* User Profile Avatar Pill */}
          <button
            type="button"
            onClick={() => onNavigate?.('learn')}
            aria-label="Student Learning Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-400/30 bg-purple-900/30 text-purple-300 transition hover:border-purple-400 hover:scale-105 cursor-pointer"
            title="Your Learning Passport"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
