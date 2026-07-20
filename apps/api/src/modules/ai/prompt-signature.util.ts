import { createHash } from 'node:crypto';

/**
 * 프롬프트 시그니처(version + hash). 캐시 자동 무효화의 기준값이다.
 * - version: 운영자가 명시적으로 올리는 값(SUMMARY_PROMPT_VERSION 등).
 * - hash: (version + 템플릿 문자열) SHA-256. 템플릿을 코드에서 수정하면 version을 안 올려도 해시가 바뀌어 캐시가 무효화된다.
 */
export interface PromptSignature {
  version: string;
  hash: string;
}

export function buildPromptSignature(version: string, template: string): PromptSignature {
  const hash = createHash('sha256').update(`${version}\n${template}`).digest('hex').slice(0, 16);
  return { version, hash };
}
