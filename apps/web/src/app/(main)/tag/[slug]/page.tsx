import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { TagView } from './TagView';

type Params = { slug: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const tag = decodeURIComponent(params.slug);
  const url = `${SITE_URL}/tag/${params.slug}`;
  const description = `'${tag}' 태그가 달린 게시글 모음 — ${SITE_NAME}`;
  return {
    title: `#${tag} — ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `#${tag}`, description, url, siteName: SITE_NAME },
    twitter: { card: 'summary', title: `#${tag}`, description },
  };
}

export default function Page({ params }: { params: Params }) {
  return <TagView slug={params.slug} />;
}
