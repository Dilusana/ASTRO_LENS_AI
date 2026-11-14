const ARCHIVE_STATUS = {
  idle: {
    label: 'NASA archive: IRSA SPHEREx',
    className: 'border-brass/30 bg-brass/10 text-brass',
  },
  loading: {
    label: 'NASA archive: querying IRSA',
    className: 'border-brass/30 bg-brass/10 text-brass',
  },
  ready: {
    label: 'NASA archive: SPHEREx results',
    className: 'border-brass/30 bg-brass/10 text-brass',
  },
  empty: {
    label: 'NASA archive: no SPHEREx images',
    className: 'border-line bg-panel text-muted',
  },
  error: {
    label: 'NASA archive: query failed',
    className: 'border-line bg-panel text-muted',
  },
}

export default function AppHeader({ archiveStatus = 'idle' }) {
  const archive = ARCHIVE_STATUS[archiveStatus] ?? ARCHIVE_STATUS.idle

  return (
    <header className="flex flex-col gap-5 border-b border-line/80 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
      <div>
        <p className="text-[0.72rem] font-medium tracking-[0.22em] text-brass uppercase">
          Observatory console
        </p>
        <h1 className="font-display mt-1 text-4xl leading-none text-ink sm:text-5xl">
          AstroLens <span className="italic text-glint">X</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Search a small local catalog of published positions, then query NASA/IPAC
          IRSA for SPHEREx spectral images at the selected coordinates.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2 text-xs text-muted">
        <li className="rounded-full border border-line bg-panel px-3 py-1.5">
          Catalog: static reference
        </li>
        <li className={`rounded-full border px-3 py-1.5 ${archive.className}`}>{archive.label}</li>
      </ul>
    </header>
  )
}
