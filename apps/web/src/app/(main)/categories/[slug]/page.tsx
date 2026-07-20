import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/server-api';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import type { CategoryWithBoards } from '@/features/boards/api/boards.api';
import { CategoryView } from './CategoryView';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const categories = await serverGet<CategoryWithBoards[]>(`/categories`);
  const category = categories?.find((item) => item.slug === params.slug);
  if (!category) return { title: `카테고리를 찾을 수 없습니다 — ${SITE_NAME}` };
  const url = `${SITE_URL}/categories/${params.slug}`;
  const description = `${category.name} 카테고리의 게시판과 최신 글 — ${SITE_NAME}`;
  return {
    title: `${category.name} — ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: category.name, description, url, siteName: SITE_NAME },
    twitter: { card: 'summary', title: category.name, description },
  };
}

export default async function Page({ params }: { params: Params }) {
  const categories = await serverGet<CategoryWithBoards[]>(`/categories`);
  const category = categories?.find((item) => item.slug === params.slug);
  if (!category) notFound();
  return <CategoryView slug={params.slug} />;
}
