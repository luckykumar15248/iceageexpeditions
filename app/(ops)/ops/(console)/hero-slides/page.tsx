import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { HeroSlidesManager } from "@/components/ops/hero-slides-manager"
import { loadCmsHeroSlides } from "@/lib/hero-slides"
import { loadMediaAssets } from "@/lib/media-assets"
import { requireOpsStaff } from "@/lib/ops-auth"
import { staffHasPermission, StaffPermission } from "@/lib/staff"

export const metadata = { title: "Hero slides · Ops · Ice Age Expeditions", robots: { index: false } }

export default async function HeroSlidesPage() {
  const staff = await requireOpsStaff()
  const canWrite = staffHasPermission(staff.role, StaffPermission.catalogWrite)
  const [slides, media] = await Promise.all([loadCmsHeroSlides(), loadMediaAssets()])

  if (slides === "offline") return (
    <div>
      <OpsHeading kicker="Content" title="Hero slides" body="Manage the slides that appear on the public homepage hero carousel." />
      <OpsOffline />
    </div>
  )

  return (
    <div>
      <OpsHeading
        kicker="Content"
        title="Hero slides"
        body="Add, edit, and reorder homepage slides. Pick a still from the media library; optionally add a muted looping video. Phones and slow connections fall back to the still."
      />
      <HeroSlidesManager
        initialSlides={slides}
        mediaAssets={media === "offline" ? [] : media}
        canWrite={canWrite}
      />
    </div>
  )
}
