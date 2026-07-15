'use client';

import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import { usePosts } from '@/features/posts/hooks/usePosts';
import { PostList } from '@/components/post/PostList';
import { AdSlot } from '@/components/ads/AdSlot';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { data, isLoading, isError } = usePosts({ sort: 'latest', limit: 20 });

  return (
    <>
      <AdSlot slotCode="HEADER_TOP" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-text-primary">최신 글</h1>
        <Button variant="primary" size="sm" asChild>
          <Link href="/write">
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Link>
        </Button>
      </div>

      <PostList items={data?.items} isLoading={isLoading} isError={isError} />
    </>
  );
}
