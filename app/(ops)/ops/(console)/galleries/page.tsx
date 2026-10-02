import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { GalleryManager } from "@/components/ops/gallery-manager"
import { loadCmsGallery } from "@/lib/galleries"
import { loadMediaAssets } from "@/lib/media-assets"
import { requireOpsStaff } from "@/lib/ops-auth"
import { staffHasPermission, StaffPermission } from "@/lib/staff"

export const metadata = {
  title: "Gallery · Ops · Ice Age Expeditions",
  robots: { index: false },
}

export default async function GalleriesPage() {
  const staff = await requireOpsStaff()
  const canWrite = staffHasPermission(staff.role, StaffPermission.catalogWrite)
  const [items, media] = await Promise.all([loadCmsGallery(), loadMediaAssets()])

  if (items === "offline") {
    return (
      <div>
        <OpsHeading
          kicker="Content"
          title="Gallery"
          body="Add images and videos to the public expedition gallery."
        />
        <OpsOffline />
      </div>
    )
  }

  return (
    <div>
      <OpsHeading
        kicker="Content"
        title="Gallery"
        body="Add, caption, and reorder expedition images and videos. Active items appear on the public gallery page. Pick from the media library — upload new assets there first."
      />
      <GalleryManager
        initialItems={items}
        mediaAssets={media === "offline" ? [] : media}
        canWrite={canWrite}
      />
    </div>
  )
}
