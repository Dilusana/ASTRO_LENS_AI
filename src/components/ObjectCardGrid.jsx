import { useState } from 'react'

function ObjectThumbnail({ object }) {
  const [imgFailed, setImgFailed] = useState(false)

  // Curated color themes for CSS cosmic fallbacks based on category/kind
  const fallbackStyles = {
    stars: 'from-blue-900/60 via-indigo-950 to-void',
    galaxies: 'from-purple-900/60 via-slate-950 to-void',
    variables: 'from-amber-900/60 via-stone-950 to-void',
    'brown-dwarfs': 'from-cyan-950/80 via-blue-950 to-void',
  }

  const categoryGradient = fallbackStyles[object.category] || 'from-indigo-950 via-slate-950 to-void'

  return (
    <div className={`relative h-36 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br ${categoryGradient}`}>
      {object.imageUrl && !imgFailed ? (
        <img
          src={object.imageUrl}
          alt={`Illustrative astronomical view of ${object.name}`}
          onError={() => setImgFailed(true)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        /* Graceful SVG Starfield Fallback */
        <div className="flex h-full w-full items-center justify-center p-4 text-center">
          <div className="space-y-1">
            <span className="text-3xl">
              {object.kind.includes('Galaxy')
                ? '🌌'
                : object.kind.includes('Nebula') || object.kind.includes('H II')
                ? '✨'
                : object.kind.includes('Brown Dwarf')
                ? '🪐'
                : '⭐'}
            </span>
            <p className="font-mono text-[0.68rem] text-muted">{object.constellation || 'Deep Sky'}</p>
          </div>
        </div>
      )}

      {/* Illustrative Photo Mandatory Notice Badge (Requirement 5) */}
      <div className="absolute top-2 left-2 rounded-md bg-void/80 px-2 py-0.5 font-mono text-[0.62rem] text-muted backdrop-blur-xs">
        Illustrative Photo
      </div>

      {/* Object Type Badge */}
      <div className="absolute top-2 right-2 rounded-md border border-line/60 bg-panel/90 px-2 py-0.5 text-[0.65rem] font-medium text-glint backdrop-blur-xs">
        {object.kind}
      </div>

      {/* Credit Caption on Bottom */}
      {object.imageCredit && !imgFailed && (
        <div className="absolute bottom-1 right-2 font-mono text-[0.58rem] text-muted/70 drop-shadow-md">
          {object.imageCredit}
        </div>
      )}
    </div>
  )
}

export default function ObjectCardGrid({
  objects,
  selectedId,
  onSelect,
  _mode = 'explorer',
}) {
  const [filter, setFilter] = useState('all')

  const filterTabs = [
    { id: 'all', label: 'All Targets', count: objects.length },
    { id: 'stars', label: 'Stars', count: objects.filter((o) => o.category === 'stars').length },
    { id: 'galaxies', label: 'Galaxies & Nebulae', count: objects.filter((o) => o.category === 'galaxies').length },
    { id: 'variables', label: 'Variables', count: objects.filter((o) => o.category === 'variables').length },
    { id: 'brown-dwarfs', label: 'Brown Dwarfs', count: objects.filter((o) => o.category === 'brown-dwarfs').length },
  ]

  const filteredObjects =
    filter === 'all'
      ? objects
      : objects.filter((o) => o.category === filter)

  return (
    <section id="target-catalog" aria-labelledby="catalog-heading" className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-semibold tracking-[0.2em] text-brass uppercase">
              Step 1 · Verified Astronomical Targets
            </span>
          </div>
          <h2 id="catalog-heading" className="font-display mt-0.5 text-2xl sm:text-3xl text-ink">
            Choose a Sky Target
          </h2>
          <p className="mt-1 text-xs text-muted max-w-xl leading-relaxed">
            Select a verified celestial object to retrieve real NASA SPHEREx infrared observations, analyze spectral bands, and inspect multi-epoch coverage.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-void/80 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === tab.id
                  ? 'border border-brass/50 bg-brass/20 text-brass'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[0.65rem] opacity-60 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Illustrative disclaimer banner (Requirement 5) */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line/40 bg-panel/30 px-3 py-1.5 text-[0.68rem] text-muted">
        <span className="text-glint">ℹ️</span>
        <span>
          <strong>Astrophotography Notice:</strong> Thumbnail photographs on these cards are illustrative reference portraits for identification. All scientific data and multi-epoch images are retrieved live from NASA IRSA.
        </span>
      </div>

      {/* Responsive Cards Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredObjects.map((object) => {
          const isSelected = object.id === selectedId

          return (
            <button
              key={object.id}
              type="button"
              onClick={() => onSelect(object.id)}
              aria-pressed={isSelected}
              className={`group cursor-pointer flex flex-col text-left rounded-2xl border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glint ${
                isSelected
                  ? 'border-brass bg-panel/90 shadow-[0_0_24px_rgba(228,194,122,0.22)] ring-2 ring-brass/60'
                  : 'border-line/70 bg-panel/50 hover:border-glint/60 hover:bg-panel hover:shadow-[0_0_18px_rgba(159,215,255,0.08)]'
              }`}
            >
              {/* Illustrative thumbnail */}
              <ObjectThumbnail object={object} />

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-base font-semibold ${isSelected ? 'text-brass' : 'text-ink group-hover:text-glint'}`}>
                        {object.name}
                      </h3>
                      <p className="font-mono text-xs text-muted/90">
                        {object.designation}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brass/50 bg-brass/20 px-2 py-0.5 text-[0.65rem] font-bold text-brass">
                        <span>Active</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-brass animate-ping" />
                      </span>
                    )}
                  </div>

                  {/* 1 Short Beginner-Friendly Tagline (Requirement 4) */}
                  <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-2">
                    {object.tagline || object.summary}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="mt-4 flex items-center justify-between border-t border-line/40 pt-2.5 font-mono text-[0.68rem] text-muted">
                  <span>{object.constellation ? `Constellation: ${object.constellation}` : 'Coordinates verified'}</span>
                  <span className="text-brass/90">{object.distance}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
