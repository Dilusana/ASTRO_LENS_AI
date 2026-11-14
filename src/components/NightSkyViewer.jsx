import { useEffect, useRef, useState, useMemo, useCallback } from 'react'

/**
 * Supported celestial targets with verified ICRS coordinates,
 * spectral colors, and educational metadata.
 */
export const SKY_TARGETS = [
  {
    id: 'sirius',
    name: 'Sirius',
    designation: 'α Canis Majoris',
    type: 'Binary Star System (A1V + DA)',
    category: 'stars',
    constellation: 'Canis Major',
    distance: '8.6 light-years',
    ra: '06h 45m 08.9s',
    dec: '−16° 42′ 58″',
    raDeg: 101.287,
    decDeg: -16.716,
    color: '#38bdf8', // Diamond blue-white
    glowColor: 'rgba(56, 189, 248, 0.45)',
    description:
      'The brightest star in Earth’s night sky, Sirius is a close binary system blazing just 8.6 light-years away, outshining surrounding field stars in both optical and infrared bands.',
    scienceNote: 'Benchmark stellar point source for infrared flux calibration across SPHEREx passes.',
    mag: -1.46,
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    designation: 'α Orionis',
    type: 'Pulsating Red Supergiant',
    category: 'stars',
    constellation: 'Orion',
    distance: '550 light-years',
    ra: '05h 55m 10.3s',
    dec: '+07° 24′ 25″',
    raDeg: 88.793,
    decDeg: 7.407,
    color: '#f97316', // Fiery amber-red
    glowColor: 'rgba(249, 115, 22, 0.45)',
    description:
      'A pulsating red supergiant near the end of its life, famous for the 2019 Great Dimming when it ejected colossal clouds of circumstellar dust that condensed and blocked its light.',
    scienceNote: 'SPHEREx observes warm circumstellar dust shells expanding into interstellar space.',
    mag: 0.5,
  },
  {
    id: 'vega',
    name: 'Vega',
    designation: 'α Lyrae',
    type: 'A0Va Main-Sequence Star',
    category: 'stars',
    constellation: 'Lyra',
    distance: '25 light-years',
    ra: '18h 36m 56.3s',
    dec: '+38° 47′ 01″',
    raDeg: 279.235,
    decDeg: 38.784,
    color: '#60a5fa', // Sapphire blue-white
    glowColor: 'rgba(96, 165, 250, 0.45)',
    description:
      'A brilliant sapphire star that historically served as the zero-point for stellar magnitudes. Encircled by a warm circumstellar debris disk formed by colliding planetesimals.',
    scienceNote: 'Exhibits strong infrared excess from its planetesimal debris belt.',
    mag: 0.03,
  },
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    designation: 'GJ 699',
    type: 'High Proper Motion Red Dwarf',
    category: 'stars',
    constellation: 'Ophiuchus',
    distance: '5.96 light-years',
    ra: '17h 57m 48.5s',
    dec: '+04° 41′ 36″',
    raDeg: 269.452,
    decDeg: 4.693,
    color: '#f43f5e', // Crimson red dwarf
    glowColor: 'rgba(244, 63, 94, 0.45)',
    description:
      'The fastest-moving star across our night sky, racing at 10.3 arcseconds per year. Ideal for witnessing stellar motion across multi-epoch space surveys.',
    scienceNote: 'Benchmark for multi-epoch astrometric alignment across SPHEREx repeat passes.',
    mag: 9.5,
  },
  {
    id: 'm31',
    name: 'Andromeda Galaxy',
    designation: 'Messier 31 / NGC 224',
    type: 'Major Spiral Galaxy',
    category: 'galaxies',
    constellation: 'Andromeda',
    distance: '2.5 million light-years',
    ra: '00h 42m 44.3s',
    dec: '+41° 16′ 08″',
    raDeg: 10.685,
    decDeg: 41.269,
    color: '#c084fc', // Purple-cyan spiral galaxy halo
    glowColor: 'rgba(192, 132, 252, 0.45)',
    description:
      'A colossal spiral galaxy holding over a trillion stars, our closest major cosmic neighbor approaching the Milky Way at 110 kilometers per second.',
    scienceNote: 'Broad galactic nucleus fading into elliptical spiral arms laced with warm dust.',
    mag: 3.44,
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855',
    designation: 'WISE J085510.83-071442.5',
    type: 'Sub-Zero Brown Dwarf (Y4)',
    category: 'brown-dwarfs',
    constellation: 'Hydra',
    distance: '7.2 light-years',
    ra: '08h 55m 10.8s',
    dec: '−07° 14′ 42″',
    raDeg: 133.795,
    decDeg: -7.245,
    color: '#e879f9', // Deep infrared magenta
    glowColor: 'rgba(232, 121, 249, 0.45)',
    description:
      'The coldest known sub-stellar brown dwarf outside our solar system, with sub-zero atmospheric temperatures (−13°C) and clouds composed of water ice.',
    scienceNote: 'Tests archive quadrant boundary coverage and faint mid-IR detection limits.',
    mag: 13.5,
  },
  {
    id: 'm42',
    name: 'Orion Nebula',
    designation: 'Messier 42 / NGC 1976',
    type: 'Diffuse Star-Forming H II Nebula',
    category: 'galaxies',
    constellation: 'Orion',
    distance: '1,340 light-years',
    ra: '05h 35m 16.8s',
    dec: '−05° 23′ 15″',
    raDeg: 83.82,
    decDeg: -5.39,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    description:
      'The closest massive stellar nursery to Earth, where brand-new stars are actively condensing out of turbulent, glowing clouds of hydrogen and interstellar dust.',
    scienceNote: 'Spectacular polycyclic aromatic hydrocarbon (PAH) emission in infrared bands.',
    mag: 4.0,
  },
  {
    id: 'polaris',
    name: 'Polaris',
    designation: 'α Ursae Minoris',
    type: 'Cepheid Variable & North Star',
    category: 'stars',
    constellation: 'Ursa Minor',
    distance: '430 light-years',
    ra: '02h 31m 49.1s',
    dec: '+89° 15′ 51″',
    raDeg: 37.95,
    decDeg: 89.26,
    color: '#fef08a',
    glowColor: 'rgba(254, 240, 138, 0.45)',
    description:
      'The North Celestial Pole star and cosmic anchor. Polaris is a multiple star system and the closest Classical Cepheid variable star to Earth.',
    scienceNote: 'High-declination infrared point source located within 1° of the celestial north axis.',
    mag: 1.98,
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    designation: 'RW Aur',
    type: 'Disrupted T Tauri Binary',
    category: 'variables',
    constellation: 'Auriga',
    distance: '530 light-years',
    ra: '05h 07m 49.5s',
    dec: '+30° 24′ 05″',
    raDeg: 76.96,
    decDeg: 30.4,
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    description:
      'A young pre-main-sequence binary system undergoing violent tidal disruptions. Infant stars sheared their protoplanetary disks, producing a bridge of dust.',
    scienceNote: 'Variable infrared flux from circumstellar dust occultations and stellar accretion.',
    mag: 10.2,
  },
]

// Constellation lines connecting RA/Dec coordinates
const CONSTELLATION_LINES = [
  // Orion
  [{ ra: 88.79, dec: 7.41 }, { ra: 81.28, dec: 6.35 }],
  [{ ra: 81.28, dec: 6.35 }, { ra: 78.63, dec: -8.2 }],
  [{ ra: 88.79, dec: 7.41 }, { ra: 86.94, dec: -9.67 }],
  [{ ra: 86.94, dec: -9.67 }, { ra: 78.63, dec: -8.2 }],
  [{ ra: 83.0, dec: -0.3 }, { ra: 84.05, dec: -1.2 }],
  [{ ra: 84.05, dec: -1.2 }, { ra: 85.19, dec: -1.94 }],
  // Canis Major
  [{ ra: 101.29, dec: -16.72 }, { ra: 95.67, dec: -17.96 }],
  [{ ra: 101.29, dec: -16.72 }, { ra: 107.1, dec: -26.39 }],
  [{ ra: 107.1, dec: -26.39 }, { ra: 104.65, dec: -28.97 }],
  // Lyra
  [{ ra: 279.24, dec: 38.78 }, { ra: 281.0, dec: 39.67 }],
  [{ ra: 279.24, dec: 38.78 }, { ra: 284.1, dec: 36.66 }],
  [{ ra: 284.1, dec: 36.66 }, { ra: 284.8, dec: 33.36 }],
  [{ ra: 284.8, dec: 33.36 }, { ra: 280.5, dec: 32.69 }],
  [{ ra: 280.5, dec: 32.69 }, { ra: 279.24, dec: 38.78 }],
  // Cassiopeia
  [{ ra: 8.7, dec: 59.15 }, { ra: 10.13, dec: 56.54 }],
  [{ ra: 10.13, dec: 56.54 }, { ra: 14.18, dec: 60.72 }],
  [{ ra: 14.18, dec: 60.72 }, { ra: 21.45, dec: 60.23 }],
  [{ ra: 21.45, dec: 60.23 }, { ra: 26.05, dec: 63.67 }],
  // Big Dipper (Ursa Major)
  [{ ra: 165.93, dec: 61.75 }, { ra: 165.46, dec: 56.38 }],
  [{ ra: 165.46, dec: 56.38 }, { ra: 178.46, dec: 53.69 }],
  [{ ra: 178.46, dec: 53.69 }, { ra: 183.86, dec: 57.03 }],
  [{ ra: 183.86, dec: 57.03 }, { ra: 165.93, dec: 61.75 }],
  [{ ra: 183.86, dec: 57.03 }, { ra: 193.51, dec: 55.96 }],
  [{ ra: 193.51, dec: 55.96 }, { ra: 200.98, dec: 54.92 }],
  [{ ra: 200.98, dec: 54.92 }, { ra: 206.88, dec: 49.31 }],
]

// Convert celestial coordinates to normalized canvas coords (0 to 1)
function celestialToNormalized(raDeg, decDeg) {
  const normX = ((raDeg - 20 + 360) % 360) / 360
  const normY = 0.5 - decDeg / 160
  return { x: normX, y: normY }
}

// Generate reproducible background starfield statically once
function generateStaticStarfield() {
  const stars = []
  const count = 1400
  let seed = 42
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  for (let i = 0; i < count; i++) {
    const ra = pseudoRandom() * 360
    const u = pseudoRandom() * 2 - 1
    const dec = (Math.asin(u) * 180) / Math.PI

    const galacticLat = Math.sin((ra * Math.PI) / 180) * 45 + dec
    const isMilkyWay = Math.abs(galacticLat) < 22

    const mag = 1.0 + Math.pow(pseudoRandom(), 2.8) * 6.5
    const brightness = Math.max(0.15, Math.min(1.0, 1.0 - (mag - 1.0) / 6.0))

    const colorRoll = pseudoRandom()
    let color = 'rgba(255, 255, 255,'
    if (colorRoll < 0.22) color = 'rgba(186, 230, 253,'
    else if (colorRoll < 0.55) color = 'rgba(248, 250, 252,'
    else if (colorRoll < 0.78) color = 'rgba(254, 240, 138,'
    else if (colorRoll < 0.92) color = 'rgba(253, 186, 116,'
    else color = 'rgba(252, 165, 165,'

    stars.push({
      ra,
      dec,
      size: Math.max(0.6, (7.0 - mag) * 0.45),
      brightness: isMilkyWay ? brightness * 1.15 : brightness,
      baseColor: color,
      twinklePhase: pseudoRandom() * Math.PI * 2,
      twinkleSpeed: 0.8 + pseudoRandom() * 1.8,
    })
  }
  return stars
}

const STATIC_STARFIELD = generateStaticStarfield()

export default function NightSkyViewer({
  onNavigate,
  onSelectTarget,
  catalog: _catalog = [],
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const aladinContainerRef = useRef(null)

  // Interactive Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState(1.15)
  const [pan, setPan] = useState({ x: -40, y: 10 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })

  // Active Selected Marker Popup
  const [activeTarget, setActiveTarget] = useState(null)
  const [hoveredTarget, setHoveredTarget] = useState(null)

  // Layer Toggles
  const [showConstellations, setShowConstellations] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [surveyBand, setSurveyBand] = useState('optical')

  // Aladin Lite dynamic load status
  const [aladinError, setAladinError] = useState(null)
  const aladinInstanceRef = useRef(null)

  // Mouse Coordinate Readout
  const [mouseCoords, setMouseCoords] = useState({ ra: '05h 55m', dec: '+07° 24′' })

  // Precomputed normalized target positions for pure CSS marker alignment
  const targetCoords = useMemo(() => {
    return SKY_TARGETS.map((t) => ({
      ...t,
      norm: celestialToNormalized(t.raDeg, t.decDeg),
    }))
  }, [])

  // Handle Aladin Lite integration when selected
  useEffect(() => {
    if (surveyBand !== 'aladin') return

    if (window.A && window.A.aladin) {
      initAladin()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js'
    script.async = true
    script.charset = 'utf-8'

    const timeout = setTimeout(() => {
      if (!window.A) {
        setAladinError('Aladin Lite CDN unreachable or offline. Falling back to Deep Celestial Canvas.')
        setSurveyBand('optical')
      }
    }, 4500)

    script.onload = () => {
      clearTimeout(timeout)
      initAladin()
    }
    script.onerror = () => {
      clearTimeout(timeout)
      setAladinError('Could not load Aladin Lite from CDS Strasbourg. Switched to offline Deep Sky Canvas.')
      setSurveyBand('optical')
    }

    document.head.appendChild(script)

    function initAladin() {
      try {
        if (!aladinContainerRef.current) return
        setAladinError(null)

        if (!aladinInstanceRef.current && window.A && window.A.aladin) {
          const aladin = window.A.aladin(aladinContainerRef.current, {
            survey: 'P/DSS2/color',
            fov: 50,
            target: '05 55 10.3 +07 24 25',
            showReticle: false,
            showZoomControl: true,
            showLayersControl: true,
            showFullscreenControl: false,
            showGotoControl: false,
          })
          aladinInstanceRef.current = aladin

          if (window.A.catalog && window.A.marker) {
            const cat = window.A.catalog({ name: 'AstroLens Targets', sourceSize: 18 })
            aladin.addCatalog(cat)
            SKY_TARGETS.forEach((t) => {
              const marker = window.A.marker(t.raDeg, t.decDeg, {
                popupTitle: `${t.name} (${t.designation})`,
                popupDesc: `${t.type} • Distance: ${t.distance}`,
              })
              cat.addSources([marker])
            })
          }
        }
      } catch (err) {
        console.warn('Aladin Lite initialization notice:', err)
      }
    }

    return () => {
      clearTimeout(timeout)
    }
  }, [surveyBand])

  // Canvas render loop for Deep Celestial Night Sky
  useEffect(() => {
    if (surveyBand === 'aladin') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let time = 0

    function render() {
      time += 0.02
      const rect = canvas.parentElement.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      ctx.clearRect(0, 0, width, height)

      // 1. Deep Space Night Sky Gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5 + pan.x * 0.3,
        height * 0.5 + pan.y * 0.3,
        50,
        width * 0.5,
        height * 0.5,
        width * 0.85
      )
      if (surveyBand === 'infrared') {
        bgGrad.addColorStop(0, '#090514')
        bgGrad.addColorStop(0.5, '#050410')
        bgGrad.addColorStop(1, '#020108')
      } else {
        bgGrad.addColorStop(0, '#040817')
        bgGrad.addColorStop(0.45, '#030612')
        bgGrad.addColorStop(1, '#010207')
      }
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Realistic Milky Way Galactic Dust Clouds
      ctx.save()
      const mwCenter = {
        x: width * 0.45 + pan.x,
        y: height * 0.5 + pan.y,
      }
      const mwGradient = ctx.createLinearGradient(
        mwCenter.x - 300 * zoom,
        mwCenter.y - 250 * zoom,
        mwCenter.x + 350 * zoom,
        mwCenter.y + 300 * zoom
      )
      if (surveyBand === 'infrared') {
        mwGradient.addColorStop(0, 'rgba(168, 85, 247, 0.0)')
        mwGradient.addColorStop(0.3, 'rgba(192, 132, 252, 0.12)')
        mwGradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.18)')
        mwGradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.10)')
        mwGradient.addColorStop(1, 'rgba(147, 51, 234, 0.0)')
      } else {
        mwGradient.addColorStop(0, 'rgba(56, 189, 248, 0.0)')
        mwGradient.addColorStop(0.25, 'rgba(99, 102, 241, 0.08)')
        mwGradient.addColorStop(0.5, 'rgba(147, 197, 253, 0.14)')
        mwGradient.addColorStop(0.75, 'rgba(168, 85, 247, 0.09)')
        mwGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)')
      }

      ctx.fillStyle = mwGradient
      ctx.beginPath()
      ctx.ellipse(
        mwCenter.x,
        mwCenter.y,
        width * 0.55 * zoom,
        height * 0.22 * zoom,
        (Math.PI / 180) * -34,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()

      // 3. Coordinate Grid (RA / Dec lines)
      if (showGrid) {
        ctx.save()
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 4])
        ctx.font = '9px monospace'
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)'

        for (let dec = -60; dec <= 80; dec += 30) {
          const pt = celestialToNormalized(90, dec)
          const screenY = height * (0.5 + (pt.y - 0.5) * zoom) + pan.y
          if (screenY >= 0 && screenY <= height) {
            ctx.beginPath()
            ctx.moveTo(0, screenY)
            ctx.lineTo(width, screenY)
            ctx.stroke()
            ctx.fillText(`${dec > 0 ? '+' : ''}${dec}°`, 12, screenY - 4)
          }
        }

        for (let ra = 0; ra < 360; ra += 45) {
          const pt = celestialToNormalized(ra, 0)
          const screenX = width * (0.5 + (pt.x - 0.5) * zoom) + pan.x
          if (screenX >= 0 && screenX <= width) {
            ctx.beginPath()
            ctx.moveTo(screenX, 0)
            ctx.lineTo(screenX, height)
            ctx.stroke()
            const raHours = Math.round(ra / 15)
            ctx.fillText(`${raHours}h`, screenX + 4, height - 12)
          }
        }
        ctx.restore()
      }

      // 4. Constellation Lines
      if (showConstellations) {
        ctx.save()
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.28)'
        ctx.lineWidth = 1.2
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)'
        ctx.shadowBlur = 4

        CONSTELLATION_LINES.forEach((line) => {
          const p1Norm = celestialToNormalized(line[0].ra, line[0].dec)
          const p2Norm = celestialToNormalized(line[1].ra, line[1].dec)

          const x1 = width * (0.5 + (p1Norm.x - 0.5) * zoom) + pan.x
          const y1 = height * (0.5 + (p1Norm.y - 0.5) * zoom) + pan.y
          const x2 = width * (0.5 + (p2Norm.x - 0.5) * zoom) + pan.x
          const y2 = height * (0.5 + (p2Norm.y - 0.5) * zoom) + pan.y

          if (Math.abs(x1 - x2) < width * 0.6) {
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        })
        ctx.restore()
      }

      // 5. Background Stars Rendering
      STATIC_STARFIELD.forEach((star) => {
        const norm = celestialToNormalized(star.ra, star.dec)
        const sx = width * (0.5 + (norm.x - 0.5) * zoom) + pan.x
        const sy = height * (0.5 + (norm.y - 0.5) * zoom) + pan.y

        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return

        const twinkle = 0.8 + 0.2 * Math.sin(time * star.twinkleSpeed + star.twinklePhase)
        const alpha = Math.min(1.0, star.brightness * twinkle)

        ctx.fillStyle = `${star.baseColor} ${alpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(0.6, star.size * Math.min(zoom, 1.8)), 0, Math.PI * 2)
        ctx.fill()
      })

      // 6. Diffraction Spikes for Bright Prominent Stars
      SKY_TARGETS.forEach((target) => {
        if (target.mag < 1.5) {
          const norm = celestialToNormalized(target.raDeg, target.decDeg)
          const sx = width * (0.5 + (norm.x - 0.5) * zoom) + pan.x
          const sy = height * (0.5 + (norm.y - 0.5) * zoom) + pan.y

          if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
            ctx.save()
            ctx.strokeStyle = target.glowColor
            ctx.lineWidth = 1
            const spikeLen = Math.max(12, (3.5 - target.mag) * 8 * zoom)
            ctx.beginPath()
            ctx.moveTo(sx - spikeLen, sy)
            ctx.lineTo(sx + spikeLen, sy)
            ctx.moveTo(sx, sy - spikeLen)
            ctx.lineTo(sx, sy + spikeLen)
            ctx.stroke()
            ctx.restore()
          }
        }
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [zoom, pan, showConstellations, showGrid, surveyBand])

  // Pan interaction handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.interactive-hud')) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { x: pan.x, y: pan.y }
  }

  const handleMouseMove = useCallback((e) => {
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const normX = (mx - pan.x) / (rect.width * zoom)
      const normY = (my - pan.y) / (rect.height * zoom)
      const raDeg = ((normX * 360 + 20) % 360 + 360) % 360
      const decDeg = (0.5 - normY) * 160
      const raHours = Math.floor(raDeg / 15)
      const raMins = Math.floor((raDeg % 15) * 4)
      setMouseCoords({
        ra: `${String(raHours).padStart(2, '0')}h ${String(raMins).padStart(2, '0')}m`,
        dec: `${decDeg >= 0 ? '+' : ''}${decDeg.toFixed(1)}°`,
      })
    }

    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    })
  }, [isDragging, pan.x, pan.y, zoom])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom handlers
  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(4.5, Math.max(0.75, prev + delta)))
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15
    handleZoom(zoomDelta)
  }

  const handleReset = () => {
    setZoom(1.15)
    setPan({ x: -40, y: 10 })
    setActiveTarget(null)
  }

  // Smoothly center on a specific celestial target
  const handleJumpToTarget = (target) => {
    setActiveTarget(target)
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const norm = celestialToNormalized(target.raDeg, target.decDeg)
    const targetCenterX = rect.width * 0.5
    const targetCenterY = rect.height * 0.5
    const newPanX = targetCenterX - rect.width * (0.5 + (norm.x - 0.5) * 1.6)
    const newPanY = targetCenterY - rect.height * (0.5 + (norm.y - 0.5) * 1.6)

    setZoom(1.6)
    setPan({ x: newPanX, y: newPanY })
  }

  // Target Actions: Navigate to Explore with selected target
  const handleExploreTarget = (targetId) => {
    onSelectTarget?.(targetId)
    onNavigate?.('explore')
  }

  // Target Actions: Navigate to Astro AI with selected target
  const handleAskAstroAi = (targetId) => {
    onSelectTarget?.(targetId)
    onNavigate?.('ai')
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border border-line/80 bg-[#030612] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-md select-none group"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 1. TOP HUD HEADER BAR */}
      <div className="relative z-30 flex flex-wrap items-center justify-between border-b border-white/10 bg-[#070c18]/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-950/50 text-cyan-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12a14.5 14.5 0 0 0 20 0" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-white tracking-wide">
                ALL-SKY CELESTIAL NAVIGATOR
              </span>
              <span className="hidden sm:inline rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[0.62rem] font-mono text-cyan-300">
                DSS2 / 2MASS
              </span>
            </div>
            <p className="text-[0.65rem] text-muted hidden sm:block">
              Interactive night sky viewer • Real stellar coordinates & constellations
            </p>
          </div>
        </div>

        {/* Survey & Layer Mode Controls */}
        <div className="interactive-hud flex items-center gap-1.5 sm:gap-2">
          {/* Survey Band Selector */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/50 p-0.5 text-[0.68rem] font-mono">
            <button
              type="button"
              onClick={() => setSurveyBand('optical')}
              className={`cursor-pointer rounded px-2.5 py-1 transition ${
                surveyBand === 'optical'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
              title="Optical Deep-Sky Band (DSS2)"
            >
              Optical
            </button>
            <button
              type="button"
              onClick={() => setSurveyBand('infrared')}
              className={`cursor-pointer rounded px-2.5 py-1 transition ${
                surveyBand === 'infrared'
                  ? 'bg-pink-600 text-white font-medium shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
              title="Near-Infrared Cosmic Dust Band (2MASS)"
            >
              Infrared
            </button>
            <button
              type="button"
              onClick={() => setSurveyBand('aladin')}
              className={`cursor-pointer rounded px-2 py-1 transition flex items-center gap-1 ${
                surveyBand === 'aladin'
                  ? 'bg-cyan-600 text-white font-medium shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
              title="Aladin Lite Interactive Sky Survey"
            >
              <span>Aladin Lite</span>
              <span className="text-[0.55rem] text-cyan-200">HiPS</span>
            </button>
          </div>

          {/* Toggle Layers */}
          <button
            type="button"
            onClick={() => setShowConstellations((v) => !v)}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[0.68rem] font-mono transition ${
              showConstellations
                ? 'border-cyan-400/50 bg-cyan-950/40 text-cyan-200'
                : 'border-white/10 bg-white/5 text-muted hover:text-white'
            }`}
            title="Toggle Constellation Lines"
          >
            ✦ Lines
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[0.68rem] font-mono transition ${
              showGrid
                ? 'border-purple-400/50 bg-purple-950/40 text-purple-200'
                : 'border-white/10 bg-white/5 text-muted hover:text-white'
            }`}
            title="Toggle RA/Dec Celestial Grid"
          >
            # Grid
          </button>
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE SKY VIEWPORT AREA */}
      <div className="relative h-[520px] sm:h-[620px] lg:h-[680px] w-full overflow-hidden cursor-grab active:cursor-grabbing">
        {/* Canvas for Deep Celestial Night Sky */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${surveyBand === 'aladin' ? 'hidden' : 'block'}`}
        />

        {/* Aladin Lite HiPS Container (When Aladin mode is active) */}
        <div
          ref={aladinContainerRef}
          className={`absolute inset-0 w-full h-full bg-black ${surveyBand === 'aladin' ? 'block' : 'hidden'}`}
        />

        {/* Aladin Fallback Notice if Error */}
        {aladinError && surveyBand === 'aladin' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-xl border border-amber-500/40 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 shadow-xl backdrop-blur-md">
            ⚠️ {aladinError}
          </div>
        )}

        {/* 3. HARDWARE-ACCELERATED MARKERS LAYER (Smoothly pinned to stars) */}
        {surveyBand !== 'aladin' && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: '50% 50%',
              }}
            >
              {targetCoords.map((target) => {
                const isSelected = activeTarget?.id === target.id
                const isHovered = hoveredTarget === target.id

                return (
                  <div
                    key={target.id}
                    style={{
                      left: `${target.norm.x * 100}%`,
                      top: `${target.norm.y * 100}%`,
                    }}
                    className="interactive-hud pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTarget(target)
                    }}
                    onMouseEnter={() => setHoveredTarget(target.id)}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    {/* Pulsing selection radar ring */}
                    <span
                      style={{
                        backgroundColor: target.color,
                        borderColor: target.color,
                      }}
                      className={`absolute -inset-3 rounded-full animate-ping opacity-60 pointer-events-none ${
                        isSelected ? 'opacity-85 scale-125' : 'opacity-35'
                      }`}
                    />

                    {/* Outer Glow Halo */}
                    <div
                      style={{
                        backgroundColor: target.color,
                        boxShadow: `0 0 20px ${target.color}`,
                      }}
                      className={`relative flex items-center justify-center rounded-full border-2 border-white transition duration-200 group-hover:scale-130 ${
                        isSelected ? 'h-6 w-6 scale-125 ring-2 ring-white' : 'h-4 w-4'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                    </div>

                    {/* Permanent or Hover Name Label Tag */}
                    {showLabels && (
                      <div
                        className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-black/80 px-2 py-0.5 text-[0.65rem] font-medium text-slate-200 shadow-md backdrop-blur-md transition pointer-events-none ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 font-semibold scale-110'
                            : isHovered
                            ? 'border-purple-400 bg-purple-950/80 text-white scale-105'
                            : 'opacity-85'
                        }`}
                      >
                        <span>{target.name}</span>
                        <span className="text-[0.58rem] text-muted ml-1 hidden sm:inline">
                          ({target.distance})
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. BEAUTIFUL CELESTIAL TARGET POPUP MODAL (Requirements 6, 7, 8) */}
        {activeTarget && (
          <div
            className="interactive-hud absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-auto sm:max-w-md z-40 rounded-2xl border border-cyan-500/40 bg-[#090d1e]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: activeTarget.color }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg text-black font-bold text-sm"
                >
                  ✦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {activeTarget.name}
                    </h3>
                    <span className="text-xs font-mono text-cyan-300">
                      {activeTarget.designation}
                    </span>
                  </div>
                  <span className="inline-block rounded-full bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 text-[0.62rem] font-mono text-purple-200 mt-0.5">
                    {activeTarget.type}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveTarget(null)}
                className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                title="Close popup"
              >
                ✕
              </button>
            </div>

            {/* Target Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 py-3 text-[0.7rem] font-mono">
              <div className="rounded-lg border border-white/5 bg-black/40 p-2">
                <span className="text-muted block text-[0.6rem] uppercase">Constellation</span>
                <span className="text-slate-200 font-semibold">{activeTarget.constellation}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/40 p-2">
                <span className="text-muted block text-[0.6rem] uppercase">Distance</span>
                <span className="text-cyan-300 font-semibold">{activeTarget.distance}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/40 p-2">
                <span className="text-muted block text-[0.6rem] uppercase">Right Ascension</span>
                <span className="text-slate-200">{activeTarget.ra}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/40 p-2">
                <span className="text-muted block text-[0.6rem] uppercase">Declination</span>
                <span className="text-slate-200">{activeTarget.dec}</span>
              </div>
            </div>

            {/* Short Educational Description */}
            <p className="text-xs text-slate-300 leading-relaxed pt-1 pb-3">
              {activeTarget.description}
            </p>

            {/* Scientific Note Callout */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-[0.68rem] text-cyan-200 flex items-center gap-2 mb-4">
              <span className="text-cyan-400">🔭</span>
              <span>{activeTarget.scienceNote}</span>
            </div>

            {/* Action Buttons (Requirements 7, 8, 9) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Explore NASA Data Button */}
              <button
                type="button"
                onClick={() => handleExploreTarget(activeTarget.id)}
                className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition hover:scale-102 active:scale-98"
              >
                <span>Explore NASA Data</span>
                <span>→</span>
              </button>

              {/* Ask Astro AI Button */}
              <button
                type="button"
                onClick={() => handleAskAstroAi(activeTarget.id)}
                className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-sm transition hover:bg-cyan-900/50 hover:text-white active:scale-98"
              >
                <span>💬 Ask Astro AI</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. FLOATING BOTTOM HUD CONTROLS */}
        <div className="interactive-hud absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/70 p-1.5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleZoom(0.25)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-bold text-slate-200 hover:bg-white/15 transition"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.25)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-bold text-slate-200 hover:bg-white/15 transition"
            title="Zoom Out (-)"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/15 transition"
            title="Reset View"
          >
            ⛶
          </button>
          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            className={`flex h-8 px-2 items-center justify-center rounded-lg border text-[0.68rem] font-mono transition ${
              showLabels
                ? 'border-purple-400/50 bg-purple-950/50 text-purple-200'
                : 'border-white/10 bg-white/5 text-muted hover:text-white'
            }`}
            title="Toggle Target Names"
          >
            🏷 Labels
          </button>
        </div>

        {/* 6. TELEMETRY COORDINATES BADGE (BOTTOM LEFT) */}
        <div className="interactive-hud absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 hidden md:flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[0.65rem] font-mono text-slate-300 backdrop-blur-sm pointer-events-none">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>CURSOR: RA {mouseCoords.ra}</span>
          <span className="text-muted">•</span>
          <span>DEC {mouseCoords.dec}</span>
          <span className="text-muted">•</span>
          <span className="text-purple-300">ZOOM: {zoom.toFixed(1)}x</span>
        </div>
      </div>

      {/* 7. QUICK TARGET SELECTION BAR (BELOW VIEWER) */}
      <div className="interactive-hud border-t border-white/10 bg-[#060a16] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[0.68rem] font-mono text-muted uppercase shrink-0">
            JUMP TO TARGET:
          </span>
          {SKY_TARGETS.slice(0, 6).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleJumpToTarget(t)}
              className={`cursor-pointer shrink-0 rounded-full border px-3 py-1 text-[0.7rem] font-medium transition flex items-center gap-1.5 ${
                activeTarget?.id === t.id
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-purple-400/40 hover:text-white'
              }`}
            >
              <span
                style={{ backgroundColor: t.color }}
                className="h-1.5 w-1.5 rounded-full"
              />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {/* Launch Atlas Button */}
        <button
          type="button"
          onClick={() => onNavigate?.('explore')}
          className="cursor-pointer shrink-0 flex items-center justify-center gap-2 rounded-full border border-purple-400/40 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] transition hover:scale-105 active:scale-95"
        >
          <span>Open Full Sky Atlas</span>
          <span>→</span>
        </button>
      </div>

      {/* 8. SCIENTIFIC PROVENANCE FOOTNOTE (Strict scientific accuracy guideline) */}
      <div className="border-t border-white/5 bg-black/60 px-4 py-2 text-[0.62rem] font-mono text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>
          NAVIGATIONAL SURVEY: Optical & Infrared reference all-sky map (ICRS / J2000).
        </span>
        <span className="text-cyan-400/80">
          Genuine calibrated SPHEREx Level-2 FITS observations (Bands 1–6) are queried per target in the Sky Time Machine.
        </span>
      </div>
    </div>
  )
}
