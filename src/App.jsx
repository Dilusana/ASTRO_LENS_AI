import { useEffect, useMemo, useState } from 'react'
import AppHeader from './components/AppHeader'
import CoordinatePanel from './components/CoordinatePanel'
import NasaResults from './components/NasaResults'
import PresetList from './components/PresetList'
import SearchBar from './components/SearchBar'
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
  const [selectedId, setSelectedId] = useState(null)
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
  const active = selected && matches.some((object) => object.id === selected.id) ? selected : null

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
    <div className="mx-auto min-h-svh max-w-6xl">
      <AppHeader
        archiveStatus={archiveForActive.status}
        mode={mode}
        onModeChange={handleModeChange}
      />

      {/* 4-Step Progress Flow */}
      <StepTracker currentStep={currentStep} />

      <main className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            matchCount={matches.length}
            mode={mode}
          />
          <PresetList
            objects={matches}
            selectedId={active ? selectedId : null}
            onSelect={setSelectedId}
            query={query}
            mode={mode}
          />
        </aside>

        <div className="space-y-6">
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
      </main>
    </div>
  )
}
