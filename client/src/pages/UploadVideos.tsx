import { PagePlaceholder } from '../components/ui/PagePlaceholder'

/**
 * TODO(Person 4): drag-and-drop upload plus the 5-step flow
 * Upload → Details → Preprocess → Review → Publish. See docs/general_idea.png
 * and docs/my_videos.png. The preprocess step may be stubbed if the AI
 * clip-splitting stretch feature does not land.
 */
export function UploadVideos() {
  return (
    <PagePlaceholder
      title="Upload & Preprocess"
      description="Upload your own videos and let AI turn them into focused lessons."
    >
      <p className="text-sm text-muted">
        Drag-and-drop upload and the 5-step publish flow go here.
      </p>
    </PagePlaceholder>
  )
}
