import { useState } from 'react'
import { CATALOG_META } from '../data/catalog'
import { catalogPositionToDegrees } from '../lib/coordinates'

function CoordinateCard({ title, subtitle, value, description, mode }) {
  return (
    <div className="rounded-2xl border border-line bg-void/70 p-4 transition hover:border-glint/30">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.68rem] font-medium tracking-[0.18em] text-muted uppercase">
          {title}
        </p>
        <span className="text-[0.68rem] text-brass/80 font-mono">
          {subtitle}
        </span>
      </div>
      <p className="mt-2 font-mono text-xl sm:text-2xl leading-tight text-glint">
        {value}
      </p>
      {mode === 'explorer' && description && (
        <p className="mt-2 text-xs leading-relaxed text-muted/90">
          {description}
        </p>
      )}
    </div>
  )
}

export default function CoordinatePanel({ object, mode = 'explorer' }) {
  const [showTechDetails, setShowTechDetails] = useState(false)
  const degrees = object ? catalogPositionToDegrees(object) : null

  return (
    <section
      id="selected-target-view"
      aria-labelledby="coordinates-heading"
      className="rounded-3xl border border-line bg-panel/85 p-5 sm:p-7 shadow-sm transition-all"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass/20 text-xs font-bold text-brass">
              2
            </span>
            <span className="text-[0.68rem] font-semibold tracking-[0.18em] text-brass uppercase">
              {mode === 'explorer' ? 'Step 2 · Target Overview & Coordinates' : 'Reference Astrometry & Frame'}
            </span>
          </div>
          <h2 id="coordinates-heading" className="font-display mt-1 text-3xl sm:text-4xl text-ink">
            {object ? object.name : 'No sky target selected'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-void/50 px-3 py-1 font-mono text-xs text-muted">
            {CATALOG_META.frame} · {CATALOG_META.epoch}
          </span>
        </div>
      </div>

      {object ? (
        <div className="mt-4 space-y-4">
          {/* Prominent Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-lg border border-glint/40 bg-glint/10 px-2.5 py-0.5 font-medium text-glint">
              {object.kind}
            </span>
            <span className="font-mono text-ink/80">{object.designation}</span>
            {object.constellation && (
              <>
                <span className="text-line">•</span>
                <span>Constellation: <strong className="text-ink">{object.constellation}</strong></span>
              </>
            )}
            {object.distance && (
              <>
                <span className="text-line">•</span>
                <span>Distance: <strong className="text-brass">{object.distance}</strong></span>
              </>
            )}
          </div>

          {/* Beginner explanation / summary */}
          <p className="text-sm leading-relaxed text-ink/90 bg-void/40 rounded-2xl border border-line/50 p-4">
            {object.summary}
          </p>

          {/* What to look for in infrared */}
          {object.whatToLookFor && (
            <div className="rounded-2xl border border-glint/30 bg-glint/5 p-4">
              <p className="text-xs font-semibold text-glint flex items-center gap-1.5">
                <span>✨</span> What to look for in NASA Infrared:
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink/90">
                {object.whatToLookFor}
              </p>
            </div>
          )}

          {/* Progressive Disclosure: Coordinate Cards & Technical Astrometry (Requirement 9) */}
          <div className="rounded-2xl border border-line bg-void/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-2">
                <span>📍</span>
                <span>Celestial Coordinates (RA &amp; Dec)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTechDetails((prev) => !prev)}
                className="cursor-pointer text-xs font-mono text-brass hover:text-glint transition flex items-center gap-1"
                aria-expanded={showTechDetails || mode === 'science'}
              >
                <span>{showTechDetails || mode === 'science' ? 'Hide Details' : 'Expand Details'}</span>
                <span>{showTechDetails || mode === 'science' ? '▴' : '▾'}</span>
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <CoordinateCard
                title={mode === 'explorer' ? 'Sky Longitude (RA)' : 'Right Ascension'}
                subtitle={degrees ? `${degrees.raDeg.toFixed(5)}°` : 'RA'}
                value={object.ra}
                description="Celestial east-west address measured as Earth rotates."
                mode={mode}
              />
              <CoordinateCard
                title={mode === 'explorer' ? 'Sky Latitude (Dec)' : 'Declination'}
                subtitle={degrees ? `${degrees.decDeg.toFixed(5)}°` : 'Dec'}
                value={object.dec}
                description="Angular distance north (+) or south (−) from Earth’s celestial equator."
                mode={mode}
              />
            </div>

            {/* Expandable Advanced Astrometric Metadata */}
            {(showTechDetails || mode === 'science') && (
              <div className="mt-4 pt-4 border-t border-line/50 space-y-3">
                <dl className="grid gap-3 text-xs sm:grid-cols-3 font-mono">
                  <div className="rounded-xl border border-line/40 bg-void/60 p-2.5">
                    <dt className="text-[0.62rem] text-muted uppercase">Coordinate Origin</dt>
                    <dd className="mt-0.5 text-ink font-semibold">{object.origin}</dd>
                  </div>
                  <div className="rounded-xl border border-line/40 bg-void/60 p-2.5">
                    <dt className="text-[0.62rem] text-muted uppercase">Decimal Degrees (J2000)</dt>
                    <dd className="mt-0.5 text-glint font-semibold">
                      {degrees ? `${degrees.raDeg.toFixed(6)}°, ${degrees.decDeg.toFixed(6)}°` : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-line/40 bg-void/60 p-2.5">
                    <dt className="text-[0.62rem] text-muted uppercase">SIMBAD Reference</dt>
                    <dd className="mt-0.5 text-brass">
                      <a
                        href={`https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(object.bibcode)}/abstract`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline break-all"
                      >
                        {object.bibcode} ↗
                      </a>
                    </dd>
                  </div>
                </dl>
                <p className="text-[0.7rem] text-muted leading-relaxed">
                  Verified reference position from {CATALOG_META.provider}. This astrometric center point is passed directly to the NASA IRSA Simple Image Access (SIA) cone query.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line/60 bg-void/30 p-6 text-center">
          <p className="text-sm leading-relaxed text-muted">
            Choose a celestial target above to resolve ICRS coordinates and query NASA’s SPHEREx Level-2 archive.
          </p>
        </div>
      )}
    </section>
  )
}
