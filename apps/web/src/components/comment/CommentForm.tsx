'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { commentFormSchema, type CommentFormValues } from '@/schemas/post.schema';
import { Button } from '@/components/ui/button';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  onSubmit,
  isSubmitting,
  placeholder = '댓글을 남겨보세요.',
  submitLabel = '등록',
  onCancel,
  autoFocus,
}: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({ resolver: zodResolver(commentFormSchema) });

  const submit = handleSubmit((values) => {
    onSubmit(values.content);
    reset();
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        {...register('content')}
        autoFocus={autoFocus}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-md border border-border-hairline bg-bg-surface p-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      />
      {errors.content && <p className="text-xs text-accent-danger">{errors.content.message}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
