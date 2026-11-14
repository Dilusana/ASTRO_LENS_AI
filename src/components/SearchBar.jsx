import { useEffect, useRef } from 'react'

export default function SearchBar({ query, onQueryChange, matchCount, mode = 'explorer' }) {
  const inputRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <form
      role="search"
      className="space-y-2"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="object-search" className="block text-xs tracking-[0.16em] text-muted uppercase">
          {mode === 'explorer' ? '1. Find sky target' : 'Object name search'}
        </label>
        <p className="font-mono text-[0.7rem] text-muted">{matchCount} matches</p>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id="object-search"
          type="text"
          role="searchbox"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={mode === 'explorer' ? 'Search Sirius, Vega, M 31, Orion…' : 'Filter by name or alias…'}
          autoComplete="off"
          className="w-full rounded-xl border border-line bg-void px-3.5 py-3 pr-16 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-glint/70 focus:ring-2 focus:ring-glint/25"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="cursor-pointer rounded-lg p-1 text-muted hover:text-ink"
              aria-label="Clear search query"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded border border-line/70 bg-panel px-1.5 py-0.5 font-mono text-[0.65rem] text-muted">
              /
            </kbd>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {mode === 'explorer'
          ? 'Pick from curated targets to explore genuine infrared data.'
          : 'Matches names and aliases in the verified local catalog.'}
      </p>
    </form>
  )
}
