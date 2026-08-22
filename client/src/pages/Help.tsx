import { PagePlaceholder } from '../components/ui/PagePlaceholder'

export function Help() {
  return (
    <PagePlaceholder
      title="Help"
      description="How CrackEd works and where its videos come from."
    >
      <p className="text-sm text-muted">
        CrackEd curates educational videos from whitelisted YouTube channels and
        rewrites their titles to be more engaging. Videos remain on YouTube and
        play through an embedded player.
      </p>
    </PagePlaceholder>
  )
}
