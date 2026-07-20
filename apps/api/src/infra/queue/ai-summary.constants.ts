export const AI_SUMMARY_QUEUE = Symbol('AI_SUMMARY_QUEUE');

export const AI_SUMMARY_QUEUE_NAME = 'ai-summary';

export const AI_SUMMARY_JOB_NAME = 'generate-summary';

/** AI 요약 생성 작업 페이로드. postId 하나만 넘기고, 실제 원문/모델 호출은 Worker에서 처리한다. */
export interface AiSummaryJobData {
  postId: string;
}
