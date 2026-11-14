import { useState } from 'react'

const LAB_EXPERIMENTS = [
  {
    id: 'exp1',
    title: 'Pulsating Giants: The Breathing Star',
    targetId: 'r-draconis',
    targetName: 'R Draconis',
    targetType: 'Mira Variable Star',
    hypothesis:
      'Pulsating asymptotic giant branch stars physically swell and contract over hundreds of days, dramatically altering their infrared thermal emission.',
    whatToLookFor:
      'Look for substantial joint flux differences across SPHEREx visits separated by weeks or months in identical detector bands.',
    caution:
      'Verify that both epochs use the exact same SPHEREx detector bandpass (e.g., SPHEREx-D2) to ensure the difference is true stellar pulsation and not filter variation.',
  },
  {
    id: 'exp2',
    title: 'High Proper Motion: Cosmic Speed Benchmarks',
    targetId: 'barnards-star',
    targetName: "Barnard's Star",
    targetType: 'Red Dwarf Star',
    hypothesis:
      'Distant stars appear frozen in place over human lifespans, but nearby stars with extreme velocity might display detectable proper motion over multi-year baselines.',
    whatToLookFor:
      'At 10.3 arcseconds/year and SPHEREx’s 6.155″ pixel scale, inspect if the stellar centroid shifts between epochs separated by sufficient time.',
    caution:
      'SPHEREx scans the sky continuously. Always check the temporal baseline (Δt) in the Sky Time Machine to see if enough months have elapsed for detectable displacement.',
  },
  {
    id: 'exp3',
    title: 'Infant Solar Systems: Dust Disk Occultations',
    targetId: 'rw-aurigae',
    targetName: 'RW Aurigae',
    targetType: 'T Tauri Variable',
    hypothesis:
      'Young stars actively forming planets experience violent tidal interactions that drag circumstellar dust streams across our line of sight, dimming infrared light.',
    whatToLookFor:
      'Compare infrared flux levels across different passes to study warm circumstellar dust accretion and disk obscuration.',
    caution:
      'A brightness drop can also be caused by pointing off-center near detector edges. Verify that Footprint says "Centered" for both epochs.',
  },
]

export default function StudentSpaceLab({ onSelectTarget }) {
  const [activeExp, setActiveExp] = useState(LAB_EXPERIMENTS[0])

  return (
    <section
      id="student-space-lab"
      aria-labelledby="space-lab-heading"
      className="mt-12 rounded-3xl border border-line/70 bg-gradient-to-br from-panel/90 via-panel/60 to-void p-6 sm:p-8 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-line/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300">
              🧪
            </span>
            <span className="text-[0.68rem] font-semibold tracking-[0.2em] text-emerald-300 uppercase">
              Student Space Lab · Interactive Astronomy Curriculum
            </span>
          </div>
          <h2 id="space-lab-heading" className="font-display mt-1 text-2xl sm:text-3xl text-ink">
            Guided Experiment: “Can the Sky Change?”
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted leading-relaxed">
            Designed for university courses, high school science classrooms, and curious stargazers. Learn how astronomers use multi-epoch infrared surveys to distinguish real cosmic changes from instrumental scan effects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-300">
            Open Science Protocol
          </span>
        </div>
      </div>

      {/* 4-Phase Scientific Method Tracker */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line/60 bg-void/60 p-3.5">
          <span className="text-[0.62rem] font-mono text-muted uppercase">Phase 1</span>
          <p className="mt-0.5 text-xs font-semibold text-ink">Formulate Hypothesis</p>
          <p className="mt-1 text-[0.68rem] text-muted">Identify cosmic variability mechanisms.</p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-void/60 p-3.5">
          <span className="text-[0.62rem] font-mono text-muted uppercase">Phase 2</span>
          <p className="mt-0.5 text-xs font-semibold text-ink">Select Test Target</p>
          <p className="mt-1 text-[0.68rem] text-muted">Choose verified benchmark objects.</p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-void/60 p-3.5">
          <span className="text-[0.62rem] font-mono text-muted uppercase">Phase 3</span>
          <p className="mt-0.5 text-xs font-semibold text-ink">Run Sky Time Machine</p>
          <p className="mt-1 text-[0.68rem] text-muted">Blink and wipe across survey epochs.</p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-void/60 p-3.5">
          <span className="text-[0.62rem] font-mono text-muted uppercase">Phase 4</span>
          <p className="mt-0.5 text-xs font-semibold text-ink">Scientific Evaluation</p>
          <p className="mt-1 text-[0.68rem] text-muted">Account for filter and orientation effects.</p>
        </div>
      </div>

      {/* Experiment Chooser Tabs */}
      <div className="mt-6 space-y-4">
        <p className="text-[0.68rem] font-semibold text-muted uppercase tracking-wider">
          Select an Investigation Track:
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {LAB_EXPERIMENTS.map((exp) => {
            const isSelected = activeExp.id === exp.id
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => setActiveExp(exp)}
                className={`cursor-pointer text-left rounded-2xl border p-4 transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.15)] ring-1 ring-emerald-500/50'
                    : 'border-line/70 bg-void/70 hover:border-glint/50 hover:bg-void'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[0.65rem] text-muted">{exp.targetType}</span>
                  <span className={`text-xs ${isSelected ? 'text-emerald-400 font-bold' : 'text-muted'}`}>
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-semibold text-ink">{exp.title}</h3>
                <p className="mt-1 font-mono text-[0.7rem] text-glint">Target: {exp.targetName}</p>
              </button>
            )
          })}
        </div>

        {/* Active Experiment Detail Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-void/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-3">
            <div>
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-400">
                Active Protocol: {activeExp.title}
              </span>
              <p className="text-sm font-semibold text-ink">Target: {activeExp.targetName} ({activeExp.targetType})</p>
            </div>

            <button
              type="button"
              onClick={() => onSelectTarget(activeExp.targetId)}
              className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-brass/50 bg-brass/20 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass/30 transition shadow-sm"
            >
              <span>Load {activeExp.targetName} into Time Machine</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1 rounded-xl border border-line/40 bg-panel/40 p-3.5">
              <span className="font-semibold text-glint">🔬 Hypothesis:</span>
              <p className="text-muted leading-relaxed">{activeExp.hypothesis}</p>
            </div>
            <div className="space-y-1 rounded-xl border border-line/40 bg-panel/40 p-3.5">
              <span className="font-semibold text-brass">🔭 What to Look For:</span>
              <p className="text-muted leading-relaxed">{activeExp.whatToLookFor}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <span className="font-semibold text-amber-300">Astronomer’s Rule of Thumb:</span>{' '}
              <span className="text-muted/90">{activeExp.caution}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
