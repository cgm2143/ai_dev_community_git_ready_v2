import { HttpException } from '@nestjs/common';
import { ErrorCode, ERROR_CODE_STATUS_MAP } from '../constants/error-codes';

/**
 * 모든 도메인 서비스는 NestJS의 NotFoundException 등을 직접 던지지 않고
 * 이 AppException을 통해 표준 에러 코드를 포함시켜 던진다.
 * HttpExceptionFilter가 이를 감지해 공통 에러 응답 포맷으로 변환한다.
 */
export class AppException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message?: string, details?: unknown) {
    const status = ERROR_CODE_STATUS_MAP[errorCode];
    super(
      {
        code: errorCode,
        message: message ?? AppException.defaultMessage(errorCode),
        details: details ?? null,
      },
      status,
    );
    this.errorCode = errorCode;
  }

  private static defaultMessage(code: ErrorCode): string {
    const messages: Partial<Record<ErrorCode, string>> = {
      [ErrorCode.USER_NOT_FOUND]: '사용자를 찾을 수 없습니다.',
      [ErrorCode.POST_NOT_FOUND]: '게시글을 찾을 수 없습니다.',
      [ErrorCode.COMMENT_NOT_FOUND]: '댓글을 찾을 수 없습니다.',
      [ErrorCode.BOARD_NOT_FOUND]: '게시판을 찾을 수 없습니다.',
      [ErrorCode.CATEGORY_NOT_FOUND]: '카테고리를 찾을 수 없습니다.',
      [ErrorCode.CATEGORY_SLUG_ALREADY_EXISTS]: '이미 사용 중인 카테고리 slug입니다.',
      [ErrorCode.BOARD_SLUG_ALREADY_EXISTS]: '이미 사용 중인 게시판 slug입니다.',
      [ErrorCode.CATEGORY_HAS_BOARDS]: '하위 게시판이 있는 카테고리는 삭제할 수 없습니다.',
      [ErrorCode.BOARD_HAS_POSTS]: '게시글이 있는 게시판은 삭제할 수 없습니다.',
      [ErrorCode.ATTACHMENT_NOT_FOUND]: '첨부파일을 찾을 수 없습니다.',
      [ErrorCode.ATTACHMENT_ALREADY_LINKED]: '이미 다른 게시글에 연결된 첨부파일입니다.',
      [ErrorCode.TOO_MANY_TAGS]: '태그는 최대 5개까지 등록할 수 있습니다.',
      [ErrorCode.POST_NOT_DELETED]: '삭제된 게시글만 복구할 수 있습니다.',
      [ErrorCode.COMMENT_NOT_DELETED]: '삭제된 댓글만 복구할 수 있습니다.',
      [ErrorCode.INVALID_PARENT_COMMENT]: '대댓글은 최상위 댓글에만 작성할 수 있습니다.',
      [ErrorCode.PARENT_POST_DELETED]: '게시글이 삭제된 상태입니다. 게시글을 먼저 복구한 뒤 댓글을 복구해 주세요.',
      [ErrorCode.INVALID_REACTION_TARGET]: '반응을 남길 수 없는 대상입니다.',
      [ErrorCode.REACTION_TYPE_NOT_SUPPORTED]: '댓글에는 추천만 가능하며 비추천은 지원하지 않습니다.',
      [ErrorCode.NOTIFICATION_NOT_FOUND]: '알림을 찾을 수 없습니다.',
      [ErrorCode.REPORT_NOT_FOUND]: '신고 내역을 찾을 수 없습니다.',
      [ErrorCode.ALREADY_REPORTED]: '이미 신고한 대상입니다. 처리 결과를 기다려 주세요.',
      [ErrorCode.CANNOT_REPORT_SELF]: '자기 자신을 신고할 수 없습니다.',
      [ErrorCode.INVALID_REPORT_TARGET]: '신고할 수 없는 대상입니다.',
      [ErrorCode.REPORT_ALREADY_RESOLVED]: '이미 처리된 신고입니다.',
      [ErrorCode.ROLE_NOT_FOUND]: '존재하지 않는 역할입니다.',
      [ErrorCode.CANNOT_MODIFY_SELF_ROLE]: '본인의 역할은 스스로 변경할 수 없습니다.',
      [ErrorCode.CANNOT_GRANT_SUPER_ADMIN]: 'SUPER_ADMIN 권한은 SUPER_ADMIN만 부여할 수 있습니다.',
      [ErrorCode.BANNED_WORD_ALREADY_EXISTS]: '이미 등록된 금칙어입니다.',
      [ErrorCode.BANNED_WORD_NOT_FOUND]: '금칙어를 찾을 수 없습니다.',
      [ErrorCode.IP_ALREADY_BANNED]: '이미 차단된 IP입니다.',
      [ErrorCode.IP_BAN_NOT_FOUND]: '차단 내역을 찾을 수 없습니다.',
      [ErrorCode.SETTING_NOT_FOUND]: '설정 항목을 찾을 수 없습니다.',
      [ErrorCode.SOCIAL_PROVIDER_NOT_CONFIGURED]: '현재 이 소셜 로그인은 준비 중입니다.',
      [ErrorCode.AD_SLOT_NOT_FOUND]: '광고 슬롯을 찾을 수 없습니다.',
      [ErrorCode.AD_NOT_FOUND]: '광고를 찾을 수 없습니다.',
      [ErrorCode.CONTAINS_BANNED_WORD]: '금칙어가 포함되어 있어 등록할 수 없습니다.',
      [ErrorCode.EMAIL_ALREADY_EXISTS]: '이미 사용 중인 이메일입니다.',
      [ErrorCode.NICKNAME_ALREADY_EXISTS]: '이미 사용 중인 닉네임입니다.',
      [ErrorCode.UNAUTHORIZED]: '인증이 필요합니다.',
      [ErrorCode.FORBIDDEN]: '권한이 없습니다.',
      [ErrorCode.INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 올바르지 않습니다.',
      [ErrorCode.INVALID_REFRESH_TOKEN]: '유효하지 않은 토큰입니다. 다시 로그인해 주세요.',
      [ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID]: '인증 링크가 유효하지 않거나 만료되었습니다.',
      [ErrorCode.EMAIL_ALREADY_VERIFIED]: '이미 인증된 이메일입니다.',
      [ErrorCode.EMAIL_NOT_VERIFIED]: '이메일 인증 후 이용할 수 있는 기능입니다.',
      [ErrorCode.PASSWORD_RESET_TOKEN_INVALID]: '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.',
      [ErrorCode.CANNOT_BLOCK_SELF]: '자기 자신은 차단할 수 없습니다.',
      [ErrorCode.INVALID_IMAGE_FILE]: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP만 허용)',
      [ErrorCode.FILE_TOO_LARGE]: '파일 크기는 5MB를 초과할 수 없습니다.',
    };
    return messages[code] ?? '요청을 처리할 수 없습니다.';
  }
}
