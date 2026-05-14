export function SearchBar({ value, onChange, placeholder = 'Search records...' }) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 pl-11 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70"
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">⌕</span>
    </div>
  );
}