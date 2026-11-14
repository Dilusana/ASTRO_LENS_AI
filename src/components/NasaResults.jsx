import { useEffect, useState } from 'react'

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

function FitsImageViewer({ observation, ra, dec, autoLoad = false }) {
  const [active, setActive] = useState(autoLoad)
  const [status, setStatus] = useState('idle')
  const [metadata, setMetadata] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [zoom, setZoom] = useState(2)
  const [pixelated, setPixelated] = useState(true)
  const [attempt, setAttempt] = useState(0)

  const fitsUrl = observation.access_url
  const previewUrl =
    fitsUrl && ra != null && dec != null
      ? `/api/spherex/preview?fits_url=${encodeURIComponent(fitsUrl)}&ra=${ra}&dec=${dec}&size_deg=0.04`
      : null
  const metaUrl =
    fitsUrl && ra != null && dec != null
      ? `/api/spherex/preview_meta?fits_url=${encodeURIComponent(fitsUrl)}&ra=${ra}&dec=${dec}&size_deg=0.04`
      : null

  useEffect(() => {
    if (!active || !previewUrl) return

    let cancelled = false
    setStatus('loading')
    setErrorMsg(null)

    if (metaUrl) {
      fetch(`${metaUrl}&_t=${attempt}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data) => {
          if (!cancelled) setMetadata(data)
        })
        .catch((err) => {
          console.warn('Metadata fetch warning:', err)
        })
    }

    const img = new Image()
    img.src = `${previewUrl}&_t=${attempt}`
    img.onload = () => {
      if (!cancelled) setStatus('loaded')
    }
    img.onerror = () => {
      if (!cancelled) {
        setStatus('error')
        setErrorMsg('The IRSA cutout request failed or timed out.')
      }
    }

    return () => {
      cancelled = true
    }
  }, [active, previewUrl, metaUrl, attempt])

  if (!fitsUrl) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-panel/30 p-3">
        <p className="text-xs text-muted">No trusted FITS access URL available for this observation.</p>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-brass/40 bg-panel/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-medium tracking-[0.16em] text-brass uppercase">FITS Scientific Preview</p>
            <p className="mt-1 text-xs text-muted">
              Live Level-2 SPHEREx cutout calibrated in MJy/sr with Asinh 99.5% stretch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActive(true)}
            className="cursor-pointer rounded-full border border-brass/60 bg-brass/10 px-3.5 py-1.5 text-xs text-brass transition hover:bg-brass/20"
          >
            Extract &amp; view FITS cutout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-panel/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-brass uppercase">
            SPHEREx Scientific FITS Cutout
          </p>
        </div>
        {status === 'loaded' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[0.68rem] text-muted uppercase">Zoom:</span>
            {[1, 2, 4].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-xs ${
                  zoom === z ? 'border border-glint/40 bg-glint/20 text-glint' : 'text-muted hover:text-ink'
                }`}
              >
                {z}x
              </button>
            ))}
            <span className="text-muted/40">|</span>
            <button
              type="button"
              onClick={() => setPixelated((prev) => !prev)}
              className="cursor-pointer text-xs text-muted hover:text-glint"
              title="Toggle pixel interpolation"
            >
              {pixelated ? 'Pixel-crisp' : 'Smooth'}
            </button>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brass/30 border-t-brass" />
          <p className="mt-3 text-xs font-medium text-ink">Extracting genuine NASA SPHEREx cutout…</p>
          <p className="mt-1 text-[0.7rem] text-muted">
            Streaming from NASA/IPAC IRSA and applying Asinh percentile stretch.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="py-4 text-center">
          <p className="text-xs font-medium text-red-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-3 cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-glint hover:border-glint/50"
          >
            Retry cutout
          </button>
        </div>
      )}

      {status === 'loaded' && (
        <div className="mt-3 space-y-3">
          <div className="relative flex justify-center overflow-hidden rounded-lg border border-line bg-void/80 p-3">
            <div
              className="relative inline-block"
              style={{
                width: metadata?.dimensions ? metadata.dimensions[0] * zoom * 5 : 200,
                height: metadata?.dimensions ? metadata.dimensions[1] * zoom * 5 : 200,
                maxWidth: '100%',
              }}
            >
              <img
                src={`${previewUrl}&_t=${attempt}`}
                alt={`SPHEREx FITS spectral image for ${observation.obs_id}`}
                className="h-full w-full object-contain"
                style={{ imageRendering: pixelated ? 'pixelated' : 'auto' }}
              />
              {metadata?.target_pixel?.display_x != null &&
                metadata?.target_pixel?.display_y != null &&
                metadata.inside_footprint && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${(metadata.target_pixel.display_x / metadata.dimensions[0]) * 100}%`,
                      top: `${(metadata.target_pixel.display_y / metadata.dimensions[1]) * 100}%`,
                    }}
                    title="Target coordinate position"
                  >
                    <div className="h-3 w-3 rounded-full border border-amber-300/80 bg-amber-400/20 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  </div>
                )}
            </div>

            <div className="absolute top-2 right-2 rounded border border-line/40 bg-void/80 px-2 py-1 font-mono text-[0.65rem] text-muted">
              <span className="text-brass">N ↑</span> · <span className="text-glint">E ←</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[0.7rem] text-muted sm:grid-cols-4">
            <div className="rounded border border-line/40 bg-void/40 p-2">
              <span className="block text-[0.6rem] uppercase tracking-wider text-muted/70">Flux Units</span>
              <span className="font-semibold text-ink">{metadata?.bunit || 'MJy / sr'}</span>
            </div>
            <div className="rounded border border-line/40 bg-void/40 p-2">
              <span className="block text-[0.6rem] uppercase tracking-wider text-muted/70">Flux Range</span>
              <span className="text-ink">{metadata ? `${metadata.flux_min} to ${metadata.flux_max}` : '—'}</span>
            </div>
            <div className="rounded border border-line/40 bg-void/40 p-2">
              <span className="block text-[0.6rem] uppercase tracking-wider text-muted/70">Pixel Scale</span>
              <span className="text-ink">
                {metadata?.wcs?.pixel_scale_arcsec ? `${metadata.wcs.pixel_scale_arcsec}″/px` : '6.15″/px'}
              </span>
            </div>
            <div className="rounded border border-line/40 bg-void/40 p-2">
              <span className="block text-[0.6rem] uppercase tracking-wider text-muted/70">Footprint</span>
              <span className={metadata?.inside_footprint ? 'text-emerald-400' : 'text-amber-400'}>
                {metadata?.inside_footprint ? 'Target centered' : 'Edge coverage'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-3 text-xs">
        <span className="text-[0.68rem] text-muted">Raw scientific files:</span>
        <div className="flex flex-wrap gap-2">
          {observation.access_url && (
            <a
              href={observation.access_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1 text-glint transition hover:border-glint/50"
            >
              Full FITS cube ({formatSize(observation.access_estsize_kb) || 'spectral'})
            </a>
          )}
          {observation.cutout_url && (
            <a
              href={observation.cutout_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1 text-ink transition hover:border-glint/50"
            >
              Direct FITS cutout
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ObservationCard({ observation, queryRa, queryDec, index }) {
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

      <FitsImageViewer
        observation={observation}
        ra={queryRa}
        dec={queryDec}
        autoLoad={index === 0}
      />
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
                queryRa={result.query.ra_deg}
                queryDec={result.query.dec_deg}
                index={index}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
