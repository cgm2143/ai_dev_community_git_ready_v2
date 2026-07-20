'use client';

import * as React from 'react';
import { useAdminCategories, useUpdateCategory, useResetCategories } from '@/features/admin/hooks/useAdmin';
import type { AdminCategory } from '@/features/admin/api/admin.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function CategoryRow({ category }: { category: AdminCategory }) {
  const updateMutation = useUpdateCategory();
  const [icon, setIcon] = React.useState(category.icon ?? '');
  const [menuOrder, setMenuOrder] = React.useState(String(category.menuOrder));

  // 서버 값이 갱신되면(다른 행 저장 등으로 refetch) 로컬 입력도 최신값으로 맞춘다.
  React.useEffect(() => {
    setIcon(category.icon ?? '');
    setMenuOrder(String(category.menuOrder));
  }, [category.icon, category.menuOrder]);

  const dirty = icon !== (category.icon ?? '') || menuOrder !== String(category.menuOrder);

  const togglePrimary = () => {
    updateMutation.mutate({ id: category.id, payload: { isPrimaryMenu: !category.isPrimaryMenu } });
  };
  const togglePublic = () => {
    updateMutation.mutate({ id: category.id, payload: { isActive: !category.isActive } });
  };
  const saveFields = () => {
    updateMutation.mutate({ id: category.id, payload: { icon, menuOrder: Number(menuOrder) || 0 } });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-hairline p-3">
      <Input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        className="w-16 text-center"
        placeholder="🙂"
        aria-label={`${category.name} 아이콘`}
      />

      <div className="min-w-[7rem] flex-1">
        <p className="text-sm font-medium text-text-primary">{category.name}</p>
        <p className="text-xs text-text-muted">/{category.slug} · 게시판 {category.boards.length}개</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={category.isPrimaryMenu}
          onChange={togglePrimary}
          disabled={updateMutation.isPending}
          className="h-4 w-4 accent-accent-primary-strong"
        />
        상단 메뉴
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={category.isActive}
          onChange={togglePublic}
          disabled={updateMutation.isPending}
          className="h-4 w-4 accent-accent-primary-strong"
        />
        공개
      </label>

      <span
        className={`rounded px-2 py-0.5 text-xs ${
          category.isPrimaryMenu
            ? 'bg-accent-primary-tint text-accent-primary-strong'
            : 'bg-bg-surface-muted text-text-muted'
        }`}
      >
        {category.isPrimaryMenu ? '상단 GNB' : '더보기'}
      </span>

      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={menuOrder}
          onChange={(e) => setMenuOrder(e.target.value)}
          className="w-16"
          aria-label={`${category.name} 순서`}
        />
        <Button variant="outline" size="sm" onClick={saveFields} disabled={!dirty || updateMutation.isPending}>
          저장
        </Button>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories();
  const resetMutation = useResetCategories();

  const handleReset = () => {
    if (window.confirm('카테고리/게시판을 기본 시드로 초기화할까요? 시드에 없는 빈 카테고리는 정리됩니다.')) {
      resetMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">카테고리 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            &quot;상단 메뉴&quot; 체크를 켜면 상단 GNB에, 끄면 &quot;더보기&quot;에 표시됩니다. &quot;공개&quot;를 끄면 네비게이션에서 숨겨집니다. 순서 숫자가 작을수록 앞에 옵니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending}>
          {resetMutation.isPending ? '초기화 중...' : '기본값으로 초기화'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>메뉴 카테고리</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
          {categories?.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
          {categories?.length === 0 && <p className="text-sm text-text-muted">카테고리가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
