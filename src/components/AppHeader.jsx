import { useState } from 'react'

const ARCHIVE_STATUS = {
  idle: {
    label: 'NASA archive: IRSA SPHEREx',
    className: 'border-brass/30 bg-brass/10 text-brass',
  },
  loading: {
    label: 'NASA archive: querying IRSA',
    className: 'border-brass/30 bg-brass/10 text-brass',
  },
  ready: {
    label: 'NASA archive: SPHEREx results',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  empty: {
    label: 'NASA archive: no SPHEREx images',
    className: 'border-line bg-panel text-muted',
  },
  error: {
    label: 'NASA archive: query failed',
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
  },
}

export default function AppHeader({ archiveStatus = 'idle', mode = 'explorer', onModeChange }) {
  const [showGuide, setShowGuide] = useState(false)
  const archive = ARCHIVE_STATUS[archiveStatus] ?? ARCHIVE_STATUS.idle

  return (
    <header className="border-b border-line/80 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-brass animate-pulse" />
            <p className="text-[0.72rem] font-medium tracking-[0.22em] text-brass uppercase">
              NASA SPHEREx Explorer
            </p>
          </div>
          <h1 className="font-display mt-1 text-4xl leading-none text-ink sm:text-5xl">
            AstroLens <span className="italic text-glint">X</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {mode === 'explorer'
              ? 'Explore the cosmos in infrared light. Pick a famous sky target, view real NASA SPHEREx spectral images, and understand how astronomers study changes across the sky.'
              : 'Search published ICRS coordinates and query NASA/IPAC IRSA for Level-2 SPHEREx spectral images, WCS astrometry, and multi-epoch repeat coverage.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher Toggle */}
          <div
            role="radiogroup"
            aria-label="Interface mode"
            className="flex items-center rounded-xl border border-line bg-void/80 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'explorer'}
              onClick={() => onModeChange?.('explorer')}
              className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'explorer'
                  ? 'border border-glint/40 bg-glint/20 text-glint shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              <span>Explorer</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'science'}
              onClick={() => onModeChange?.('science')}
              className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'science'
                  ? 'border border-brass/50 bg-brass/20 text-brass shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span>Science</span>
            </button>
          </div>

          {/* Quick Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted transition hover:border-glint/50 hover:text-ink"
            title="Read astronomy guide"
          >
            <svg className="h-3.5 w-3.5 text-glint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Guide</span>
          </button>

          {/* Status Badge */}
          <span className={`rounded-full border px-3 py-1.5 text-xs ${archive.className}`}>
            {archive.label}
          </span>
        </div>
      </div>

      {/* Educational Guide Modal */}
      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-line/60 pb-4">
              <div>
                <span className="text-[0.68rem] tracking-[0.18em] text-brass uppercase">Science Guide</span>
                <h2 id="guide-title" className="font-display mt-1 text-2xl text-ink">
                  AstroLens X &amp; NASA SPHEREx
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="cursor-pointer rounded-full border border-line p-1.5 text-muted transition hover:border-glint/50 hover:text-ink"
                aria-label="Close guide"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
              <div className="rounded-2xl border border-line/60 bg-void/50 p-4">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <span className="text-glint">✦</span> What is NASA SPHEREx?
                </h3>
                <p className="mt-1 text-xs">
                  SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer)
                  is NASA’s all-sky spectral survey telescope. Every six months, SPHEREx scans the entire celestial sphere
                  across 102 infrared color bands between 0.75 µm and 5.0 µm.
                </p>
              </div>

              <div className="rounded-2xl border border-line/60 bg-void/50 p-4">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <span className="text-glint">✦</span> Why Observe in Infrared?
                </h3>
                <p className="mt-1 text-xs">
                  Cosmic dust grains scatter visible light, hiding young stars, forming planetary systems, and the hearts of galaxies.
                  Infrared light passes right through this dust, revealing the chemical signatures of water ice, carbon monoxide,
                  and organic molecules throughout the cosmos.
                </p>
              </div>

              <div className="rounded-2xl border border-line/60 bg-void/50 p-4">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <span className="text-glint">✦</span> How Coordinates Work (RA &amp; Dec)
                </h3>
                <p className="mt-1 text-xs">
                  The celestial sphere wraps around Earth like a giant globe. <strong>Right Ascension (RA)</strong> acts like celestial
                  longitude (east-west), measured in hours, minutes, and seconds. <strong>Declination (Dec)</strong> acts like latitude,
                  measuring angular distance north (+) or south (−) of the celestial equator in degrees.
                </p>
              </div>

              <div className="rounded-2xl border border-brass/40 bg-brass/10 p-4 text-ink">
                <h3 className="font-semibold text-brass flex items-center gap-2">
                  <span>🔬</span> Crucial Rule for Interpreting Images
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/90">
                  SPHEREx uses Linear Variable Filters where the observed infrared wavelength varies continuously across the detector.
                  When comparing images from different observation dates, differences in pixel brightness are usually due to
                  different infrared wavelengths or detector scan angles, <strong>not</strong> moving asteroids or scientific discoveries.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="cursor-pointer rounded-full border border-glint/60 bg-glint/20 px-5 py-2 text-xs font-medium text-glint transition hover:bg-glint/30"
              >
                Close &amp; Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
