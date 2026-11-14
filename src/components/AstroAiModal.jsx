import { useState } from 'react'

const SUGGESTED_QUESTIONS = [
  {
    id: 'q1',
    question: 'What am I looking at?',
    shortLabel: 'What am I looking at?',
    category: 'Target Basics',
    primer:
      'You are looking at calibrated Level-2 infrared science data from NASA’s SPHEREx space observatory. The bright pixels represent surface brightness in MegaJanskys per steradian (MJy/sr) captured across one of SPHEREx’s 102 distinct spectral channels (0.75 to 5.0 µm). The circular reticle in the center marks your chosen celestial coordinates.',
  },
  {
    id: 'q2',
    question: 'Why does this image look blurry or pixelated?',
    shortLabel: 'Why is it blurry?',
    category: 'Optics & Resolution',
    primer:
      'SPHEREx is an all-sky spectroscopic surveyor with a 20-cm aperture and large 6.155 arcsecond detector pixels (PSF FWHM ~7.5″). Unlike the Hubble or James Webb telescopes that zoom into microscopic details, SPHEREx is optimized for wide-field spectroscopy. An unresolved star naturally occupies only 1 to 2 pixels. When you view with "Nearest Neighbor", you see raw physical detector blocks; with "Bilinear", smooth interpolation is applied for display comfort.',
  },
  {
    id: 'q3',
    question: 'What changed between these observations?',
    shortLabel: 'What changed?',
    category: 'Sky Time Machine',
    primer:
      'When you compare two epochs, differences can arise from three factors: 1) True astrophysical changes (such as variable star pulsations or supernova flares), 2) Telescope scan angle rotation (causing diffraction spikes to swivel), or 3) Filter differences. SPHEREx Linear Variable Filters (LVF) measure slightly different wavelengths when a star lands on different parts of the detector across visits.',
  },
  {
    id: 'q4',
    question: 'Explain infrared light like I’m 12.',
    shortLabel: 'Infrared like I’m 12',
    category: 'Science 101',
    primer:
      'Visible light is only the tiny rainbow of colors human eyes can see. Infrared light is "heat light" with longer waves that our eyes miss, but our skin feels as warmth. In space, cold dust clouds block visible starlight like a thick curtain, but infrared light glides right through, letting NASA telescopes see baby stars forming inside dark nebulae and spot frigid brown dwarfs!',
  },
  {
    id: 'q5',
    question: 'How do astronomers discover moving objects?',
    shortLabel: 'How to spot moving objects',
    category: 'Blink Astronomy',
    primer:
      'Astronomers use the exact technique in AstroLens X’s "Blink Comparator"! By taking two pictures of the exact same patch of sky days, months, or years apart and rapidly alternating between them, stationary background stars stay motionless, while nearby asteroids, comets, or high-speed stars (like Barnard’s Star) appear to jump back and forth.',
  },
  {
    id: 'q6',
    question: 'Can you guide me through an experiment?',
    shortLabel: 'Guide me in an experiment',
    category: 'Student Space Lab',
    primer:
      'Head to the Student Space Lab section! Choose R Draconis to see how a pulsating red giant changes brightness, or select Barnard’s Star to evaluate high-speed proper motion across SPHEREx survey passes. Always make sure Epoch 1 and Epoch 2 use matching detector bands before drawing conclusions!',
  },
]

export default function AstroAiModal({ isOpen, onClose, selectedObject }) {
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [userQuery, setUserQuery] = useState('')

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="astro-ai-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-3 sm:p-6 bg-void/80 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-line/80 bg-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/70 bg-void/80 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 text-lg text-amber-300">
              ✨
            </span>
            <div>
              <h3 id="astro-ai-title" className="text-base font-semibold text-ink flex items-center gap-2">
                Ask Astro AI
                <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[0.62rem] font-bold text-amber-300 uppercase">
                  Phase 1 Learning Shell
                </span>
              </h3>
              <p className="text-xs text-muted">
                Interactive astronomy tutor for university students, educators, and the public.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-line p-2 text-muted hover:text-ink hover:bg-void transition"
            aria-label="Close Astro AI"
          >
            ✕
          </button>
        </div>

        {/* Notice of Phase 1 Scope (Honest & Rigorous) */}
        <div className="border-b border-line/50 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 flex items-start gap-2">
          <span className="text-base leading-none">ℹ️</span>
          <div className="text-[0.72rem] leading-relaxed">
            <strong>Phase 1 Shell Notice:</strong> Full conversational backend LLM integration connects in Phase 2. Explore the verified scientific curriculum primers below for key astronomical concepts!
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Target Context Card */}
          {selectedObject && (
            <div className="rounded-2xl border border-line/60 bg-void/50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[0.65rem] text-muted uppercase tracking-wider">Active Target Context</span>
                <p className="text-xs font-semibold text-glint">{selectedObject.name} ({selectedObject.designation})</p>
              </div>
              <span className="rounded-md border border-line bg-panel px-2 py-1 text-[0.68rem] text-muted">
                {selectedObject.kind}
              </span>
            </div>
          )}

          {/* Clickable Suggested Questions (Requirement 10) */}
          <div>
            <p className="text-[0.68rem] font-semibold text-muted uppercase tracking-wider mb-2.5">
              Click a question to learn with Astro AI:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => {
                const isActive = selectedQuestion?.id === q.id
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuestion(q)
                      setUserQuery('')
                    }}
                    className={`cursor-pointer text-left rounded-xl border p-3 transition flex flex-col justify-between ${
                      isActive
                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/50'
                        : 'border-line/70 bg-void/70 hover:border-glint/50 hover:bg-void'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[0.65rem] font-mono text-muted uppercase">{q.category}</span>
                      <span className="text-xs text-amber-400">{isActive ? '●' : '→'}</span>
                    </div>
                    <span className="mt-1 text-xs font-medium text-ink leading-snug">
                      {q.question}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Answer Primer Display */}
          {selectedQuestion && (
            <div className="rounded-2xl border border-amber-400/40 bg-void/90 p-4 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                <span>🤖 Astro AI Tutor:</span>
                <span className="font-mono text-[0.68rem] text-muted">[{selectedQuestion.category}]</span>
              </div>
              <p className="text-sm font-semibold text-ink">
                “{selectedQuestion.question}”
              </p>
              <div className="text-xs leading-relaxed text-ink/90 border-t border-line/40 pt-2.5 space-y-2">
                <p>{selectedQuestion.primer}</p>
              </div>
            </div>
          )}

          {/* Custom Question Input (Preparation for Phase 2) */}
          <div className="space-y-1.5 pt-2">
            <label htmlFor="ai-custom-input" className="text-[0.68rem] font-semibold text-muted uppercase tracking-wider">
              Ask your own question (Preview):
            </label>
            <div className="flex gap-2">
              <input
                id="ai-custom-input"
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="e.g., How does SPHEREx detect water ice in brown dwarfs?"
                className="flex-1 rounded-xl border border-line bg-void px-3.5 py-2 text-xs text-ink placeholder-muted/50 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (userQuery.trim()) {
                    setSelectedQuestion({
                      id: 'custom',
                      question: userQuery,
                      category: 'Student Inquiry',
                      primer: `Great question! In Phase 2, our backend deep astronomical AI reasoning model will directly ingest the active SPHEREx Level-2 FITS coordinates, calibrated fluxes, and spectral bandpasses to answer "${userQuery}". Try clicking one of the six verified primers above in the meantime!`,
                    })
                  }
                }}
                className="cursor-pointer rounded-xl border border-amber-400/50 bg-amber-400/20 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/30 transition"
              >
                Ask
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line/60 bg-void/80 px-4 py-3 sm:px-6 flex items-center justify-between text-xs text-muted">
          <span>NASA IRSA + SPHEREx Science Pipeline</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-xs font-medium text-glint hover:text-ink transition"
          >
            Done Learning
          </button>
        </div>
      </div>
    </div>
  )
}
