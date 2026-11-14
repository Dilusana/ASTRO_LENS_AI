export default function PresetList({ objects, selectedId, onSelect, query, mode = 'explorer' }) {
  return (
    <section aria-labelledby="presets-heading" className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="presets-heading" className="text-xs tracking-[0.16em] text-muted uppercase">
          {mode === 'explorer' ? 'Sky targets' : 'Preset catalog'}
        </h2>
        <p className="text-xs text-muted">{objects.length} available</p>
      </div>

      {objects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-3 py-4 text-center">
          <p className="text-sm leading-relaxed text-muted">
            No catalog entry matches “{query.trim()}”.
          </p>
          <p className="mt-1 text-xs text-muted/80">
            Coordinates are only loaded for verified targets in the local catalog.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          {objects.map((object) => {
            const selected = object.id === selectedId
            return (
              <li key={object.id}>
                <button
                  type="button"
                  onClick={() => onSelect(object.id)}
                  aria-pressed={selected}
                  className={`group w-full cursor-pointer rounded-2xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glint ${
                    selected
                      ? 'border-brass/80 bg-brass/10 shadow-[0_0_15px_rgba(228,194,122,0.12)] ring-1 ring-brass/40'
                      : 'border-line bg-panel/70 hover:border-glint/50 hover:bg-panel'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`block text-sm font-medium ${selected ? 'text-brass' : 'text-ink group-hover:text-glint'}`}>
                          {object.name}
                        </span>
                        {selected && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brass" />
                        )}
                      </div>
                      <span className="mt-0.5 block font-mono text-[0.72rem] text-muted">
                        {mode === 'explorer' && object.constellation
                          ? `in ${object.constellation}`
                          : object.designation}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="shrink-0 rounded-full border border-line bg-void/50 px-2 py-0.5 text-[0.65rem] tracking-wide text-glint uppercase">
                        {object.kind}
                      </span>
                      {mode === 'explorer' && object.distance && (
                        <span className="text-[0.68rem] text-muted">
                          {object.distance}
                        </span>
                      )}
                    </div>
                  </div>

                  {mode === 'explorer' && object.summary && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted/90">
                      {object.summary}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
