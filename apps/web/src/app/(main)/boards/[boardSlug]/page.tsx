import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/server-api';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import type { BoardSummary } from '@/features/boards/api/boards.api';
import { BoardView } from './BoardView';

type Params = { boardSlug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const board = await serverGet<BoardSummary>(`/boards/${params.boardSlug}`);
  if (!board) return { title: `게시판을 찾을 수 없습니다 — ${SITE_NAME}` };
  const url = `${SITE_URL}/boards/${params.boardSlug}`;
  const description = board.description || `${board.name} 게시판 — ${SITE_NAME}`;
  return {
    title: `${board.name} — ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: board.name, description, url, siteName: SITE_NAME },
    twitter: { card: 'summary', title: board.name, description },
  };
}

export default async function Page({ params }: { params: Params }) {
  const board = await serverGet<BoardSummary>(`/boards/${params.boardSlug}`);
  if (!board) notFound();
  return <BoardView boardSlug={params.boardSlug} />;
}
