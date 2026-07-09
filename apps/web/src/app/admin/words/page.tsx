'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { useBannedWords, useAddBannedWord, useRemoveBannedWord } from '@/features/admin/hooks/useAdmin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminWordsPage() {
  const { data: words, isLoading } = useBannedWords();
  const addMutation = useAddBannedWord();
  const removeMutation = useRemoveBannedWord();
  const [word, setWord] = React.useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    addMutation.mutate(word.trim(), { onSuccess: () => setWord('') });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">금칙어 관리</h1>
      <p className="text-sm text-text-secondary">
        등록한 금칙어는 게시글/댓글 작성·수정 시 즉시 검사되어 포함된 내용은 거부됩니다.
      </p>

      <form onSubmit={handleAdd} className="flex max-w-sm gap-2">
        <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="추가할 금칙어" />
        <Button type="submit" variant="primary" disabled={addMutation.isPending}>
          추가
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
        {words?.map((w) => (
          <span
            key={w.id}
            className="flex items-center gap-1.5 rounded-full bg-bg-surface-muted px-3 py-1.5 text-sm text-text-primary"
          >
            {w.word}
            <button type="button" onClick={() => removeMutation.mutate(w.id)} aria-label={`${w.word} 삭제`}>
              <Trash2 className="h-3.5 w-3.5 text-text-muted hover:text-accent-danger" />
            </button>
          </span>
        ))}
        {words?.length === 0 && <p className="text-sm text-text-muted">등록된 금칙어가 없습니다.</p>}
      </div>
    </div>
  );
}
