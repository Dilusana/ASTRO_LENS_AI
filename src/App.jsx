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

export default function App() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [archive, setArchive] = useState({
    status: 'idle',
    data: null,
    error: null,
  })
  const [attempt, setAttempt] = useState(0)

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

  return (
    <div className="mx-auto min-h-svh max-w-6xl">
      <AppHeader archiveStatus={archiveForActive.status} />
      <main className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            matchCount={matches.length}
          />
          <PresetList
            objects={matches}
            selectedId={active ? selectedId : null}
            onSelect={setSelectedId}
            query={query}
          />
        </aside>
        <div className="space-y-6">
          <CoordinatePanel object={active} />
          <NasaResults
            objectName={active ? active.name : null}
            status={archiveForActive.status}
            result={archiveForActive.data}
            error={archiveForActive.error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        </div>
      </main>
    </div>
  )
}
