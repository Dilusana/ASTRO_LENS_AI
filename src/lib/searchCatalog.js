function haystack(object) {
  return [object.name, object.designation, object.kind, ...(object.aliases ?? [])]
    .join(' ')
    .toLowerCase()
}

export function searchCatalog(objects, query) {
  const term = query.trim().toLowerCase()
  if (!term) return objects
  return objects.filter((object) => haystack(object).includes(term))
}
