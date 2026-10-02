import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { MediaManager } from "@/components/ops/media-manager"
import { loadMediaAssets } from "@/lib/media-assets"
import { requireOpsStaff } from "@/lib/ops-auth"
import { staffHasPermission, StaffPermission } from "@/lib/staff"

export const metadata = { title: "Media library · Ops · Ice Age Expeditions", robots: { index: false } }

export default async function MediaPage() {
  const staff = await requireOpsStaff()
  const canWrite = staffHasPermission(staff.role, StaffPermission.catalogWrite)
  const assets = await loadMediaAssets()

  return (
    <div>
      <OpsHeading
        kicker="Content"
        title="Media library"
        body="Images (JPEG, PNG, WebP) and expedition videos (MP4, WebM) uploaded here are the single source for hero slides and the public gallery. Pick from this library — do not re-upload the same file."
      />
      {assets === "offline" ? (
        <OpsOffline />
      ) : (
        <MediaManager initialAssets={assets} canWrite={canWrite} />
      )}
    </div>
  )
}
