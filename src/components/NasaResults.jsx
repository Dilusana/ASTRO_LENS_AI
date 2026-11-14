function formatWavelength(min, max) {
  if (min == null || max == null) return 'Not in the archive row'
  return `${min.toFixed(4)} – ${max.toFixed(4)} µm`
}

function formatExposure(seconds) {
  if (seconds == null) return 'Not in the archive row'
  return `${seconds.toFixed(1)} s`
}

function formatDegrees(value) {
  if (value == null) return 'Not in the archive row'
  return `${value.toFixed(5)}°`
}

function formatSize(kilobytes) {
  if (kilobytes == null) return null
  return `${Math.round(kilobytes).toLocaleString('en-US')} kB`
}

function RepeatCoverage({ comparable }) {
  const repeats = comparable.bands.filter((band) => band.repeat_coverage)
  return (
    <div className="mt-5 rounded-2xl border border-line bg-void/55 p-4">
      <p className="text-[0.68rem] tracking-[0.16em] text-muted uppercase">Repeat coverage</p>
      {repeats.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-ink">
          {repeats.map((band) => (
            <li key={band.bandpass}>
              <span className="text-glint">{band.bandpass}</span> has {band.distinct_obs_ids}{' '}
              observation ids from {band.earliest} to {band.latest}
              <span className="text-muted"> ({band.span_days} days in this response).</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-ink">
          This response has no bandpass with two observation ids at least one day apart.
        </p>
      )}
      {comparable.uses_truncated_result ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          The archive returned the requested row limit, so earlier visits may be absent from
          this summary.
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted">{comparable.caveat}</p>
    </div>
  )
}

function ObservationCard({ observation }) {
  const size = formatSize(observation.access_estsize_kb)
  return (
    <li className="rounded-2xl border border-line bg-void/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] tracking-[0.16em] text-muted uppercase">Observation</p>
          <p className="mt-1 font-mono text-sm break-all text-glint">
            {observation.obs_id ?? 'Identifier absent from archive row'}
          </p>
        </div>
        <p className="font-mono text-xs text-brass">
          {observation.observation_start ?? 'Start time absent from archive row'}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Facility and instrument</dt>
          <dd className="mt-1 text-ink">
            {[observation.facility_name, observation.instrument_name].filter(Boolean).join(' · ') ||
              'Not in the archive row'}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Bandpass</dt>
          <dd className="mt-1 text-ink">
            {observation.bandpass ?? 'Not in the archive row'}
            {observation.spectral_band ? ` · ${observation.spectral_band}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Wavelength range</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            {formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Exposure</dt>
          <dd className="mt-1 font-mono text-xs text-ink">{formatExposure(observation.exposure_seconds)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Image center</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            RA {formatDegrees(observation.image_center_ra_deg)} · Dec{' '}
            {formatDegrees(observation.image_center_dec_deg)}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Release date</dt>
          <dd className="mt-1 text-ink">{observation.release_date ?? 'Not in the archive row'}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {observation.proposal_title ?? 'Proposal title was blank in the archive row.'}
        {observation.calib_level != null ? ` Calibration level ${observation.calib_level}.` : ''}
        {observation.pixel_scale_arcsec != null
          ? ` Pixel scale ${observation.pixel_scale_arcsec} arcsec.`
          : ''}
        {size ? ` Archive size estimate ${size}.` : ''}
      </p>

      <div className="mt-4 rounded-xl border border-dashed border-brass/40 bg-panel/40 p-3">
        <p className="text-[0.68rem] tracking-[0.16em] text-brass uppercase">Preview</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{observation.preview_note}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {observation.access_url ? (
            <a
              href={observation.access_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1 text-glint hover:border-glint/50"
            >
              Open FITS spectral image
            </a>
          ) : (
            <span className="text-muted">No trusted IRSA FITS URL was present on this row.</span>
          )}
          {observation.cutout_url ? (
            <a
              href={observation.cutout_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1 text-ink hover:border-glint/50"
            >
              Open FITS cutout
            </a>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export default function NasaResults({ objectName, status, result, error, onRetry }) {
  const target = objectName ?? 'the selected object'
  const querying = status === 'loading'
  const hasResults = status === 'ready' && result

  return (
    <section
      aria-labelledby="nasa-heading"
      aria-busy={querying}
      className={`rounded-3xl p-4 sm:p-6 ${
        hasResults
          ? 'border border-line bg-panel/80'
          : 'border border-dashed border-brass/40 bg-panel/50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="nasa-heading" className="font-display text-3xl text-ink">
          NASA observation results
        </h2>
        <p className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1 text-xs tracking-wide text-brass uppercase">
          {hasResults ? result.query.collection : 'IRSA SPHEREx'}
        </p>
      </div>

      {status === 'idle' ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Select a catalog object to query NASA/IPAC IRSA for SPHEREx spectral images at its
          stored coordinates. AstroLens X leaves this panel empty until that query returns.
        </p>
      ) : null}

      {status === 'loading' ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink">
          Querying IRSA for SPHEREx spectral images at <span className="text-glint">{target}</span>.
          This usually takes a few seconds.
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-3 max-w-3xl">
          <p className="text-sm leading-relaxed text-ink">
            The SPHEREx query for <span className="text-glint">{target}</span> failed.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-full border border-line px-3 py-1.5 text-xs text-glint hover:border-glint/50"
            >
              Query IRSA again
            </button>
          ) : null}
        </div>
      ) : null}

      {status === 'empty' && result ? (
        <div className="mt-3 max-w-3xl">
          <p className="text-sm leading-relaxed text-ink">
            IRSA returned no SPHEREx spectral images intersecting{' '}
            <span className="text-glint">{target}</span>.
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            Search {result.query.ra_deg.toFixed(6)}°, {result.query.dec_deg.toFixed(6)}° · radius{' '}
            {result.query.radius_deg}° · {result.query.collections_queried.join(', ')}
          </p>
        </div>
      ) : null}

      {hasResults ? (
        <>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            {result.count} spectral {result.count === 1 ? 'image' : 'images'} from IRSA SIA for{' '}
            <span className="text-glint">{target}</span>. Dates, instruments, and file links come
            from the archive response.
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            Search {result.query.ra_deg.toFixed(6)}°, {result.query.dec_deg.toFixed(6)}° · radius{' '}
            {result.query.radius_deg}° · {result.query.endpoint}
          </p>
          <RepeatCoverage comparable={result.comparable} />
          <ul className="mt-5 max-h-[46rem] space-y-3 overflow-y-auto pr-1">
            {result.observations.map((observation, index) => (
              <ObservationCard
                key={`${observation.publisher_did ?? observation.obs_id ?? 'row'}-${observation.bandpass ?? index}`}
                observation={observation}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
