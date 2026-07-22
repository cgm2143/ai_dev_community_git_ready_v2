'use client';

import * as React from 'react';
import { useAdminCategories, useUpdateCategory, useResetCategories } from '@/features/admin/hooks/useAdmin';
import type { AdminCategory, UpdateCategoryPayload } from '@/features/admin/api/admin.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** 편집 중인 행의 로컬 상태(문자열로 다뤄 입력 중 자유롭게 수정 가능). */
type Draft = {
  icon: string;
  name: string;
  slug: string;
  isPrimaryMenu: boolean;
  menuOrder: string;
  isActive: boolean;
};

const EMPTY_DRAFT: Draft = { icon: '', name: '', slug: '', isPrimaryMenu: false, menuOrder: '0', isActive: true };

function toDraft(category: AdminCategory): Draft {
  return {
    icon: category.icon ?? '',
    name: category.name,
    slug: category.slug,
    isPrimaryMenu: category.isPrimaryMenu,
    menuOrder: String(category.menuOrder),
    isActive: category.isActive,
  };
}

/** 서버 값과 달라진 필드만 추려 PATCH payload를 만든다. 바뀐 게 없으면 null. */
function diff(category: AdminCategory, draft: Draft): UpdateCategoryPayload | null {
  const payload: UpdateCategoryPayload = {};
  const trimmedIcon = draft.icon.trim();
  const trimmedName = draft.name.trim();
  const trimmedSlug = draft.slug.trim();
  const order = Number(draft.menuOrder) || 0;

  if (trimmedIcon !== (category.icon ?? '')) payload.icon = trimmedIcon;
  if (trimmedName !== category.name) payload.name = trimmedName;
  if (trimmedSlug !== category.slug) payload.slug = trimmedSlug;
  if (draft.isPrimaryMenu !== category.isPrimaryMenu) payload.isPrimaryMenu = draft.isPrimaryMenu;
  if (order !== category.menuOrder) payload.menuOrder = order;
  if (draft.isActive !== category.isActive) payload.isActive = draft.isActive;

  return Object.keys(payload).length > 0 ? payload : null;
}

export default function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories();
  const updateMutation = useUpdateCategory();
  const resetMutation = useResetCategories();

  // 카테고리별 편집 상태. 서버 데이터가 갱신되면(refetch) 최신값으로 다시 맞춘다.
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  React.useEffect(() => {
    if (!categories) return;
    setDrafts(Object.fromEntries(categories.map((c) => [c.id, toDraft(c)])));
  }, [categories]);

  const patch = (id: string, part: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), ...part } }));
  };

  // 서버 값과 다른 행만 저장 대상으로 추린다.
  const changes = React.useMemo(() => {
    if (!categories) return [];
    return categories
      .map((category) => ({ id: category.id, payload: diff(category, drafts[category.id] ?? toDraft(category)) }))
      .filter((c): c is { id: string; payload: UpdateCategoryPayload } => c.payload !== null);
  }, [categories, drafts]);

  const [saving, setSaving] = React.useState(false);
  const saveAll = async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      // dirty row만 기존 PATCH /admin/categories/:id 로 일괄 저장.
      await Promise.all(changes.map((c) => updateMutation.mutateAsync({ id: c.id, payload: c.payload })));
    } finally {
      setSaving(false);
    }
  };

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
            이름·slug·순서를 바꾸고 &quot;상단노출&quot;/&quot;상태&quot; 체크로 노출을 조정한 뒤, 하단 &quot;일괄 저장&quot;으로 한 번에 반영합니다. 순서 숫자가 작을수록 앞에 옵니다.
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
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}

          {categories && categories.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                    <th className="px-2 py-2 text-center font-medium">아이콘</th>
                    <th className="px-2 py-2 font-medium">이름</th>
                    <th className="px-2 py-2 font-medium">Slug</th>
                    <th className="px-2 py-2 text-center font-medium">상단노출</th>
                    <th className="px-2 py-2 text-center font-medium">순서</th>
                    <th className="px-2 py-2 text-center font-medium">상태(공개)</th>
                    <th className="px-2 py-2 font-medium">게시판</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const draft = drafts[category.id] ?? toDraft(category);
                    return (
                      <tr key={category.id} className="border-b border-border-hairline last:border-0">
                        <td className="px-2 py-2 text-center">
                          <Input
                            value={draft.icon}
                            onChange={(e) => patch(category.id, { icon: e.target.value })}
                            className="w-14 text-center"
                            placeholder="🙂"
                            aria-label={`${category.name} 아이콘`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={draft.name}
                            onChange={(e) => patch(category.id, { name: e.target.value })}
                            className="min-w-[8rem]"
                            aria-label={`${category.name} 이름`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={draft.slug}
                            onChange={(e) => patch(category.id, { slug: e.target.value })}
                            className="min-w-[8rem] font-mono text-xs"
                            aria-label={`${category.name} slug`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={draft.isPrimaryMenu}
                            onChange={(e) => patch(category.id, { isPrimaryMenu: e.target.checked })}
                            className="h-4 w-4 accent-accent-primary-strong"
                            aria-label={`${category.name} 상단노출`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            value={draft.menuOrder}
                            onChange={(e) => patch(category.id, { menuOrder: e.target.value })}
                            className="mx-auto w-16 text-center"
                            aria-label={`${category.name} 순서`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(e) => patch(category.id, { isActive: e.target.checked })}
                            className="h-4 w-4 accent-accent-primary-strong"
                            aria-label={`${category.name} 공개`}
                          />
                        </td>
                        <td className="px-2 py-2 text-xs text-text-muted">{category.boards.length}개</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {categories?.length === 0 && <p className="text-sm text-text-muted">카테고리가 없습니다.</p>}

          {categories && categories.length > 0 && (
            <div className="flex items-center justify-end gap-3 pt-1">
              <span className="text-xs text-text-muted">
                {changes.length > 0 ? `변경된 항목 ${changes.length}개` : '변경 사항 없음'}
              </span>
              <Button size="sm" onClick={saveAll} disabled={changes.length === 0 || saving}>
                {saving ? '저장 중...' : '일괄 저장'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
