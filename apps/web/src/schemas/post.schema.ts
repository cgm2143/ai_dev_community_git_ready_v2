import { z } from 'zod';

export const postFormSchema = z.object({
  boardId: z.string().min(1, '게시판을 선택해 주세요.'),
  title: z
    .string()
    .min(1, '제목을 입력해 주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  content: z.string().min(1, '본문을 입력해 주세요.'),
  tags: z.array(z.string().max(30)).max(5, '태그는 최대 5개까지 등록할 수 있습니다.').optional(),
});
export type PostFormValues = z.infer<typeof postFormSchema>;

export const commentFormSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해 주세요.')
    .max(2000, '댓글은 2000자 이하여야 합니다.'),
});
export type CommentFormValues = z.infer<typeof commentFormSchema>;
