import { CATALOG_META } from '../data/catalog'

function Readout({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-void/70 px-4 py-4">
      <p className="text-[0.68rem] tracking-[0.18em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-mono text-xl leading-tight text-glint sm:text-2xl">{value}</p>
    </div>
  )
}

export default function CoordinatePanel({ object }) {
  return (
    <section aria-labelledby="coordinates-heading" className="rounded-3xl border border-line bg-panel/80 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] tracking-[0.18em] text-brass uppercase">
            Right ascension and declination
          </p>
          <h2 id="coordinates-heading" className="font-display mt-1 text-3xl text-ink">
            {object ? object.name : 'No object selected'}
          </h2>
        </div>
        <p className="rounded-full border border-line px-3 py-1 text-xs text-muted">
          {CATALOG_META.frame} · {CATALOG_META.epoch}
        </p>
      </div>

      {object ? (
        <>
          <p className="mt-2 text-sm text-muted">
            {object.designation} · {object.kind}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Readout label="RA" value={object.ra} />
            <Readout label="Dec" value={object.dec} />
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">Coordinate origin</dt>
              <dd className="mt-1 text-ink">{object.origin}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">Reference</dt>
              <dd className="mt-1 font-mono text-xs break-all text-ink">{object.bibcode}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Stored from {CATALOG_META.provider}. This is a catalog position, not a new
            measurement and not a NASA observation result.
          </p>
        </>
      ) : (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
          Choose a preset or a search match. RA and Dec stay blank until an object
          from the local catalog is selected.
        </p>
      )}
    </section>
  )
}
