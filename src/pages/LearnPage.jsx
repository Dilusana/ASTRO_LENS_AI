import { useState, useEffect } from 'react'

export default function LearnPage({ onNavigate, onSelectTarget }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [activeFrame, setActiveFrame] = useState(1)
  const [badges, setBadges] = useState(() => {
    try {
      const saved = localStorage.getItem('astrolens_badges')
      return saved ? JSON.parse(saved) : { explorer: true, sleuth: false, galaxy: false }
    } catch {
      return { explorer: true, sleuth: false, galaxy: false }
    }
  })

  // Auto-blink animation for the Citizen Science comparator snapshot
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFrame((f) => (f === 1 ? 2 : 1))
    }, 1200)
    return () => clearInterval(timer)
  }, [])

  function handleSelectAnswer(index) {
    setSelectedAnswer(index)
    setShowFeedback(true)
    if (index === 0) {
      // Correct answer! Unlock Starlight Sleuth badge
      const updated = { ...badges, sleuth: true }
      setBadges(updated)
      try {
        localStorage.setItem('astrolens_badges', JSON.stringify(updated))
      } catch {
        // ignore
      }
    }
  }

  function handleModule1() {
    onSelectTarget?.('betelgeuse')
    onNavigate?.('explore')
  }

  function handleModule2() {
    onSelectTarget?.('m31')
    const updated = { ...badges, galaxy: true }
    setBadges(updated)
    try {
      localStorage.setItem('astrolens_badges', JSON.stringify(updated))
    } catch {
      // ignore
    }
    onNavigate?.('explore')
  }

  function handleModule3() {
    onSelectTarget?.('barnards-star')
    onNavigate?.('explore')
  }

  return (
    <div className="space-y-16 py-4 sm:py-8 max-w-6xl mx-auto px-4">
      {/* 1. Header & Badges */}
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/30 px-3.5 py-1 text-xs text-purple-300">
          <span className="text-[0.68rem]">✦</span>
          <span className="font-mono text-[0.68rem] uppercase tracking-wider">
            CURATED LEARNING PATHWAYS
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Learn Space Through Real NASA Discoveries
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Choose a topic, explore authentic space observations, and test what you know with fun mini-quizzes.
        </p>

        {/* 3 Metric Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <span className="rounded-full border border-line bg-panel/60 px-3.5 py-1 text-[0.72rem] text-slate-300 flex items-center gap-1.5">
            <span className="text-amber-400">★</span> Curated by Astrophysicists
          </span>
          <span className="rounded-full border border-line bg-panel/60 px-3.5 py-1 text-[0.72rem] text-slate-300 flex items-center gap-1.5">
            <span className="text-cyan-400">⏱</span> 5-Min Bites
          </span>
          <span className="rounded-full border border-line bg-panel/60 px-3.5 py-1 text-[0.72rem] text-slate-300 flex items-center gap-1.5">
            <span className="text-purple-400">🏆</span> Unlock 7 Cosmic Badges
          </span>
        </div>
      </section>

      {/* 2. Three Primary Educational Modules */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Stars & Supergiants */}
        <div className="rounded-2xl border border-line/80 bg-panel/60 p-5 sm:p-6 flex flex-col justify-between space-y-5 transition hover:border-purple-400/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)] backdrop-blur-sm">
          <div className="space-y-4">
            {/* Image Banner */}
            <div className="relative h-40 rounded-xl overflow-hidden border border-white/10 bg-black">
              <img
                src="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg"
                alt="Stars & Supergiants"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[0.62rem] font-mono text-purple-300 backdrop-blur-sm">
                • MODULE 01
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">Stars & Supergiants</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Learn how stars ignite inside cosmic nurseries, why newborn stars shine sapphire blue while dying giants swell red, and what triggers cosmic supernovas.
            </p>

            {/* Mini-Activity Box */}
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-1">
              <p className="text-[0.68rem] font-mono font-semibold text-purple-300 flex items-center justify-between">
                <span>⚡ MINI-ACTIVITY</span>
                <span className="text-muted font-normal">5 min</span>
              </p>
              <p className="text-[0.72rem] text-slate-300">
                Understand stellar temperature to witness blue sparks shift to red pulses.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModule1}
            className="cursor-pointer w-full rounded-xl border border-pink-500/40 bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Stellar Lab &gt;
          </button>
        </div>

        {/* Module 2: Galaxies & Deep Space */}
        <div className="rounded-2xl border border-line/80 bg-panel/60 p-5 sm:p-6 flex flex-col justify-between space-y-5 transition hover:border-cyan-400/50 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
          <div className="space-y-4">
            {/* Image Banner */}
            <div className="relative h-40 rounded-xl overflow-hidden border border-white/10 bg-black">
              <img
                src="https://images-assets.nasa.gov/image/PIA04921/PIA04921~thumb.jpg"
                alt="Galaxies & Deep Space"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[0.62rem] font-mono text-cyan-300 backdrop-blur-sm">
                • MODULE 02
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">Galaxies & Deep Space</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Discover hundreds of billions of stars swirling in cosmic islands, navigate opaque dark dust lanes, and learn how infrared sensors gaze back in cosmic time.
            </p>

            {/* Mini-Activity Box */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-1">
              <p className="text-[0.68rem] font-mono font-semibold text-cyan-300 flex items-center justify-between">
                <span>⚡ MINI-ACTIVITY</span>
                <span className="text-muted font-normal">4 min</span>
              </p>
              <p className="text-[0.72rem] text-slate-300">
                Peel back visible light into infrared to reveal hidden galactic nuclei.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModule2}
            className="cursor-pointer w-full rounded-xl border border-cyan-400/40 bg-panel/90 py-2.5 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-950/40 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            Unfold Andromeda &gt;
          </button>
        </div>

        {/* Module 3: How Space Changes */}
        <div className="rounded-2xl border border-line/80 bg-panel/60 p-5 sm:p-6 flex flex-col justify-between space-y-5 transition hover:border-indigo-400/50 hover:shadow-[0_10px_30px_rgba(99,102,241,0.15)] backdrop-blur-sm">
          <div className="space-y-4">
            {/* Image Banner */}
            <div className="relative h-40 rounded-xl overflow-hidden border border-white/10 bg-black flex">
              <div
                className="w-1/2 h-full bg-cover bg-center border-r border-white/20"
                style={{
                  backgroundImage: `url('https://images-assets.nasa.gov/image/PIA14445/PIA14445~thumb.jpg')`,
                }}
              />
              <div
                className="w-1/2 h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg')`,
                }}
              />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[0.62rem] font-mono text-indigo-300 backdrop-blur-sm">
                • MODULE 03
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">How Space Changes</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              The sky is not frozen in place! Learn how astronomers blink telescope exposures captured a decade apart to catch elusive brown dwarfs and wandering cosmic wanderers.
            </p>

            {/* Mini-Activity Box */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-1">
              <p className="text-[0.68rem] font-mono font-semibold text-indigo-300 flex items-center justify-between">
                <span>⚡ MINI-ACTIVITY</span>
                <span className="text-muted font-normal">3 min</span>
              </p>
              <p className="text-[0.72rem] text-slate-300">
                Toggle a rapid image comparator to spot the wandering cosmic wanderer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModule3}
            className="cursor-pointer w-full rounded-xl border border-indigo-400/40 bg-panel/90 py-2.5 text-xs font-semibold text-indigo-300 hover:text-white hover:bg-indigo-950/40 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            Try Blinker Tool ↓
          </button>
        </div>
      </section>

      {/* 3. CITIZEN SCIENCE CHALLENGE: Quick Knowledge Check */}
      <section className="rounded-2xl border border-line/80 bg-panel/70 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[0.68rem] font-mono font-medium text-cyan-300 uppercase">
              <span>✦</span>
              <span>CITIZEN SCIENCE CHALLENGE</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Quick Knowledge Check
            </h2>
            <p className="text-xs text-muted">
              Astronomers compare multi-epoch sky surveys to spot cosmic motion. Put your eye to the test with real archival observations!
            </p>
          </div>
          <span className="self-start sm:self-center rounded-full border border-line bg-black/40 px-3 py-1 text-[0.7rem] font-mono text-cyan-300">
            • Active Question 1 of 1
          </span>
        </div>

        {/* Two-Pane Interactive Quiz */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Pane: Observation Snapshot / Blinker Display */}
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-black/80 overflow-hidden relative shadow-inner flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-[0.65rem] font-mono text-slate-300">
              <span className="text-cyan-300">
                SURVEY FRAME {activeFrame} — EPOCH {activeFrame === 1 ? '2014' : '2024'}
              </span>
              <button
                type="button"
                onClick={() => setActiveFrame((f) => (f === 1 ? 2 : 1))}
                className="cursor-pointer rounded border border-white/20 bg-white/10 px-2 py-0.5 text-slate-200 hover:bg-white/20"
              >
                Toggle Frame ↷
              </button>
            </div>

            {/* Simulated Astrometric Starfield with Proper Motion Jump */}
            <div className="relative h-60 w-full overflow-hidden bg-[#04060d]">
              {/* Star dots */}
              <div className="absolute inset-0">
                <span className="absolute top-[20%] left-[25%] h-1 w-1 rounded-full bg-white/70" />
                <span className="absolute top-[35%] left-[80%] h-1.5 w-1.5 rounded-full bg-white/60" />
                <span className="absolute top-[75%] left-[15%] h-1 w-1 rounded-full bg-white/50" />
                <span className="absolute top-[82%] left-[70%] h-1.5 w-1.5 rounded-full bg-white/80" />
                <span className="absolute top-[15%] left-[60%] h-1 w-1 rounded-full bg-white/70" />
                <span className="absolute top-[60%] left-[35%] h-1.5 w-1.5 rounded-full bg-white/60" />
              </div>

              {/* The Moving Target Star (shifts across epochs!) */}
              <div
                style={{
                  top: '48%',
                  left: activeFrame === 1 ? '46%' : '54%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                {/* Reticle Target Circle */}
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-cyan-400/80 animate-ping opacity-40" />
                  <span className="absolute inset-1 rounded-full border border-cyan-400" />
                  {/* Crosshairs */}
                  <span className="absolute h-full w-[1px] bg-cyan-400/60" />
                  <span className="absolute w-full h-[1px] bg-cyan-400/60" />
                  {/* Central Star */}
                  <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#38bdf8]" />
                </div>
              </div>

              {/* Vector Label */}
              <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[0.62rem] font-mono text-cyan-300 border border-white/10">
                PROPER MOTION VECTOR: +8.2 arcsec
              </div>
            </div>
          </div>

          {/* Right Pane: Question & Options */}
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[0.68rem] font-mono uppercase text-pink-400">FLASH PROMPT</span>
              <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                "Look at these two snapshots taken 10 years apart. What caused that bright spot to shift position?"
              </p>
            </div>

            {/* Radio Options */}
            <div className="space-y-2.5">
              {[
                {
                  id: 0,
                  text: 'A) A nearby fast-moving star (Proper Motion)',
                  isCorrect: true,
                },
                {
                  id: 1,
                  text: 'B) A smudge or particle on the telescope lens',
                  isCorrect: false,
                },
                {
                  id: 2,
                  text: 'C) A distant stationary galaxy expanding',
                  isCorrect: false,
                },
              ].map((opt) => {
                const isSelected = selectedAnswer === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectAnswer(opt.id)}
                    className={`cursor-pointer w-full text-left rounded-xl border p-3.5 text-xs transition duration-150 flex items-center justify-between ${
                      isSelected
                        ? opt.isCorrect
                          ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200'
                          : 'border-red-500/80 bg-red-950/30 text-red-200'
                        : 'border-line/70 bg-black/30 text-slate-200 hover:border-purple-400 hover:text-white'
                    }`}
                  >
                    <span>{opt.text}</span>
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border text-[0.65rem] ${
                        isSelected
                          ? opt.isCorrect
                            ? 'border-emerald-400 bg-emerald-500 text-white'
                            : 'border-red-400 bg-red-500 text-white'
                          : 'border-muted'
                      }`}
                    >
                      {isSelected ? (opt.isCorrect ? '✓' : '✕') : ''}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Instant Feedback Callout */}
            {showFeedback && (
              <div
                className={`rounded-xl border p-3.5 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  selectedAnswer === 0
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                    : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                }`}
              >
                {selectedAnswer === 0 ? (
                  <div className="space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>🎉 Correct! Proper Motion Confirmed.</span>
                    </p>
                    <p>
                      Nearby stars like Barnard's Star travel rapidly relative to our solar system. When comparing observations taken a decade apart, their angular position visibly leaps across the background of distant galaxies!
                    </p>
                    <p className="text-[0.68rem] text-emerald-300 font-semibold pt-1">
                      🏆 Starlight Sleuth badge unlocked in your Learning Passport!
                    </p>
                  </div>
                ) : (
                  <p>
                    Not quite. Smudges would not appear as clean point-spread functions, and distant galaxies take millions of years to show visible structural changes. Try again!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. "Did you know?" Card */}
      <section className="rounded-2xl border border-line/80 bg-gradient-to-r from-panel/90 via-panel/60 to-cyan-950/30 p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-950/50 text-cyan-300">
              <span className="text-base">📢</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-wide">
                Did you know?
              </p>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
                NASA SPHEREx will map the entire sky in 102 distinct infrared colors every 6 months, spotting changes and cataloging over 450 million galaxies across cosmic time.
              </p>
            </div>
          </div>

          {/* Equalizer Spectrum Bars */}
          <div className="flex items-end gap-1.5 h-8 shrink-0 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="soundwave-bar w-1 bg-purple-400 rounded-full" />
            <span className="soundwave-bar w-1 bg-pink-400 rounded-full" />
            <span className="soundwave-bar w-1 bg-cyan-400 rounded-full" />
            <span className="soundwave-bar w-1 bg-blue-400 rounded-full" />
            <span className="soundwave-bar w-1 bg-emerald-400 rounded-full" />
            <span className="soundwave-bar w-1 bg-amber-400 rounded-full" />
          </div>
        </div>
      </section>

      {/* 5. Your Learning Passport */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🏆</span>
            <h3 className="text-lg font-bold text-white">Your Learning Passport</h3>
          </div>
          <span className="text-[0.68rem] font-mono text-muted uppercase">
            PROGRESS TRACKED LOCALLY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Badge 1: Cosmic Explorer */}
          <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4 flex items-center gap-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <span>🪐</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cosmic Explorer</p>
              <p className="text-[0.68rem] text-purple-300 font-semibold">Unlocked</p>
              <p className="text-[0.62rem] text-muted">Visited all real NASA mission modes</p>
            </div>
          </div>

          {/* Badge 2: Starlight Sleuth */}
          <div
            className={`rounded-xl border p-4 flex items-center gap-3 transition ${
              badges.sleuth
                ? 'border-emerald-500/40 bg-emerald-950/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'border-line/60 bg-panel/30 text-muted opacity-60'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                badges.sleuth
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                  : 'border-muted bg-panel text-muted'
              }`}
            >
              <span>{badges.sleuth ? '⭐' : '🔒'}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Starlight Sleuth</p>
              <p className={`text-[0.68rem] font-semibold ${badges.sleuth ? 'text-emerald-300' : 'text-muted'}`}>
                {badges.sleuth ? 'Unlocked' : 'Locked'}
              </p>
              <p className="text-[0.62rem] text-muted">Identify proper motion in Knowledge Check</p>
            </div>
          </div>

          {/* Badge 3: Galaxy Scout */}
          <div
            className={`rounded-xl border p-4 flex items-center gap-3 transition ${
              badges.galaxy
                ? 'border-cyan-500/40 bg-cyan-950/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'border-line/60 bg-panel/30 text-muted opacity-60'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                badges.galaxy
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                  : 'border-muted bg-panel text-muted'
              }`}
            >
              <span>{badges.galaxy ? '🌌' : '🔒'}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Galaxy Scout</p>
              <p className={`text-[0.68rem] font-semibold ${badges.galaxy ? 'text-cyan-300' : 'text-muted'}`}>
                {badges.galaxy ? 'Unlocked' : 'Locked'}
              </p>
              <p className="text-[0.62rem] text-muted">Tour Andromeda and identify spiral arms</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
