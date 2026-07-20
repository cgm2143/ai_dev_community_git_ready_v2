'use client';

import { useCategories } from '@/features/boards/hooks/useCategories';
import { CategoryColumn } from './CategoryColumn';
import { HomeSection } from './HomeSection';

/** 카테고리별 최신글 - 상단 주요 카테고리(primary)를 탭 전환 없이 그리드로 동시에 노출. */
export function CategoryLatestSection() {
  const { data: categories } = useCategories();
  const primary = (categories ?? []).filter((category) => category.isPrimaryMenu).slice(0, 6);

  return (
    <HomeSection title="카테고리별 최신글" icon="🗂️">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {primary.map((category) => (
          <CategoryColumn key={category.id} slug={category.slug} name={category.name} icon={category.icon} />
        ))}
      </div>
    </HomeSection>
  );
}
