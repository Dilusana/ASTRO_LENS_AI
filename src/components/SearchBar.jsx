export default function SearchBar({ query, onQueryChange, matchCount }) {
  return (
    <form
      role="search"
      className="space-y-2"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="object-search" className="block text-xs tracking-[0.16em] text-muted uppercase">
          Star or object name
        </label>
        <p className="font-mono text-[0.7rem] text-muted">{matchCount} matches</p>
      </div>
      <input
        id="object-search"
        type="text"
        role="searchbox"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search Sirius, Vega, M 31…"
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-void px-3 py-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-glint/70 focus:ring-2 focus:ring-glint/25"
      />
      <p className="text-xs leading-relaxed text-muted">
        Matches names in the local catalog only. Unknown names are left unresolved.
      </p>
    </form>
  )
}
