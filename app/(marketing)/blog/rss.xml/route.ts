import { listBlogFeed } from "@/lib/blog"
import { getSiteUrl } from "@/lib/site"

export const revalidate = 300

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const site = getSiteUrl()
  const posts = (await listBlogFeed()).slice(0, 30)
  const items = posts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(`${site}/blog/${post.slug}`)}</link>
      <guid isPermaLink="true">${xml(`${site}/blog/${post.slug}`)}</guid>
      <pubDate>${new Date(post.publishedAtIso).toUTCString()}</pubDate>
      <description>${xml(post.excerpt)}</description>${post.categoryName ? `\n      <category>${xml(post.categoryName)}</category>` : ""}
    </item>`,
    )
    .join("\n")

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ice Age Expeditions journal</title>
    <link>${xml(`${site}/blog`)}</link>
    <atom:link href="${xml(`${site}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>Route notes, acclimatization advice, riding skills, and gear lessons from Himalayan 4x4 SUV and motorbike expeditions.</description>
    <language>en-IN</language>${posts[0] ? `\n    <lastBuildDate>${new Date(posts[0].publishedAtIso).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
