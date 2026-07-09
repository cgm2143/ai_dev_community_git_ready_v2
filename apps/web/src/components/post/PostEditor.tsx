'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { marked } from 'marked';
import { postFormSchema, type PostFormValues } from '@/schemas/post.schema';
import { useCategories } from '@/features/boards/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-error';

interface PostEditorProps {
  defaultValues?: Partial<PostFormValues>;
  onSubmit: (values: PostFormValues) => void;
  isSubmitting?: boolean;
  error?: unknown;
  submitLabel: string;
}

/**
 * 작성/수정 화면 공용 에디터. 미리보기는 클라이언트에서 marked로 즉석 렌더링하지만,
 * 이는 어디까지나 작성 중 미리보기용이다 - 실제 저장/표시되는 본문(contentHtml)은
 * 백엔드 MarkdownService(markdown-it + sanitize-html)가 서버에서 다시 렌더링/정화한 결과이므로,
 * 여기서의 미리보기가 최종 표시와 100% 동일하지 않을 수 있다(허용 태그 등 정책 차이).
 */
export function PostEditor({ defaultValues, onSubmit, isSubmitting, error, submitLabel }: PostEditorProps) {
  const { data: categories } = useCategories();
  const [tagsInput, setTagsInput] = React.useState(defaultValues?.tags?.join(', ') ?? '');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { boardId: '', title: '', content: '', tags: [], ...defaultValues },
  });

  const content = watch('content');
  const previewHtml = React.useMemo(() => (content ? marked.parse(content, { async: false }) : ''), [content]);

  const submit = handleSubmit((values) => {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5);
    onSubmit({ ...values, tags });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="boardId">게시판</Label>
        <Controller
          control={control}
          name="boardId"
          render={({ field }) => (
            <select
              id="boardId"
              {...field}
              className="h-10 rounded-md border border-border-hairline bg-bg-surface px-3 text-sm text-text-primary"
            >
              <option value="">게시판을 선택하세요</option>
              {categories?.map((category) => (
                <optgroup key={category.id} label={category.name}>
                  {category.boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        />
        {errors.boardId && <p className="text-xs text-accent-danger">{errors.boardId.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">제목</Label>
        <Input id="title" {...register('title')} placeholder="제목을 입력하세요" />
        {errors.title && <p className="text-xs text-accent-danger">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="content">본문 (Markdown)</Label>
          <textarea
            id="content"
            {...register('content')}
            rows={16}
            placeholder={'## 소제목\n본문을 Markdown으로 작성하세요.'}
            className="w-full resize-none rounded-md border border-border-hairline bg-bg-surface p-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
          {errors.content && <p className="text-xs text-accent-danger">{errors.content.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>미리보기</Label>
          <div
            className="prose prose-sm h-[26rem] max-w-none overflow-y-auto rounded-md border border-border-hairline bg-bg-surface-muted p-3 text-text-primary"
            dangerouslySetInnerHTML={{ __html: previewHtml as string }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tags">태그 (쉼표로 구분, 최대 5개)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="nestjs, typescript"
        />
      </div>

      {error !== undefined && (
        <p className="rounded-md bg-accent-danger/10 px-3 py-2 text-xs text-accent-danger">
          {error instanceof ApiError ? error.message : '저장 중 문제가 발생했습니다.'}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
