import Link from "next/link"
import { PostEditor } from "@/components/ops/blog/post-editor"
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { loadBlogCategories, loadBlogTagNames } from "@/lib/blog-admin"
import type { BlogPostInput } from "@/lib/blog-schema"
import { loadMediaAssets } from "@/lib/media-assets"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

export const metadata = {
  title: "New post · Ops · Ice Age Expeditions",
  robots: { index: false },
}

const EMPTY_POST: BlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  categoryId: "",
  tags: [],
  featuredImageUrl: "",
  featuredImageAlt: "",
  featuredMediaId: "",
  metaTitle: "",
  metaDescription: "",
  robotsIndex: true,
  featured: false,
  commentsEnabled: true,
  publishAtIso: "",
}

export default async function NewBlogPostPage() {
  const staff = await requireOpsStaff()
  if (!staffHasPermission(staff.role, StaffPermission.blogWrite)) {
    return (
      <div>
        <OpsHeading kicker="Blog" title="New post" body="This desk role can read the blog list but cannot write posts. Ask an ops admin or expedition lead." />
        <Link href="/ops/blog" className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-alpine-deep underline">
          Back to posts
        </Link>
      </div>
    )
  }

  const [categories, tags, media] = await Promise.all([loadBlogCategories(), loadBlogTagNames(), loadMediaAssets()])
  if (categories === "offline") {
    return (
      <div>
        <OpsHeading kicker="Blog" title="New post" body="Write a journal article. Nothing is public until you publish." />
        <OpsOffline />
      </div>
    )
  }

  return (
    <div>
      <Link href="/ops/blog" className="inline-flex min-h-11 items-center text-sm font-semibold text-alpine-deep underline">
        ← All posts
      </Link>
      <OpsHeading kicker="Blog" title="New post" body="Write a journal article. Nothing is public until you publish. Check every altitude, pass name, and permit statement against ops notes." />
      <div className="mt-8">
        <PostEditor
          initial={EMPTY_POST}
          state="new"
          authorName={staff.name}
          pendingComments={0}
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          tagSuggestions={tags}
          mediaAssets={media === "offline" ? [] : media}
        />
      </div>
    </div>
  )
}
