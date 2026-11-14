export default function PresetList({ objects, selectedId, onSelect, query }) {
  return (
    <section aria-labelledby="presets-heading" className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="presets-heading" className="text-xs tracking-[0.16em] text-muted uppercase">
          Preset objects
        </h2>
        <p className="text-xs text-muted">{objects.length} shown</p>
      </div>

      {objects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-4 text-sm leading-relaxed text-muted">
          No catalog entry matches “{query.trim()}”. Coordinates are not estimated
          for names outside this list.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {objects.map((object) => {
            const selected = object.id === selectedId
            return (
              <li key={object.id}>
                <button
                  type="button"
                  onClick={() => onSelect(object.id)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glint ${
                    selected
                      ? 'border-brass/70 bg-brass/10'
                      : 'border-line bg-panel/70 hover:border-glint/40'
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm text-ink">{object.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">{object.designation}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.68rem] tracking-wide text-glint uppercase">
                      {object.kind}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
