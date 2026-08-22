type CategoryChipsProps = {
  categories: readonly string[]
  active: string
  onChange: (category: string) => void
}

export function CategoryChips({ categories, active, onChange }: CategoryChipsProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {categories.map((category) => {
        const isActive = category === active
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-text text-bg'
                : 'bg-surface text-text hover:bg-elevated'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
