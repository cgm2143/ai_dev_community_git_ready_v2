import { Injectable } from '@nestjs/common';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

/**
 * 공통 Markdown 렌더링 서비스. Posts뿐 아니라 Comments(5단계)에서도 재사용한다.
 *
 * - `content_html`은 렌더링 결과를 캐싱해 매 조회마다 다시 파싱하지 않도록 저장한다
 *   (6단계 DB 설계에서 확정한 정책).
 * - 사용자가 입력한 Markdown 안에 `<script>`, `onerror=` 같은 원시 HTML/이벤트 핸들러가
 *   섞여 있어도, sanitize-html이 허용 목록(allowlist)에 없는 태그/속성을 전부 제거하므로
 *   XSS 공격 벡터가 되지 않는다. allowlist에는 코드블록/이미지/링크 등 게시판 콘텐츠에
 *   흔히 필요한 태그만 포함시켰다.
 */
@Injectable()
export class MarkdownService {
  private readonly md = new MarkdownIt({
    html: false, // 원시 HTML 태그 자체를 파싱 단계에서부터 허용하지 않는다 (1차 방어선)
    linkify: true,
    breaks: true,
  });

  render(markdown: string): string {
    const rawHtml = this.md.render(markdown);
    return this.sanitize(rawHtml);
  }

  private sanitize(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'del', 's', 'blockquote',
        'ul', 'ol', 'li',
        'a', 'img',
        'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'], // 코드 하이라이팅 언어 클래스(예: language-ts)만 허용
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      // 외부 링크에 rel="noopener noreferrer"를 강제해 window.opener를 통한 탈취(tabnabbing)를 방지
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      },
    });
  }
}
