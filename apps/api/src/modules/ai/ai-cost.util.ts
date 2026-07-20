/**
 * 모델별 추정 단가(USD / 1M tokens). 관측 로그의 estimatedCost 계산에만 사용하는 근사치이며,
 * 실제 청구액과 다를 수 있다. 새 모델을 쓰면 여기에 단가를 추가한다(없으면 DEFAULT_PRICING 사용).
 */
interface ModelPricing {
  input: number;
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
};

const DEFAULT_PRICING: ModelPricing = { input: 1, output: 5 };

/** 입력/출력 토큰과 모델명으로 추정 비용(USD)을 계산한다. */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  // 소수점 8자리로 반올림(초저비용 호출도 0으로 뭉개지지 않도록).
  return Math.round(cost * 1e8) / 1e8;
}
