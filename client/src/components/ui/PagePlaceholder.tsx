import type { ReactNode } from 'react'

type PagePlaceholderProps = {
  title: string
  description: string
  children?: ReactNode
}

/** Shared frame for pages that are scaffolded but not yet built out. */
export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        {children ?? <p className="text-sm text-muted">Coming soon.</p>}
      </div>
    </section>
  )
}
