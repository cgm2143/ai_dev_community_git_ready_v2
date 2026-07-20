import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/server-api';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import type { PostDetail } from '@/features/posts/api/posts.api';
import { PostDetailView } from './PostDetailView';

type Params = { boardSlug: string; postId: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await serverGet<PostDetail>(`/posts/${params.postId}`);
  if (!post) return { title: `게시글을 찾을 수 없습니다 — ${SITE_NAME}` };
  const url = `${SITE_URL}/boards/${params.boardSlug}/${params.postId}`;
  const description = (post.excerpt || post.title).slice(0, 160);
  return {
    title: `${post.title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: post.title, description, url, type: 'article', siteName: SITE_NAME },
    twitter: { card: 'summary', title: post.title, description },
  };
}

export default async function Page({ params }: { params: Params }) {
  const post = await serverGet<PostDetail>(`/posts/${params.postId}`);
  if (!post) notFound();
  return <PostDetailView postId={params.postId} />;
}
