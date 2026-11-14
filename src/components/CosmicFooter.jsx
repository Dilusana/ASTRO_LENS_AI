export default function CosmicFooter({ onNavigate }) {
  return (
    <footer className="border-t border-line/60 bg-[#070c18] px-4 py-8 text-xs text-muted sm:px-6 lg:px-8 mt-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        {/* Left Branding */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-purple-400">∷</span>
            <span className="font-semibold text-ink">AstroLens X</span>
          </div>
          <p className="max-w-md text-[0.72rem] leading-relaxed text-muted">
            Observational deep-sky astrophysics powered by NASA SPHEREx multi-band spectral telemetry.
          </p>
        </div>

        {/* Center/Right Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.72rem] text-muted">
          <button
            type="button"
            onClick={() => onNavigate?.('explore')}
            className="hover:text-cyan-300 transition cursor-pointer"
          >
            Spectrogram Atlas
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('learn')}
            className="hover:text-cyan-300 transition cursor-pointer"
          >
            Mission Guide
          </button>
          <a
            href="https://science.nasa.gov/open-science/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 transition"
          >
            Open Science Policy
          </a>
          <a
            href="https://irsa.ipac.caltech.edu/Missions/spherex.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 transition"
          >
            SPHEREx Archives
          </a>
          <div className="flex items-center gap-1.5 text-ink/80 border-l border-line/60 pl-4">
            <span className="text-purple-400">🪐</span>
            <span>NASA Open Science Initiative</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
