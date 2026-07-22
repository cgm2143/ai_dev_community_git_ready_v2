'use client';

import * as React from 'react';
import {
  useAdminBoards,
  useAdminCategories,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
} from '@/features/admin/hooks/useAdmin';
import type { AdminBoard, AdminCategory, UpdateBoardPayload } from '@/features/admin/api/admin.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SLUG_NOTICE = 'Slug 변경 시 기존 URL이 변경될 수 있습니다.';

const selectClass =
  'h-9 rounded-md border border-border-hairline bg-bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary';

/** 편집 중인 행의 로컬 상태(순서는 입력 편의를 위해 문자열로 다룬다). */
type Draft = {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_DRAFT: Draft = { categoryId: '', name: '', slug: '', description: '', sortOrder: '0', isActive: true };

function toDraft(board: AdminBoard): Draft {
  return {
    categoryId: board.categoryId,
    name: board.name,
    slug: board.slug,
    description: board.description ?? '',
    sortOrder: String(board.sortOrder),
    isActive: board.isActive,
  };
}

/** 서버 값과 달라진 필드만 추려 PATCH payload를 만든다. 바뀐 게 없으면 null. */
function diff(board: AdminBoard, draft: Draft): UpdateBoardPayload | null {
  const payload: UpdateBoardPayload = {};
  const name = draft.name.trim();
  const slug = draft.slug.trim();
  const description = draft.description.trim();
  const order = Number(draft.sortOrder) || 0;

  if (draft.categoryId !== board.categoryId) payload.categoryId = draft.categoryId;
  if (name !== board.name) payload.name = name;
  if (slug !== board.slug) payload.slug = slug;
  if (description !== (board.description ?? '')) payload.description = description;
  if (order !== board.sortOrder) payload.sortOrder = order;
  if (draft.isActive !== board.isActive) payload.isActive = draft.isActive;

  return Object.keys(payload).length > 0 ? payload : null;
}

/** 상단 "새 게시판" 생성 폼. 생성은 일괄 저장과 무관하게 즉시 POST 된다. */
function CreateBoardForm({ categories }: { categories: AdminCategory[] }) {
  const createMutation = useCreateBoard();
  const [form, setForm] = React.useState<Draft>({ ...EMPTY_DRAFT, categoryId: categories[0]?.id ?? '' });

  // 카테고리 목록이 처음 로드되면 기본 선택값을 채운다.
  React.useEffect(() => {
    const first = categories[0];
    if (!form.categoryId && first) setForm((prev) => ({ ...prev, categoryId: first.id }));
  }, [categories, form.categoryId]);

  const canSubmit = form.categoryId && form.name.trim() && form.slug.trim() && !createMutation.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    await createMutation.mutateAsync({
      categoryId: form.categoryId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
    });
    // 성공 후 입력 초기화(카테고리 선택은 유지해 연속 생성 편의).
    setForm((prev) => ({ ...EMPTY_DRAFT, categoryId: prev.categoryId }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 게시판 추가</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          카테고리
          <select
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className={selectClass}
            aria-label="새 게시판 카테고리"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          이름
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-40"
            placeholder="ChatGPT"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Slug
          <Input
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            className="w-40 font-mono text-xs"
            placeholder="ai-chatgpt"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          설명
          <Input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-52"
            placeholder="(선택)"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          순서
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            className="w-20"
          />
        </label>
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {createMutation.isPending ? '추가 중...' : '게시판 추가'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminBoardsPage() {
  const { data: boards, isLoading } = useAdminBoards();
  const { data: categories } = useAdminCategories();
  const updateMutation = useUpdateBoard();
  const deleteMutation = useDeleteBoard();

  const categoryList = React.useMemo(() => categories ?? [], [categories]);
  const categoryName = (id: string) => categoryList.find((c) => c.id === id)?.name ?? '(없음)';

  // 게시판별 편집 상태. 서버 데이터가 갱신되면(refetch) 최신값으로 다시 맞춘다.
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  React.useEffect(() => {
    if (!boards) return;
    setDrafts(Object.fromEntries(boards.map((b) => [b.id, toDraft(b)])));
  }, [boards]);

  const patch = (id: string, part: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), ...part } }));
  };

  // 서버 값과 다른 행만 저장 대상으로 추린다.
  const changes = React.useMemo(() => {
    if (!boards) return [];
    return boards
      .map((board) => ({ id: board.id, payload: diff(board, drafts[board.id] ?? toDraft(board)) }))
      .filter((c): c is { id: string; payload: UpdateBoardPayload } => c.payload !== null);
  }, [boards, drafts]);

  const [saving, setSaving] = React.useState(false);
  const saveAll = async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      // dirty row만 기존 PATCH /admin/boards/:id 로 일괄 저장.
      await Promise.all(changes.map((c) => updateMutation.mutateAsync({ id: c.id, payload: c.payload })));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (board: AdminBoard) => {
    if (window.confirm(`게시판 "${board.name}"을(를) 삭제할까요? (게시글이 있으면 삭제가 거부됩니다.)`)) {
      deleteMutation.mutate(board.id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-text-primary">게시판 관리</h1>
        <p className="mt-1 text-sm text-text-secondary">
          게시판을 생성·수정·삭제하고 소속 카테고리를 이동합니다. 표에서 값을 바꾼 뒤 하단 &quot;일괄 저장&quot;으로 한 번에 반영합니다.
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{SLUG_NOTICE}</p>
      </div>

      {categoryList.length > 0 && <CreateBoardForm categories={categoryList} />}

      <Card>
        <CardHeader>
          <CardTitle>게시판 목록</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}

          {boards && boards.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                    <th className="px-2 py-2 font-medium">카테고리</th>
                    <th className="px-2 py-2 font-medium">이름</th>
                    <th className="px-2 py-2 font-medium">Slug</th>
                    <th className="px-2 py-2 font-medium">설명</th>
                    <th className="px-2 py-2 text-center font-medium">순서</th>
                    <th className="px-2 py-2 text-center font-medium">활성</th>
                    <th className="px-2 py-2 text-center font-medium">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board) => {
                    const draft = drafts[board.id] ?? toDraft(board);
                    return (
                      <tr key={board.id} className="border-b border-border-hairline last:border-0">
                        <td className="px-2 py-2">
                          <select
                            value={draft.categoryId}
                            onChange={(e) => patch(board.id, { categoryId: e.target.value })}
                            className={selectClass}
                            aria-label={`${board.name} 카테고리`}
                          >
                            {categoryList.length === 0 && <option value={draft.categoryId}>{categoryName(draft.categoryId)}</option>}
                            {categoryList.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={draft.name}
                            onChange={(e) => patch(board.id, { name: e.target.value })}
                            className="min-w-[8rem]"
                            aria-label={`${board.name} 이름`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={draft.slug}
                            onChange={(e) => patch(board.id, { slug: e.target.value })}
                            className="min-w-[8rem] font-mono text-xs"
                            aria-label={`${board.name} slug`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={draft.description}
                            onChange={(e) => patch(board.id, { description: e.target.value })}
                            className="min-w-[10rem]"
                            aria-label={`${board.name} 설명`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            value={draft.sortOrder}
                            onChange={(e) => patch(board.id, { sortOrder: e.target.value })}
                            className="mx-auto w-16 text-center"
                            aria-label={`${board.name} 순서`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(e) => patch(board.id, { isActive: e.target.checked })}
                            className="h-4 w-4 accent-accent-primary-strong"
                            aria-label={`${board.name} 활성`}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(board)}
                            disabled={deleteMutation.isPending}
                          >
                            삭제
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {boards?.length === 0 && <p className="text-sm text-text-muted">게시판이 없습니다.</p>}

          {boards && boards.length > 0 && (
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
