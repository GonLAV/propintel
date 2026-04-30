type PlanInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

export function PlanInput({ label, value, onChange }: PlanInputProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/38">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20"
        placeholder="415-0792036"
      />
    </label>
  )
}
