import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';
import type { CategoryWithBoards } from '@/features/boards/api/boards.api';
import type { PostListItem } from '@/features/posts/api/posts.api';
import { FEATURE_HUBS } from '@/features/home/hubs';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entry = (path: string) => ({ url: `${SITE_URL}${path}`, lastModified: now });

  const staticRoutes = ['', '/hot', '/terms', '/privacy'].map(entry);
  const hubRoutes = FEATURE_HUBS.map((hub) => entry(`/hub/${hub.key}`));

  const categories = (await serverGet<CategoryWithBoards[]>('/categories')) ?? [];
  const categoryRoutes = categories.map((category) => entry(`/categories/${category.slug}`));
  const boardRoutes = categories.flatMap((category) => category.boards.map((board) => entry(`/boards/${board.slug}`)));

  const recent = await serverGet<{ items: PostListItem[] }>('/posts?limit=100&sort=latest');
  const postRoutes = (recent?.items ?? []).map((post) => entry(`/boards/${post.boardSlug}/${post.id}`));

  return [...staticRoutes, ...hubRoutes, ...categoryRoutes, ...boardRoutes, ...postRoutes];
}
