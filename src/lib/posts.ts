import { getCollection } from 'astro:content'

export const slugifyTag = (tag: string) =>
  tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export async function getPublishedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}

export function getTags<T extends { data: { tags: string[] } }>(posts: T[]) {
  const tags = new Map<string, number>()

  for (const post of posts) {
    for (const tag of post.data.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1)
  }

  return [...tags]
    .map(([name, count]) => ({ name, count, slug: slugifyTag(name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
