import { useEffect, useMemo, useState } from 'react'
import { fetchSpherexCompare } from '../lib/spherexApi'

function formatDate(isoString) {
  if (!isoString || isoString === 'Unknown') return 'Date unknown'
  try {
    const clean = isoString.replace(' UTC', '').replace('Z', '').trim()
    const d = new Date(clean)
    if (isNaN(d.getTime())) return isoString
    return (
      d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    )
  } catch {
    return isoString
  }
}

function formatWavelength(min, max) {
  if (min == null || max == null) return null
  return `${min.toFixed(2)}–${max.toFixed(2)} µm`
}

function parseObsTime(isoString) {
  if (!isoString) return 0
  try {
    const clean = isoString.replace(' UTC', '').replace('Z', '').trim()
    const d = new Date(clean)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  } catch {
    return 0
  }
}

export default function SkyTimeMachine({
  observations = [],
  queryRa,
  queryDec,
  comparable,
  mode = 'explorer',
}) {
  const isExplorer = mode === 'explorer'

  // Requirement 1: Filter valid cutouts and SORT CHRONOLOGICALLY by actual observation_start timestamp
  const validObservations = useMemo(() => {
    return [...observations]
      .filter((obs) => Boolean(obs.access_url))
      .sort((a, b) => {
        const timeA = parseObsTime(a.observation_start)
        const timeB = parseObsTime(b.observation_start)
        return timeA - timeB
      })
  }, [observations])

  // Requirement 1: Automatic pairing selects earliest as Epoch 1 (Baseline) and latest as Epoch 2 (Repeat)
  const defaultIndices = useMemo(() => {
    if (validObservations.length < 2) return [0, 0]

    // Check if there is a repeat bandpass with >= 2 distinct observations
    const repeatBand = comparable?.bands?.find((b) => b.repeat_coverage)
    if (repeatBand) {
      const matching = validObservations
        .map((obs, idx) => ({ obs, idx }))
        .filter((item) => item.obs.bandpass === repeatBand.bandpass)

      if (matching.length >= 2) {
        // Since validObservations is sorted ascending chronologically:
        // matching[0] is the earliest baseline pass, and matching[matching.length - 1] is the latest repeat pass
        return [matching[0].idx, matching[matching.length - 1].idx]
      }
    }

    // Otherwise, select first (earliest) and last (latest)
    return [0, validObservations.length - 1]
  }, [validObservations, comparable])

  const [epoch1Index, setEpoch1Index] = useState(defaultIndices[0])
  const [epoch2Index, setEpoch2Index] = useState(defaultIndices[1])

  // Reset indices when observation list changes
  useEffect(() => {
    setEpoch1Index(defaultIndices[0])
    setEpoch2Index(defaultIndices[1])
  }, [defaultIndices])

  const obs1 = validObservations[epoch1Index] || null
  const obs2 = validObservations[epoch2Index] || null

  // Check chronological order of current selection
  const obs1Time = parseObsTime(obs1?.observation_start)
  const obs2Time = parseObsTime(obs2?.observation_start)
  const isReversed = obs1Time > obs2Time && obs1Time > 0 && obs2Time > 0
  const isSimultaneous = Math.abs(obs1Time - obs2Time) < 3600 * 1000 && obs1Time > 0

  function handleSwapToChronological() {
    setEpoch1Index(epoch2Index)
    setEpoch2Index(epoch1Index)
  }

  // Comparison mode: 'blink', 'split', 'wipe'
  const [viewMode, setViewMode] = useState('blink')
  // Blink playback state
  const [isPlaying, setIsPlaying] = useState(true)
  const [activeFrame, setActiveFrame] = useState(1) // 1 or 2
  const [speedMs, setSpeedMs] = useState(600) // 300, 600, 1200
  // Wipe slider position: 0 to 100 percent
  const [wipePercent, setWipePercent] = useState(50)
  // Display zoom & scientific visual controls
  const [zoom, setZoom] = useState(3)
  const [fovDeg, setFovDeg] = useState(0.04) // 0.02, 0.04, 0.08
  const [displayInterpolation, setDisplayInterpolation] = useState('nearest') // 'nearest' | 'bilinear'

  // API comparison data state
  const [compareData, setCompareData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // Fetch comparison from backend
  useEffect(() => {
    if (!obs1 || !obs2 || !obs1.access_url || !obs2.access_url || queryRa == null || queryDec == null) {
      setCompareData(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    fetchSpherexCompare(
      {
        fitsUrl1: obs1.access_url,
        fitsUrl2: obs2.access_url,
        ra: queryRa,
        dec: queryDec,
        sizeDeg: fovDeg,
        interpolation: displayInterpolation,
      },
      controller.signal
    )
      .then((data) => {
        if (!cancelled) {
          setCompareData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.name === 'AbortError') return
          setError(err.message || 'Failed to align and register observations.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [obs1, obs2, queryRa, queryDec, fovDeg, displayInterpolation, attempt])

  // Blink interval timer
  useEffect(() => {
    if (!isPlaying || viewMode !== 'blink') return

    const timer = setInterval(() => {
      setActiveFrame((prev) => (prev === 1 ? 2 : 1))
    }, speedMs)

    return () => clearInterval(timer)
  }, [isPlaying, viewMode, speedMs])

  // Requirement 4: Informative fallback when no multi-epoch pair is possible
  if (validObservations.length < 2) {
    return (
      <div className="mt-6 rounded-3xl border border-line bg-void/50 p-6 text-ink">
        <div className="flex items-center gap-2 text-brass font-semibold text-xs uppercase tracking-wider">
          <span>⏱️</span>
          <span>Sky Time Machine — Multi-Epoch Celestial Comparison</span>
        </div>
        <h3 className="mt-1 font-display text-xl text-ink">Single Epoch Available</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Multi-epoch celestial comparison requires at least two genuine observations of this sky coordinate taken on different passes.
          {validObservations.length === 1
            ? ' NASA SPHEREx has surveyed this sky patch once in the current public release (QR3).'
            : ' No valid SPHEREx Level-2 spectral images have been published for this coordinate quadrant yet.'}
        </p>
        <div className="mt-4 rounded-2xl border border-line/60 bg-panel/40 p-4 text-xs text-muted leading-relaxed">
          <p className="font-semibold text-glint">💡 Multi-Pass Sky Survey Context</p>
          <p className="mt-1">
            NASA SPHEREx scans the whole celestial sphere every six months. Regions near the celestial poles
            receive dozens of repeat visits per release, while equatorial quadrants receive repeat coverage in
            successive six-month mission epochs. Check back as additional sky surveys are processed into the public archive.
          </p>
        </div>
      </div>
    )
  }

  const reg = compareData?.registration
  const warnings = reg?.warnings || []
  const hasMismatch = reg?.compatible_bandpass === false
  const hasLowOverlap = reg?.sufficient_overlap === false

  // Labels for Epoch 1 and Epoch 2 reflecting chronological status
  const epoch1Label = isReversed
    ? 'Epoch 1 (Later Pass ⚠️)'
    : 'Epoch 1 (Baseline: Earlier Pass)'
  const epoch2Label = isReversed
    ? 'Epoch 2 (Earlier Pass ⚠️)'
    : 'Epoch 2 (Repeat: Later Pass)'

  return (
    <div className="mt-6 rounded-3xl border border-line bg-panel/90 p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brass/20 text-xs font-bold text-brass">
              ⏱️
            </span>
            <span className="text-[0.68rem] font-semibold tracking-[0.18em] text-brass uppercase">
              {isExplorer ? 'Multi-Epoch Sky Time Machine' : 'Two-Epoch Astrometric Registration & Blink'}
            </span>
          </div>
          <h3 className="mt-1 font-display text-2xl text-ink">
            {isExplorer ? 'Compare Celestial Epochs' : 'WCS Reprojection & Differential Analysis'}
          </h3>
        </div>

        {/* Overlap, FoV & Sampling Badges */}
        {reg && (
          <div className="flex flex-wrap items-center gap-2">
            {reg.field_of_view_arcmin != null && (
              <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-xs text-ink" title="Current Angular Field of View">
                🔭 FoV: {reg.field_of_view_arcmin}′ ({reg.grid_dimensions?.[0]}×{reg.grid_dimensions?.[1]} px)
              </span>
            )}
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs ${
                displayInterpolation === 'nearest'
                  ? 'border-line bg-panel text-glint'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              }`}
              title={reg.interpolation_notice}
            >
              {displayInterpolation === 'nearest' ? '🔬 Raw Pixels (6.155″/px)' : '👁️ Bilinear (Vis Only)'}
            </span>
            {reg.delta_days != null && (
              <span className="rounded-full border border-brass/50 bg-brass/10 px-3 py-1 font-mono text-xs text-brass">
                Δt = {reg.delta_days} days
              </span>
            )}
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs ${
                reg.sufficient_overlap
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              {reg.spatial_overlap_percent}% Overlap
            </span>
          </div>
        )}
      </div>

      {/* Explorer Mode Context Card */}
      {isExplorer && (
        <div className="mt-4 rounded-2xl border border-line/60 bg-void/40 p-4 text-xs leading-relaxed text-muted">
          <p className="font-semibold text-glint">
            🔭 How the Sky Time Machine Works (Astronomical Blink Comparator)
          </p>
          <p className="mt-1">
            Astronomers detect changes in the cosmos by aligning two photographs of the exact same sky region taken at different times onto an identical pixel grid, then rapidly switching (&quot;blinking&quot;) between them.
            In 1930, Clyde Tombaugh discovered Pluto with a mechanical blink comparator. Here, AstroLens X uses genuine NASA SPHEREx FITS World Coordinate Systems (WCS) to align real infrared images.
          </p>
        </div>
      )}

      {/* Requirement 1: Reversed Chronology Warning & 1-Click Swap Button */}
      {isReversed && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-semibold uppercase tracking-wider text-[0.68rem] text-amber-300">
                Reversed Chronological Input
              </p>
              <p className="mt-0.5">
                Epoch 1 ({formatDate(obs1?.observation_start)}) was observed <em>after</em> Epoch 2 ({formatDate(obs2?.observation_start)}).
                Astronomical baseline comparisons typically place the earlier visit as Epoch 1.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSwapToChronological}
            className="cursor-pointer rounded-xl border border-amber-400/50 bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 transition shadow-xs"
          >
            🔄 Swap to Chronological Order
          </button>
        </div>
      )}

      {/* Same-Orbit Simultaneous Notice */}
      {isSimultaneous && (
        <div className="mt-4 rounded-2xl border border-brass/40 bg-brass/10 p-3.5 text-xs text-ink">
          <div className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <div>
              <p className="font-semibold uppercase tracking-wider text-[0.68rem] text-brass">
                Same-Orbit Exposures
              </p>
              <p className="mt-0.5">
                These two frames were acquired during the same telescope pass (separated by &lt; 1 hour).
                Differences reflect detector scan variations, not astrophysical temporal changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observation Selectors */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Epoch 1 Selection */}
        <div className={`rounded-2xl border p-3.5 ${isReversed ? 'border-amber-500/50 bg-amber-500/5' : 'border-line/70 bg-void/60'}`}>
          <div className="flex items-center justify-between">
            <label htmlFor="epoch1-select" className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              {epoch1Label}
            </label>
            <span className="font-mono text-[0.65rem] text-cyan-300">Frame 1</span>
          </div>
          <select
            id="epoch1-select"
            value={epoch1Index}
            onChange={(e) => setEpoch1Index(Number(e.target.value))}
            className="mt-1.5 w-full cursor-pointer rounded-xl border border-line bg-panel px-3 py-2 text-xs font-mono text-ink focus:border-brass focus:outline-hidden"
          >
            {validObservations.map((obs, idx) => (
              <option key={`ep1-${obs.obs_id || idx}`} value={idx} disabled={idx === epoch2Index}>
                {obs.obs_id || `Obs #${idx + 1}`} · {obs.bandpass || 'Band?'} · {formatDate(obs.observation_start)}
              </option>
            ))}
          </select>
          {obs1 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[0.72rem] text-muted">
              <span>Band: <strong className="text-ink">{obs1.bandpass}</strong> {formatWavelength(obs1.wavelength_min_um, obs1.wavelength_max_um)}</span>
              <span className="font-mono text-cyan-300">{formatDate(obs1.observation_start)}</span>
            </div>
          )}
        </div>

        {/* Epoch 2 Selection */}
        <div className={`rounded-2xl border p-3.5 ${isReversed ? 'border-amber-500/50 bg-amber-500/5' : 'border-line/70 bg-void/60'}`}>
          <div className="flex items-center justify-between">
            <label htmlFor="epoch2-select" className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
              {epoch2Label}
            </label>
            <span className="font-mono text-[0.65rem] text-amber-300">Frame 2</span>
          </div>
          <select
            id="epoch2-select"
            value={epoch2Index}
            onChange={(e) => setEpoch2Index(Number(e.target.value))}
            className="mt-1.5 w-full cursor-pointer rounded-xl border border-line bg-panel px-3 py-2 text-xs font-mono text-ink focus:border-brass focus:outline-hidden"
          >
            {validObservations.map((obs, idx) => (
              <option key={`ep2-${obs.obs_id || idx}`} value={idx} disabled={idx === epoch1Index}>
                {obs.obs_id || `Obs #${idx + 1}`} · {obs.bandpass || 'Band?'} · {formatDate(obs.observation_start)}
              </option>
            ))}
          </select>
          {obs2 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[0.72rem] text-muted">
              <span>Band: <strong className="text-ink">{obs2.bandpass}</strong> {formatWavelength(obs2.wavelength_min_um, obs2.wavelength_max_um)}</span>
              <span className="font-mono text-amber-300">{formatDate(obs2.observation_start)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Warnings & Bandpass Compatibility Alerts */}
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((warn, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-3.5 text-xs leading-relaxed ${
                hasMismatch || hasLowOverlap
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-brass/40 bg-brass/10 text-ink'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base">{hasMismatch || hasLowOverlap ? '⚠️' : 'ℹ️'}</span>
                <div>
                  <p className="font-semibold uppercase tracking-wider text-[0.68rem]">
                    {hasMismatch
                      ? 'Bandpass / Spectral Filter Incompatibility'
                      : hasLowOverlap
                      ? 'Low Spatial Overlap Warning'
                      : 'Astronomical Registration Note'}
                  </p>
                  <p className="mt-0.5">{warn}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-line bg-void/50 py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brass/40 border-t-brass" />
          <p className="mt-3 text-sm font-medium text-ink">
            {isExplorer
              ? 'Co-registering astronomical coordinates onto a North-up tangent grid…'
              : 'Applying WCS Tan reprojection, computing spatial overlap, and joint Asinh stretch…'}
          </p>
          <p className="mt-1 text-xs text-muted">
            Resampling both SPHEREx FITS arrays to ensure identical pixel coordinates.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-red-200">Comparison Failed</p>
          <p className="mt-1 text-xs text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-4 cursor-pointer rounded-full border border-line bg-panel px-4 py-2 text-xs font-medium text-glint hover:border-glint/50"
          >
            Retry Astrometric Alignment
          </button>
        </div>
      )}

      {/* Comparison Viewers */}
      {compareData && !loading && (
        <div className="mt-6 space-y-4">
          {/* Controls Bar */}
          <div className="space-y-3 rounded-2xl border border-line/60 bg-void/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-panel/60 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('blink')}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition ${
                    viewMode === 'blink'
                      ? 'border border-brass/50 bg-brass/20 text-brass'
                      : 'text-muted hover:text-ink'
                  }`}
                  aria-label="Switch to Blink Mode"
                >
                  👁️ Blink
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition ${
                    viewMode === 'split'
                      ? 'border border-brass/50 bg-brass/20 text-brass'
                      : 'text-muted hover:text-ink'
                  }`}
                  aria-label="Switch to Side-by-Side Mode"
                >
                  ↔️ Side-by-Side
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('wipe')}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition ${
                    viewMode === 'wipe'
                      ? 'border border-brass/50 bg-brass/20 text-brass'
                      : 'text-muted hover:text-ink'
                  }`}
                  aria-label="Switch to Wipe Slider Mode"
                >
                  🪟 Wipe Slider
                </button>
              </div>

              {/* Field of View (FoV) Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[0.65rem] font-semibold text-muted uppercase tracking-wider">FoV:</span>
                <div className="flex items-center gap-1 rounded-xl border border-line bg-panel/60 p-1">
                  {[
                    { label: '1.3′ Core', deg: 0.02, title: '0.02° Core Field (~13×13 px) centered on target' },
                    { label: '2.5′ Standard', deg: 0.04, title: '0.04° Standard Cutout (~25×25 px)' },
                    { label: '5.0′ Wide', deg: 0.08, title: '0.08° Wide Field (~49×49 px) with footprint mapping' },
                  ].map((f) => (
                    <button
                      key={f.deg}
                      type="button"
                      onClick={() => setFovDeg(f.deg)}
                      title={f.title}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-xs transition ${
                        fovDeg === f.deg
                          ? 'border border-brass/50 bg-brass/20 text-brass font-medium'
                          : 'text-muted hover:text-ink'
                      }`}
                      aria-label={`Set FoV to ${f.label}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Interpolation Toggle */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[0.65rem] font-semibold text-muted uppercase tracking-wider">Sampling:</span>
                <div className="flex items-center gap-1 rounded-xl border border-line bg-panel/60 p-1">
                  <button
                    type="button"
                    onClick={() => setDisplayInterpolation('nearest')}
                    title="Nearest Neighbor: Displays raw instrument detector pixels without smoothing"
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition ${
                      displayInterpolation === 'nearest'
                        ? 'border border-glint/50 bg-glint/20 text-glint font-medium'
                        : 'text-muted hover:text-ink'
                    }`}
                    aria-label="Display Raw Pixels via Nearest Neighbor"
                  >
                    🔲 Raw (Nearest)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayInterpolation('bilinear')}
                    title="Bilinear Resampling: Smooth visual continuity for presentation. Visualization only, does not increase telescope resolution."
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition ${
                      displayInterpolation === 'bilinear'
                        ? 'border border-amber-500/50 bg-amber-500/20 text-amber-300 font-medium'
                        : 'text-muted hover:text-ink'
                    }`}
                    aria-label="Display Smooth via Bilinear Resampling"
                  >
                    〰️ Smooth (Bilinear)
                  </button>
                </div>
              </div>

              {/* Display Zoom */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[0.65rem] font-semibold text-muted uppercase tracking-wider">Zoom:</span>
                <div className="flex items-center gap-1 rounded-xl border border-line bg-panel/60 p-1">
                  {[2, 3, 5].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoom(z)}
                      className={`cursor-pointer rounded-lg px-2 py-0.5 font-mono text-xs transition ${
                        zoom === z ? 'border border-glint/50 bg-glint/20 text-glint font-medium' : 'text-muted hover:text-ink'
                      }`}
                      aria-label={`Set zoom to ${z}x`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Blink Playback Controls Bar (when in Blink Mode) */}
            {viewMode === 'blink' && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/40 pt-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-brass/60 bg-brass/10 px-3 py-1 text-xs font-semibold text-brass transition hover:bg-brass/20"
                    aria-label={isPlaying ? 'Pause blink animation' : 'Play blink animation'}
                  >
                    <span>{isPlaying ? '⏸️ Pause Blink' : '▶️ Play Blink'}</span>
                  </button>

                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={() => setActiveFrame((f) => (f === 1 ? 2 : 1))}
                      className="cursor-pointer rounded-xl border border-line bg-panel px-2.5 py-1 text-xs text-glint hover:border-glint/50 transition"
                      title="Switch to next frame"
                      aria-label="Step to next frame"
                    >
                      Step ↷
                    </button>
                  )}

                  {/* Speed buttons */}
                  <div className="flex items-center gap-1 text-xs ml-2">
                    <span className="text-[0.65rem] text-muted uppercase">Speed:</span>
                    {[
                      { label: '0.5x', ms: 1200 },
                      { label: '1x', ms: 600 },
                      { label: '2x', ms: 300 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setSpeedMs(s.ms)}
                        className={`cursor-pointer rounded px-2 py-0.5 font-mono text-xs transition ${
                          speedMs === s.ms
                            ? 'border border-glint/50 bg-glint/20 text-glint font-medium'
                            : 'text-muted hover:text-ink'
                        }`}
                        aria-label={`Set blink speed to ${s.label}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="font-mono text-[0.68rem] text-muted">
                  Blinking at {1000 / speedMs >= 1 ? `${(1000 / speedMs).toFixed(1)} Hz` : `${speedMs} ms/frame`}
                </div>
              </div>
            )}
          </div>

          {/* Visualization & Scientific Resolution Policy Banner */}
          {displayInterpolation === 'bilinear' ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <span className="text-base leading-none">👁️</span>
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold text-amber-300">Bilinear Resampling Active (Visualization Only):</span>{' '}
                <span className="text-muted/90">
                  Smooth interpolation between adjacent pixels provides visual continuity, but does <strong>NOT</strong> increase telescope resolving power or reveal sub-pixel detail.
                  Native SPHEREx angular resolution is <strong>6.155″/pixel</strong> (Point Spread Function FWHM ~7.5″). Physical flux comparisons and metadata are derived strictly from raw detector counts.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl border border-line/60 bg-panel/40 p-3.5 text-xs text-muted">
              <span className="text-base leading-none">🔬</span>
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold text-glint">Instrument Native View (Nearest Neighbor):</span>{' '}
                <span>
                  Showing true discrete detector readouts at <strong>6.155″/pixel</strong> without mathematical filtering. Each square block is one physical detector pixel on SPHEREx (PSF FWHM ~7.5″). Peak flux values are strictly conserved.
                </span>
              </div>
            </div>
          )}

          {/* VIEW MODE 1: BLINK COMPARATOR */}
          {viewMode === 'blink' && (
            <div className="rounded-2xl border border-line bg-void/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/50 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${
                      activeFrame === 1 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    }`}
                  />
                  <p className="font-mono text-xs font-semibold text-ink">
                    Viewing:{' '}
                    {activeFrame === 1
                      ? `${isReversed ? 'Epoch 1 (Later)' : 'Epoch 1 (Baseline)'} (${compareData.epoch1.obs_id})`
                      : `${isReversed ? 'Epoch 2 (Earlier)' : 'Epoch 2 (Repeat)'} (${compareData.epoch2.obs_id})`}
                  </p>
                  <span className="rounded-md border border-line bg-panel px-2 py-0.5 font-mono text-[0.68rem] text-muted">
                    {activeFrame === 1 ? formatDate(compareData.epoch1.observation_date) : formatDate(compareData.epoch2.observation_date)}
                  </span>
                  <span className="rounded-md border border-line bg-panel px-2 py-0.5 font-mono text-[0.68rem] text-brass">
                    {activeFrame === 1 ? compareData.epoch1.bandpass : compareData.epoch2.bandpass}
                  </span>
                </div>

                <div className="font-mono text-[0.68rem] text-muted">
                  Orientation: <span className="text-brass">N ↑</span> · <span className="text-glint">E ←</span>
                </div>
              </div>

              {/* Blink Viewport */}
              <div className="relative mt-4 flex justify-center overflow-hidden py-4">
                <div
                  className="relative inline-block transition-all duration-100"
                  style={{
                    width: Math.min(25 * zoom * 5, 380),
                    height: Math.min(25 * zoom * 5, 380),
                    maxWidth: '100%',
                  }}
                >
                  <img
                    src={activeFrame === 1 ? compareData.epoch1.preview_png : compareData.epoch2.preview_png}
                    alt={activeFrame === 1 ? 'Epoch 1 reprojected image' : 'Epoch 2 reprojected image'}
                    className="h-full w-full object-contain"
                    style={{ imageRendering: displayInterpolation === 'nearest' ? 'pixelated' : 'auto' }}
                  />

                  {/* Target Reticle (Always Center for Tangent Projection) */}
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 rounded-full border-2 border-amber-300 bg-amber-400/20 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  </div>

                  {/* Astrometric North / East Compass Badge */}
                  <div className="absolute top-2 right-2 rounded-lg border border-line/60 bg-void/80 px-2 py-0.5 font-mono text-[0.65rem] text-muted backdrop-blur-xs">
                    <span className="text-brass">N ↑</span> · <span className="text-glint">E ←</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: SIDE-BY-SIDE */}
          {viewMode === 'split' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Epoch 1 Frame */}
              <div className="rounded-2xl border border-line bg-void/90 p-4">
                <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
                  <div>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-cyan-400">
                      {isReversed ? 'Epoch 1 (Later Pass)' : 'Epoch 1 (Baseline Pass)'}
                    </span>
                    <p className="font-mono text-xs font-medium text-ink">{compareData.epoch1.obs_id}</p>
                  </div>
                  <span className="font-mono text-[0.68rem] text-brass">{compareData.epoch1.bandpass}</span>
                </div>
                <p className="mt-1 font-mono text-[0.7rem] text-muted">
                  {formatDate(compareData.epoch1.observation_date)}
                </p>

                <div className="relative mt-3 flex justify-center py-2">
                  <div
                    className="relative inline-block"
                    style={{
                      width: Math.min(25 * zoom * 4, 280),
                      height: Math.min(25 * zoom * 4, 280),
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={compareData.epoch1.preview_png}
                      alt="Epoch 1"
                      className="h-full w-full object-contain"
                      style={{ imageRendering: displayInterpolation === 'nearest' ? 'pixelated' : 'auto' }}
                    />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full border-2 border-amber-300 bg-amber-400/20" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-muted">
                  <span>Flux: {compareData.epoch1.flux_min} – {compareData.epoch1.flux_max} MJy/sr</span>
                  <span>Footprint: {compareData.epoch1.inside_footprint ? 'Centered' : 'Edge'}</span>
                </div>
              </div>

              {/* Epoch 2 Frame */}
              <div className="rounded-2xl border border-line bg-void/90 p-4">
                <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
                  <div>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-400">
                      {isReversed ? 'Epoch 2 (Earlier Pass)' : 'Epoch 2 (Repeat Pass)'}
                    </span>
                    <p className="font-mono text-xs font-medium text-ink">{compareData.epoch2.obs_id}</p>
                  </div>
                  <span className="font-mono text-[0.68rem] text-brass">{compareData.epoch2.bandpass}</span>
                </div>
                <p className="mt-1 font-mono text-[0.7rem] text-muted">
                  {formatDate(compareData.epoch2.observation_date)}
                </p>

                <div className="relative mt-3 flex justify-center py-2">
                  <div
                    className="relative inline-block"
                    style={{
                      width: Math.min(25 * zoom * 4, 280),
                      height: Math.min(25 * zoom * 4, 280),
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={compareData.epoch2.preview_png}
                      alt="Epoch 2"
                      className="h-full w-full object-contain"
                      style={{ imageRendering: displayInterpolation === 'nearest' ? 'pixelated' : 'auto' }}
                    />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full border-2 border-amber-300 bg-amber-400/20" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-muted">
                  <span>Flux: {compareData.epoch2.flux_min} – {compareData.epoch2.flux_max} MJy/sr</span>
                  <span>Footprint: {compareData.epoch2.inside_footprint ? 'Centered' : 'Edge'}</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: WIPE SLIDER */}
          {viewMode === 'wipe' && (
            <div className="rounded-2xl border border-line bg-void/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/50 pb-3">
                <span className="text-xs font-medium text-ink">
                  Drag the slider to wipe between Epoch 1 (Left) and Epoch 2 (Right)
                </span>
                <span className="font-mono text-xs text-brass">{wipePercent}% Split</span>
              </div>

              <div className="relative mt-4 flex justify-center overflow-hidden py-4">
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: Math.min(25 * zoom * 5, 380),
                    height: Math.min(25 * zoom * 5, 380),
                    maxWidth: '100%',
                  }}
                >
                  {/* Base: Epoch 2 */}
                  <img
                    src={compareData.epoch2.preview_png}
                    alt="Epoch 2 baseline"
                    className="h-full w-full object-contain"
                    style={{ imageRendering: displayInterpolation === 'nearest' ? 'pixelated' : 'auto' }}
                  />

                  {/* Overlay: Epoch 1 clipped */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - wipePercent}% 0 0)` }}
                  >
                    <img
                      src={compareData.epoch1.preview_png}
                      alt="Epoch 1 overlay"
                      className="h-full w-full object-contain"
                      style={{ imageRendering: displayInterpolation === 'nearest' ? 'pixelated' : 'auto' }}
                    />
                  </div>

                  {/* Wipe Line */}
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    style={{ left: `${wipePercent}%` }}
                  />

                  {/* Labels on each side */}
                  <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-void/80 px-2 py-0.5 font-mono text-[0.65rem] text-cyan-300">
                    {isReversed ? 'Epoch 1 (Later)' : 'Epoch 1 (Baseline)'}
                  </div>
                  <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-void/80 px-2 py-0.5 font-mono text-[0.65rem] text-amber-300">
                    {isReversed ? 'Epoch 2 (Earlier)' : 'Epoch 2 (Repeat)'}
                  </div>
                </div>
              </div>

              {/* Slider Input */}
              <div className="mx-auto mt-2 max-w-sm">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wipePercent}
                  onChange={(e) => setWipePercent(Number(e.target.value))}
                  className="w-full cursor-ew-resize accent-brass"
                  aria-label="Wipe comparison percentage"
                />
              </div>
            </div>
          )}

          {/* Scientific Mode Registration Details Table */}
          {!isExplorer && (
            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <h4 className="text-[0.68rem] font-semibold tracking-wider text-brass uppercase">
                Astrometric Co-Registration Metrics &amp; WCS Metadata
              </h4>
              <div className="mt-3 grid gap-3 font-mono text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Reprojection Projection</span>
                  <span className="text-ink">Gnomonic / Tangent (TAN)</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Field of View (FoV)</span>
                  <span className="text-ink">{reg.field_of_view_arcmin}′ ({reg.field_of_view_deg}°)</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Grid Dimensions</span>
                  <span className="text-ink">{reg.grid_dimensions?.[0]} × {reg.grid_dimensions?.[1]} pixels</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Display Interpolation</span>
                  <span className={displayInterpolation === 'nearest' ? 'text-glint' : 'text-amber-300'}>
                    {reg.interpolation_label || displayInterpolation}
                  </span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Native Pixel Scale &amp; PSF</span>
                  <span className="text-ink">{reg.common_pixel_scale_arcsec}″/px (PSF FWHM ~{reg.psf_fwhm_arcsec || 7.5}″)</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Temporal Sequence</span>
                  <span className={reg.is_chronological ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {reg.is_chronological ? 'Chronological (Baseline → Repeat)' : 'Reversed Input (Later → Earlier)'}
                  </span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Relative Field Rotation</span>
                  <span className="text-ink">{reg.relative_rotation_deg}° corrected</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Joint Intensity Stretch</span>
                  <span className="text-ink">{reg.joint_stretch}</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Joint Flux Range</span>
                  <span className="text-ink">{reg.joint_flux_min} – {reg.joint_flux_max} MJy/sr</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Flux Delta Mean ± Std</span>
                  <span className="text-ink">{reg.mean_flux_difference} ± {reg.std_flux_difference} MJy/sr</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5">
                  <span className="block text-[0.6rem] text-muted uppercase">Spatial Footprint Match</span>
                  <span className="text-ink">{reg.spatial_overlap_percent}% Area Intersect</span>
                </div>
                <div className="rounded-xl border border-line/40 bg-void/50 p-2.5 sm:col-span-2">
                  <span className="block text-[0.6rem] text-muted uppercase">Interpolation &amp; Resolution Policy</span>
                  <span className="text-muted leading-relaxed">{reg.interpolation_notice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Requirement 7: Scientific Caution Notice */}
          <div className="rounded-2xl border border-brass/50 bg-brass/10 p-4 text-xs leading-relaxed text-ink">
            <div className="flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-semibold uppercase tracking-wider text-[0.68rem] text-brass">
                  Scientific Integrity Principle
                </p>
                <p className="mt-0.5">
                  {compareData.scientific_caution}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
