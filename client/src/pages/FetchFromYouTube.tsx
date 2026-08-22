import { PagePlaceholder } from '../components/ui/PagePlaceholder'

/**
 * TODO(Person 4): channel-add form, whitelisted-channel table with enable/remove
 * toggles, and the 4-step Add Channel → Select Videos → Review → Done flow.
 * See docs/general_idea.png. The shell, theme tokens and `Video` type in
 * ../types.ts are ready to build on.
 */
export function FetchFromYouTube() {
  return (
    <PagePlaceholder
      title="Fetch from YouTube"
      description="Add trusted channels and import their educational videos."
    >
      <p className="text-sm text-muted">
        Channel ingestion UI goes here.
        <br />
        CrackEd only fetches metadata — videos stay on YouTube and play via iframe.
      </p>
    </PagePlaceholder>
  )
}
