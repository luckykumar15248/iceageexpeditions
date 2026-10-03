import Link from "next/link"
import { notFound } from "next/navigation"
import { PostEditor } from "@/components/ops/blog/post-editor"
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame"
import { loadBlogCategories, loadBlogTagNames, loadOpsBlogPost } from "@/lib/blog-admin"
import { formatIstDateTime } from "@/lib/format"
import { loadMediaAssets } from "@/lib/media-assets"
import { requireOpsStaff } from "@/lib/ops-auth"
import { StaffPermission, staffHasPermission } from "@/lib/staff"

export const metadata = {
  title: "Edit post · Ops · Ice Age Expeditions",
  robots: { index: false },
}

export default async function EditBlogPostPage({ params, searchParams }: PageProps<"/ops/blog/[id]">) {
  const staff = await requireOpsStaff()
  const { id } = await params
  const { created } = await searchParams
  const canWrite = staffHasPermission(staff.role, StaffPermission.blogWrite)
  const [post, categories, tags, media] = await Promise.all([
    loadOpsBlogPost(id),
    canWrite ? loadBlogCategories() : Promise.resolve([]),
    canWrite ? loadBlogTagNames() : Promise.resolve([]),
    canWrite ? loadMediaAssets() : Promise.resolve([]),
  ])

  if (post === "offline" || categories === "offline") {
    return (
      <div>
        <OpsHeading kicker="Blog" title="Edit post" body="The post could not be loaded." />
        <OpsOffline />
      </div>
    )
  }
  if (!post) notFound()

  return (
    <div>
      <Link href="/ops/blog" className="inline-flex min-h-11 items-center text-sm font-semibold text-alpine-deep underline">
        ← All posts
      </Link>
      <OpsHeading
        kicker="Blog"
        title={post.input.title || "Untitled post"}
        body={`Created ${formatIstDateTime(post.createdAt)} · last saved ${formatIstDateTime(post.updatedAt)}.`}
      />
      {created === "1" ? (
        <p className="mt-6 rounded-2xl border border-alpine bg-alpine-soft px-4 py-3 text-base text-ink" role="status">
          Post created. Keep editing here; the URL now points to this post.
        </p>
      ) : null}
      <div className="mt-8">
        {canWrite ? (
          <PostEditor
            initial={post.input}
            state={post.state}
            authorName={post.authorName}
            pendingComments={post.pendingComments}
            categories={categories.map((category) => ({ id: category.id, name: category.name }))}
            tagSuggestions={tags}
            mediaAssets={media === "offline" ? [] : media}
          />
        ) : (
          <p className="rounded-2xl border border-line bg-paper px-5 py-4 text-base text-muted">
            This desk role can view posts but cannot edit them. Ask an ops admin or expedition lead.
          </p>
        )}
      </div>
    </div>
  )
}
