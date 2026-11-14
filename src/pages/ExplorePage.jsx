import { useState, useMemo, useRef } from 'react'
import SkyTimeMachine from '../components/SkyTimeMachine'
import CoordinatePanel from '../components/CoordinatePanel'

// Celestial markers plotted onto the Deep-Field Panorama Canvas
const PANORAMA_MARKERS = [
  { id: 'betelgeuse', label: 'Betelgeuse', category: 'stars', x: 28, y: 22, color: 'amber', type: 'Red Supergiant' },
  { id: 'm42', label: 'Orion Nebula (M42)', category: 'galaxies', x: 42, y: 46, color: 'cyan', type: 'H II Nursery' },
  { id: 'wise-0855', label: 'WISE 0855', category: 'moving', x: 26, y: 64, color: 'cyan', type: 'Y-Dwarf Brown Dwarf' },
  { id: 'm31', label: 'Andromeda (M31)', category: 'galaxies', x: 55, y: 22, color: 'cyan', type: 'Spiral Galaxy' },
  { id: 'barnards-star', label: "Barnard's Star", category: 'moving', x: 52, y: 68, color: 'purple', type: 'Proper Motion Star' },
  { id: 'sirius', label: 'Sirius', category: 'stars', x: 74, y: 48, color: 'blue', type: 'Luminous Binary' },
  { id: 'vega', label: 'Vega', category: 'stars', x: 78, y: 26, color: 'blue', type: 'Debris Disk Star' },
  { id: 'r-draconis', label: 'R Draconis', category: 'stars', x: 14, y: 42, color: 'amber', type: 'Mira Variable' },
  { id: 'rw-aurigae', label: 'RW Aurigae', category: 'stars', x: 86, y: 72, color: 'purple', type: 'T Tauri Variable' },
]

export default function ExplorePage({
  catalog = [],
  selectedId,
  onSelectTarget,
  archiveData,
  archiveStatus = 'idle',
  archiveError = null,
  onRetry,
  mode = 'explorer',
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const timeMachineRef = useRef(null)

  const activeObject = useMemo(() => {
    return catalog.find((obj) => obj.id === selectedId) || catalog[0] || null
  }, [catalog, selectedId])

  // Filter objects based on search query and category
  const filteredMarkers = useMemo(() => {
    return PANORAMA_MARKERS.filter((m) => {
      const matchCat =
        activeCategory === 'all'
          ? true
          : activeCategory === 'stars'
          ? m.category === 'stars'
          : activeCategory === 'galaxies'
          ? m.category === 'galaxies'
          : m.category === 'moving'
      const matchQuery =
        !searchQuery ||
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchQuery
    })
  }, [activeCategory, searchQuery])

  function handleMouseDown(e) {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
  }

  function handleMouseMove(e) {
    if (!isDragging) return
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function handleZoom(delta) {
    setZoomLevel((prev) => Math.max(0.8, Math.min(prev + delta, 2.5)))
  }

  function handleResetViewer() {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  function scrollToTimeMachine() {
    if (timeMachineRef.current) {
      timeMachineRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-12 py-4 sm:py-6">
      {/* 1. Header & Sub-Badge */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-0.5 text-xs text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[0.68rem] uppercase tracking-wider">ALL-SKY INFRARED SURVEY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Explore the Cosmos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Point, tap, and peer through space dust. Click any target in the cosmic viewer to uncover stunning NASA multi-wavelength imagery.
            </p>
          </div>

          {/* Search Bar & Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a star, nebula, galaxy..."
                className="w-full rounded-full border border-line/80 bg-panel/80 px-4 py-2 pl-9 text-xs text-ink placeholder:text-muted focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 backdrop-blur-md"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 rounded-full border border-line bg-panel/60 p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'stars', label: 'Stars' },
                { id: 'galaxies', label: 'Galaxies' },
                { id: 'moving', label: 'Moving Objects' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[0.7rem] font-medium transition ${
                    activeCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main 2-Column Section: Sky Viewer (Left) + Target Acquired (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Sky Viewer (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-line/80 bg-panel/60 overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col">
          {/* Top Viewer Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-mono text-[0.72rem] text-cyan-200">
                SPHEREx 6-Band Infrared Panorama
              </span>
            </div>
            {/* Viewer Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleZoom(0.2)}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/15"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-0.2)}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/15"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleResetViewer}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/5 text-[0.65rem] text-slate-200 hover:bg-white/15"
                title="Reset View"
              >
                ⛶
              </button>
            </div>
          </div>

          {/* Deep-Field Canvas Area with Markers */}
          <div
            className="relative h-[380px] sm:h-[460px] w-full overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Pannable & Zoomable Cosmic Layer */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-75"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                backgroundImage: `radial-gradient(ellipse at 40% 45%, rgba(168, 85, 247, 0.4) 0%, rgba(6, 182, 212, 0.3) 45%, rgba(5, 8, 20, 0.95) 100%), url('https://images-assets.nasa.gov/image/PIA14445/PIA14445~thumb.jpg')`,
                backgroundBlendMode: 'screen',
              }}
            >
              {/* Star dust and nebulosity patterns */}
              <div className="absolute inset-0 bg-radial from-transparent via-purple-950/20 to-black/60 pointer-events-none" />

              {/* Clickable Marker Pins */}
              {filteredMarkers.map((marker) => {
                const isSelected = activeObject?.id === marker.id
                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectTarget?.(marker.id)
                    }}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    className="cursor-pointer absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none"
                  >
                    {/* Pulsing selection ring */}
                    {isSelected && (
                      <span className="absolute -inset-3 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                    )}

                    <div className="flex items-center gap-1.5">
                      {/* Marker Dot */}
                      <div
                        className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 shadow-lg transition duration-200 group-hover:scale-125 ${
                          isSelected
                            ? 'border-white bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110'
                            : marker.color === 'amber'
                            ? 'border-amber-300 bg-amber-500 shadow-amber-500/50'
                            : marker.color === 'blue'
                            ? 'border-sky-300 bg-blue-500 shadow-blue-500/50'
                            : marker.color === 'purple'
                            ? 'border-purple-300 bg-purple-500 shadow-purple-500/50'
                            : 'border-cyan-300 bg-cyan-500 shadow-cyan-500/50'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>

                      {/* Marker Label Tag */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[0.68rem] font-medium backdrop-blur-md shadow-md whitespace-nowrap transition ${
                          isSelected
                            ? 'border border-cyan-400/80 bg-cyan-950/90 text-cyan-200 font-semibold'
                            : 'border border-white/10 bg-black/70 text-slate-200 group-hover:border-purple-400 group-hover:text-white'
                        }`}
                      >
                        {marker.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Bottom Tip Overlay */}
            <div className="absolute bottom-3 left-3 rounded-md bg-black/70 border border-white/10 px-2.5 py-1 text-[0.65rem] text-slate-300 backdrop-blur-md pointer-events-none">
              👆 Click any glowing target to inspect
            </div>
          </div>
        </div>

        {/* Right Column: Target Acquired Panel (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-line/80 bg-panel/70 p-5 sm:p-6 shadow-2xl backdrop-blur-sm space-y-5">
          {activeObject ? (
            <>
              {/* Header: Target Acquired + Classification */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
                    TARGET ACQUIRED
                  </span>
                </div>
                <span className="rounded-full border border-purple-500/40 bg-purple-950/40 px-2.5 py-0.5 text-[0.65rem] font-medium text-purple-300">
                  {activeObject.kind || 'Celestial Object'}
                </span>
              </div>

              {/* Target Image Frame */}
              <div className="relative h-44 rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
                <img
                  src={activeObject.imageUrl || 'https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg'}
                  alt={activeObject.name}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[0.6rem] font-mono text-slate-300 backdrop-blur-sm">
                  {activeObject.constellation ? `Constellation: ${activeObject.constellation}` : 'Constellation view'}
                  {activeObject.distance ? ` • ${activeObject.distance}` : ''}
                </span>
              </div>

              {/* Object Details */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {activeObject.name}
                  </h2>
                  <span className="text-xs font-mono text-muted">
                    {activeObject.designation}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {activeObject.summary || activeObject.tagline}
                </p>
              </div>

              {/* Telescope Fact Card */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <span>🔭</span>
                  <span>Telescope Fact</span>
                </div>
                <p className="text-[0.72rem] leading-relaxed text-slate-300">
                  SPHEREx looks at {activeObject.name} across dozens of infrared colors simultaneously to see straight through expelled circumstellar dust shells and cold molecular gas.
                </p>
              </div>

              {/* Action Button: Explore NASA Images */}
              <button
                type="button"
                onClick={scrollToTimeMachine}
                className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl border border-pink-500/40 bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-xs font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Explore NASA Images</span>
                <span>⇊</span>
              </button>
            </>
          ) : (
            <div className="py-12 text-center text-muted">
              Select a celestial target to inspect
            </div>
          )}
        </div>
      </section>

      {/* 3. Astronomical Coordinates & Astrometry Drawer */}
      {activeObject && (
        <section>
          <CoordinatePanel object={activeObject} mode={mode} />
        </section>
      )}

      {/* 4. TEMPORAL ASTRONOMY TOOL (Compare NASA SPHEREx Images) */}
      <section ref={timeMachineRef} className="space-y-6 pt-4">
        {/* Section Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/30 px-3 py-0.5 text-xs text-purple-300">
            <span className="text-[0.68rem]">⏱</span>
            <span className="font-mono text-[0.68rem] uppercase tracking-wider">TEMPORAL ASTRONOMY TOOL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Compare NASA SPHEREx Images
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Space isn't static! Some brown dwarfs and rogue asteroids race across the sky, while supernova remnants expand. Blink between two observation epochs to discover movement.
          </p>
        </div>

        {/* Pro Tip Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-center gap-2.5">
          <span className="text-base text-amber-400">✦</span>
          <span>
            <strong className="text-white">Pro Astronomer Tip:</strong> When you blink images taken years apart, moving objects jump right out at you!
          </span>
        </div>

        {/* Real SPHEREx Time Machine Component / Loading / Error States */}
        {archiveStatus === 'loading' ? (
          <div className="rounded-2xl border border-purple-500/30 bg-panel/70 p-8 text-center space-y-4 shadow-xl backdrop-blur-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-purple-400 bg-purple-950/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-spin">
              <span className="text-xl">🪐</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Querying NASA/IPAC IRSA SPHEREx Archives...
              </p>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Retrieving authentic Level-2 spectral images and astrometric coordinates for <strong className="text-cyan-300">{activeObject?.name}</strong> from Caltech IRSA Simple Image Access (SIA2).
              </p>
            </div>
          </div>
        ) : archiveStatus === 'error' ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6 text-center space-y-3">
            <p className="text-sm font-bold text-red-200">NASA Archive Query Failed</p>
            <p className="text-xs text-slate-300 max-w-md mx-auto">{archiveError || 'Could not retrieve SPHEREx images for this target.'}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="cursor-pointer rounded-full border border-red-400/50 bg-red-500/20 px-4 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition shadow-sm"
              >
                Retry NASA Query
              </button>
            )}
          </div>
        ) : (
          <SkyTimeMachine
            observations={archiveData?.observations || []}
            queryRa={archiveData?.query?.ra_deg}
            queryDec={archiveData?.query?.dec_deg}
            comparable={archiveData?.comparable}
            mode={mode}
          />
        )}
      </section>

      {/* 5. Curated Sky Tours */}
      <section className="space-y-6 pt-8 border-t border-line/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Curated Sky Tours</h3>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="cursor-pointer text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
          >
            Browse full celestial catalog &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tour 1: Betelgeuse */}
          <div
            onClick={() => onSelectTarget?.('betelgeuse')}
            className="cursor-pointer group rounded-2xl border border-line/80 bg-panel/50 p-5 space-y-3 transition hover:border-purple-400/50 hover:bg-panel/80 hover:shadow-lg"
          >
            <div className="h-32 rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img
                src="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg"
                alt="Betelgeuse"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div>
              <p className="text-[0.65rem] font-mono text-cyan-300 uppercase">Stellar Life Cycles</p>
              <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                The Giant of Orion
              </h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Witness a star on the brink of going supernova, puffing out layers of gas into space.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
              <span>Inspect Object</span>
              <span>→</span>
            </div>
          </div>

          {/* Tour 2: Orion Nebula */}
          <div
            onClick={() => onSelectTarget?.('m42')}
            className="cursor-pointer group rounded-2xl border border-line/80 bg-panel/50 p-5 space-y-3 transition hover:border-cyan-400/50 hover:bg-panel/80 hover:shadow-lg"
          >
            <div className="h-32 rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img
                src="https://images-assets.nasa.gov/image/PIA08653/PIA08653~thumb.jpg"
                alt="Orion Nebula"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div>
              <p className="text-[0.65rem] font-mono text-cyan-300 uppercase">Stellar Nurseries</p>
              <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                Cradle of New Worlds
              </h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Peer through the cosmic dust into glowing gaseous nurseries sculpting future planetary systems.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
              <span>Inspect Object</span>
              <span>→</span>
            </div>
          </div>

          {/* Tour 3: Andromeda Galaxy */}
          <div
            onClick={() => onSelectTarget?.('m31')}
            className="cursor-pointer group rounded-2xl border border-line/80 bg-panel/50 p-5 space-y-3 transition hover:border-pink-400/50 hover:bg-panel/80 hover:shadow-lg"
          >
            <div className="h-32 rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img
                src="https://images-assets.nasa.gov/image/PIA04921/PIA04921~thumb.jpg"
                alt="Andromeda Galaxy"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div>
              <p className="text-[0.65rem] font-mono text-cyan-300 uppercase">Deep Cosmos</p>
              <h4 className="text-base font-bold text-white group-hover:text-pink-300 transition">
                Island of a Trillion Suns
              </h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                The furthest object visible with the unaided eye. Explore Andromeda's sweeping infrared spiral arms.
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold text-pink-400 group-hover:text-pink-300 flex items-center gap-1">
              <span>Inspect Object</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
