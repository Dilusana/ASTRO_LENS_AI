export async function fetchSpherexObservations({ raDeg, decDeg }, signal) {
  const params = new URLSearchParams({
    ra: String(raDeg),
    dec: String(decDeg),
  })
  const response = await fetch(`/api/spherex/observations?${params}`, { signal })
  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    const detail = body && typeof body.detail === 'string' ? body.detail : null
    throw new Error(detail || 'The SPHEREx archive request failed.')
  }
  if (!body || !Array.isArray(body.observations)) {
    throw new Error('The SPHEREx service returned an unreadable payload.')
  }
  return body
}
