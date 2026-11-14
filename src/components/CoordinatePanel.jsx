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
  const degrees = object ? catalogPositionToDegrees(object) : null

  return (
    <section
      aria-labelledby="coordinates-heading"
      className="rounded-3xl border border-line bg-panel/80 p-5 sm:p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-medium tracking-[0.18em] text-brass uppercase">
              {mode === 'explorer' ? '2. Celestial Position' : 'Reference Astrometry'}
            </span>
          </div>
          <h2 id="coordinates-heading" className="font-display mt-1 text-3xl text-ink">
            {object ? object.name : 'No sky target selected'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-void/50 px-3 py-1 text-xs text-muted">
            {CATALOG_META.frame} · {CATALOG_META.epoch}
          </span>
        </div>
      </div>

      {object ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted">
            <span className="text-ink font-medium">{object.designation}</span>
            <span className="mx-2 text-line">•</span>
            <span>{object.kind}</span>
            {object.constellation && (
              <>
                <span className="mx-2 text-line">•</span>
                <span>Constellation: {object.constellation}</span>
              </>
            )}
            {object.distance && (
              <>
                <span className="mx-2 text-line">•</span>
                <span>Distance: {object.distance}</span>
              </>
            )}
          </p>

          {/* Coordinate Readout Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <CoordinateCard
              title={mode === 'explorer' ? 'Sky Longitude (RA)' : 'Right Ascension'}
              subtitle={degrees ? `${degrees.raDeg.toFixed(5)}°` : 'RA'}
              value={object.ra}
              description="Celestial east-west address measured in hours, minutes, and seconds as Earth rotates."
              mode={mode}
            />
            <CoordinateCard
              title={mode === 'explorer' ? 'Sky Latitude (Dec)' : 'Declination'}
              subtitle={degrees ? `${degrees.decDeg.toFixed(5)}°` : 'Dec'}
              value={object.dec}
              description="Angular distance north (+) or south (−) from Earth’s celestial equator toward the poles."
              mode={mode}
            />
          </div>

          {/* Explorer Mode Specific Guides */}
          {mode === 'explorer' ? (
            <div className="space-y-3">
              {object.whatToLookFor && (
                <div className="rounded-2xl border border-glint/30 bg-glint/5 p-4">
                  <p className="text-xs font-semibold text-glint flex items-center gap-1.5">
                    <span>✨</span> What to look for in infrared:
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/90">
                    {object.whatToLookFor}
                  </p>
                </div>
              )}

              <details className="group rounded-2xl border border-line bg-void/40 p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-muted hover:text-ink">
                  <span className="flex items-center gap-2">
                    <span className="text-brass">💡</span>
                    <span>How do celestial coordinates work?</span>
                  </span>
                  <span className="transition group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-3 text-xs leading-relaxed text-muted space-y-2 border-t border-line/50 pt-3">
                  <p>
                    Because Earth rotates continuously, standard GPS latitude and longitude on the ground constantly move underneath the stars.
                  </p>
                  <p>
                    Astronomers project an imaginary sphere onto the cosmos called the <strong>Celestial Sphere</strong>.
                    Right Ascension (RA) begins at the Vernal Equinox and circles 24 hours around the sky.
                    Declination (Dec) spans from +90° (North Celestial Pole) to −90° (South Celestial Pole).
                  </p>
                </div>
              </details>
            </div>
          ) : (
            /* Science Mode Detailed Astrometry */
            <div className="rounded-2xl border border-line bg-void/40 p-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Coordinate Origin</dt>
                  <dd className="mt-1 font-medium text-ink">{object.origin}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Decimal Degrees (J2000)</dt>
                  <dd className="mt-1 font-mono text-xs text-glint">
                    {degrees ? `${degrees.raDeg.toFixed(6)}°, ${degrees.decDeg.toFixed(6)}°` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Reference Bibcode</dt>
                  <dd className="mt-1 font-mono text-xs">
                    <a
                      href={`https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(object.bibcode)}/abstract`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brass hover:underline break-all"
                    >
                      {object.bibcode} ↗
                    </a>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.72rem] leading-relaxed text-muted">
                Static reference position from {CATALOG_META.provider}. This astrometric center point
                is passed directly to the NASA IRSA Simple Image Access (SIA) service.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
          {mode === 'explorer'
            ? 'Choose a celestial target from the list on the left to inspect its coordinates and load NASA infrared observations.'
            : 'Select an object from the local catalog to resolve coordinates and initiate IRSA archive cone search.'}
        </p>
      )}
    </section>
  )
}
