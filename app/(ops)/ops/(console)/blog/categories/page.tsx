import Link from "next/link"
import { CategoryManager } from "@/components/ops/blog/category-manager"
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { loadBlogCategories } from "@/lib/blog-admin"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

export const metadata = {
  title: "Blog categories · Ops · Ice Age Expeditions",
  robots: { index: false },
}

export default async function BlogCategoriesPage() {
  const staff = await requireOpsStaff()
  const canWrite = staffHasPermission(staff.role, StaffPermission.blogWrite)
  const categories = await loadBlogCategories()

  return (
    <div>
      <Link href="/ops/blog" className="inline-flex min-h-11 items-center text-sm font-semibold text-alpine-deep underline">
        ← All posts
      </Link>
      <OpsHeading
        kicker="Blog"
        title="Categories"
        body="Categories are the topic chips on the public blog. Keep the list short; use tags for specific passes, regions, and gear."
      />
      <div className="mt-8">{categories === "offline" ? <OpsOffline /> : <CategoryManager categories={categories} canWrite={canWrite} />}</div>
    </div>
  )
}
