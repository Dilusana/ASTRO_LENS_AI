/**
 * Convert the sexagesimal positions stored in the local catalog to ICRS degrees.
 * The strings stay the source of truth; degrees are only the form IRSA expects.
 */

function partsToDegrees(degrees, minutes = 0, seconds = 0) {
  return Math.abs(degrees) + minutes / 60 + seconds / 3600
}

export function parseRightAscension(value) {
  const match = String(value)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+(?:\.\d+)?)?\s*m?\s*(\d+(?:\.\d+)?)?\s*s?$/i)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  if (hours >= 24 || minutes >= 60 || seconds >= 60) return null
  return partsToDegrees(hours, minutes, seconds) * 15
}

export function parseDeclination(value) {
  const match = String(value)
    .trim()
    .match(/^([+−-]?)(\d+(?:\.\d+)?)\s*[°º]\s*(\d+(?:\.\d+)?)?\s*[′']?\s*(\d+(?:\.\d+)?)?\s*[″"]?$/)
  if (!match) return null
  const degrees = Number(match[2])
  const minutes = Number(match[3] ?? 0)
  const seconds = Number(match[4] ?? 0)
  if (degrees > 90 || minutes >= 60 || seconds >= 60) return null
  const magnitude = partsToDegrees(degrees, minutes, seconds)
  if (magnitude > 90) return null
  return match[1] === '-' || match[1] === '−' ? -magnitude : magnitude
}

export function catalogPositionToDegrees(object) {
  const raDeg = parseRightAscension(object?.ra)
  const decDeg = parseDeclination(object?.dec)
  if (raDeg == null || decDeg == null) return null
  return { raDeg, decDeg }
}
