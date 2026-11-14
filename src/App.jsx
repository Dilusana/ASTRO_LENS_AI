import { useEffect, useMemo, useState } from 'react'
import AppHeader from './components/AppHeader'
import AstroAiModal from './components/AstroAiModal'
import CoordinatePanel from './components/CoordinatePanel'
import HeroSection from './components/HeroSection'
import NasaResults from './components/NasaResults'
import ObjectCardGrid from './components/ObjectCardGrid'
import SearchBar from './components/SearchBar'
import StudentSpaceLab from './components/StudentSpaceLab'
import { catalog } from './data/catalog'
import { catalogPositionToDegrees } from './lib/coordinates'
import { searchCatalog } from './lib/searchCatalog'
import { fetchSpherexObservations } from './lib/spherexApi'

function StepTracker({ currentStep }) {
  const steps = [
    { number: 1, label: '1. Choose Target' },
    { number: 2, label: '2. Sky Coordinates' },
    { number: 3, label: '3. NASA Infrared' },
    { number: 4, label: '4. Coverage & Changes' },
  ]

  return (
    <nav aria-label="Exploration steps" className="border-b border-line/60 bg-void/50 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <ol className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {steps.map((step, idx) => {
            const isCurrent = step.number === currentStep
            const isCompleted = step.number < currentStep
            return (
              <li
                key={step.number}
                className={`flex items-center gap-2 ${
                  isCurrent
                    ? 'text-brass font-medium'
                    : isCompleted
                    ? 'text-glint'
                    : 'text-muted/60'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${
                    isCurrent
                      ? 'border border-brass bg-brass/20 text-brass'
                      : isCompleted
                      ? 'border border-glint/50 bg-glint/20 text-glint'
                      : 'border border-line bg-panel text-muted/60'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </span>
                <span>{step.label}</span>
                {idx < steps.length - 1 && (
                  <span className="hidden sm:inline-block text-line/80 font-mono text-xs">
                    →
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export default function App() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('astrolens_mode') || 'explorer'
    } catch {
      return 'explorer'
    }
  })

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('sirius') // Default to Sirius so users immediately see real NASA data
  const [isAstroAiOpen, setIsAstroAiOpen] = useState(false)
  const [archive, setArchive] = useState({
    status: 'idle',
    data: null,
    error: null,
  })
  const [attempt, setAttempt] = useState(0)

  function handleModeChange(newMode) {
    setMode(newMode)
    try {
      localStorage.setItem('astrolens_mode', newMode)
    } catch {
      // ignore localStorage errors
    }
  }

  const matches = useMemo(() => searchCatalog(catalog, query), [query])
  const selected = catalog.find((object) => object.id === selectedId) ?? null
  const active = selected

  useEffect(() => {
    if (!active) {
      return
    }

    const position = catalogPositionToDegrees(active)
    const objectId = active.id
    if (!position) {
      setArchive({
        status: 'error',
        data: null,
        error: 'The stored right ascension and declination could not be read as degrees.',
        objectId,
      })
      return
    }

    const controller = new AbortController()
    setArchive({ status: 'loading', data: null, error: null, objectId })

    fetchSpherexObservations(position, controller.signal)
      .then((data) => {
        setArchive({
          status: data.count > 0 ? 'ready' : 'empty',
          data,
          error: null,
          objectId,
        })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setArchive({
          status: 'error',
          data: null,
          error: error.message || 'The SPHEREx archive request failed.',
          objectId,
        })
      })

    return () => controller.abort()
  }, [active, attempt])

  const archiveForActive =
    active && archive.objectId === active.id
      ? archive
      : { status: active ? 'loading' : 'idle', data: null, error: null }

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery)
  }

  function handleSelectObject(id) {
    setSelectedId(id)
    // Smooth scroll down to selected target view
    setTimeout(() => {
      const el = document.getElementById('selected-target-view')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  function handleHeroNavigate(destination) {
    if (destination === 'catalog') {
      const el = document.getElementById('target-catalog')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else if (destination === 'timemachine') {
      if (!selectedId) setSelectedId('sirius')
      setTimeout(() => {
        const el = document.getElementById('selected-target-view')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else if (destination === 'spacelab') {
      const el = document.getElementById('student-space-lab')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else if (destination === 'askai') {
      setIsAstroAiOpen(true)
    }
  }

  // Calculate current step for the progress tracker
  let currentStep = 1
  if (active) {
    if (archiveForActive.status === 'idle' || archiveForActive.status === 'loading') {
      currentStep = 3
    } else if (archiveForActive.status === 'ready' || archiveForActive.status === 'empty') {
      currentStep = 4
    } else {
      currentStep = 2
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-void text-ink">
      {/* Header */}
      <AppHeader
        archiveStatus={archiveForActive.status}
        mode={mode}
        onModeChange={handleModeChange}
      />

      {/* Hero Section (Requirement 1, 2, 3) */}
      <HeroSection
        onNavigate={handleHeroNavigate}
        selectedObject={active}
      />

      {/* 4-Step Progress Flow (Requirement 6) */}
      <StepTracker currentStep={currentStep} />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 flex-1">
        {/* Search & Filter Bar */}
        <div className="max-w-xl mx-auto sm:mx-0">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            matchCount={matches.length}
            mode={mode}
          />
        </div>

        {/* Visual Target Cards Grid (Requirement 4, 5) */}
        <ObjectCardGrid
          objects={matches}
          selectedId={selectedId}
          onSelect={handleSelectObject}
          mode={mode}
        />

        {/* Selected Target Screen: Overview, Coordinates & Real NASA Data (Requirement 7) */}
        {active && (
          <div className="space-y-8 pt-4">
            <CoordinatePanel object={active} mode={mode} />

            <NasaResults
              objectName={active ? active.name : null}
              status={archiveForActive.status}
              result={archiveForActive.data}
              error={archiveForActive.error}
              onRetry={() => setAttempt((value) => value + 1)}
              mode={mode}
            />
          </div>
        )}

        {/* Student Space Lab Guided Experiment (Requirement 11) */}
        <StudentSpaceLab
          onSelectTarget={(targetId) => {
            handleSelectObject(targetId)
          }}
        />
      </main>

      {/* Floating Ask Astro AI Button & Panel (Requirement 10) */}
      <aside aria-label="Astro AI Assistant">
        <button
          type="button"
          onClick={() => setIsAstroAiOpen(true)}
          className="fixed bottom-6 right-6 z-40 cursor-pointer flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/20 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.25)] backdrop-blur-md hover:bg-amber-400/30 hover:scale-105 transition active:scale-95"
          aria-label="Open Astro AI learning assistant"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-sm">✨</span>
          <span>Ask Astro AI</span>
        </button>

        <AstroAiModal
          isOpen={isAstroAiOpen}
          onClose={() => setIsAstroAiOpen(false)}
          selectedObject={active}
        />
      </aside>

      {/* Footer */}
      <footer className="border-t border-line/60 bg-panel/40 px-4 py-8 text-center text-xs text-muted sm:px-6 lg:px-8 mt-12">
        <div className="mx-auto max-w-6xl space-y-2">
          <p className="font-semibold text-ink">
            AstroLens X · NASA Space Apps Challenge 2026
          </p>
          <p className="max-w-2xl mx-auto text-[0.72rem] leading-relaxed text-muted/80">
            Powered by genuine astronomical data from NASA/IPAC Infrared Science Archive (IRSA), California Institute of Technology, Jet Propulsion Laboratory, and the SPHEREx mission team.
          </p>
        </div>
      </footer>
    </div>
  )
}
