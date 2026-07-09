import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type DetectedImageType = 'jpeg' | 'png' | 'webp';

const ALLOWED_MIME_TYPES: Record<string, DetectedImageType> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ALLOWED_EXTENSIONS: Record<string, DetectedImageType> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
};

/**
 * 파일의 실제 바이트(매직 넘버/시그니처)를 검사해 진짜 형식을 판별한다.
 * 클라이언트가 보낸 Content-Type/확장자는 얼마든지 조작될 수 있으므로
 * (예: .png 확장자를 붙인 GIF, image/png로 위장한 SVG 등), 실제 파일 내용을 신뢰의 기준으로 삼는다.
 * GIF/SVG는 의도적으로 시그니처 목록에 포함하지 않아 항상 감지 실패(null) 처리되고,
 * 결과적으로 검증 단계에서 명시적으로 거부된다.
 */
export function detectActualImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

interface UploadedFileLike {
  size: number;
  mimetype: string;
  originalname: string;
  buffer: Buffer;
}

/**
 * 파일 크기, 선언된 MIME 타입, 확장자, 그리고 실제 바이트 시그니처까지 4중으로 검증한다.
 * 하나라도 어긋나면(예: mimetype은 image/png인데 실제 내용은 GIF) 거부한다.
 */
export function validateImageUpload(file: UploadedFileLike): DetectedImageType {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new AppException(ErrorCode.FILE_TOO_LARGE);
  }

  const mimeType = ALLOWED_MIME_TYPES[file.mimetype];
  if (!mimeType) {
    throw new AppException(ErrorCode.INVALID_IMAGE_FILE, 'JPG, PNG, WebP 형식만 업로드할 수 있습니다.');
  }

  const extensionMatch = /\.[^./\\]+$/.exec(file.originalname.toLowerCase());
  const extensionType = extensionMatch ? ALLOWED_EXTENSIONS[extensionMatch[0]] : undefined;
  if (!extensionType) {
    throw new AppException(ErrorCode.INVALID_IMAGE_FILE, '허용되지 않는 파일 확장자입니다.');
  }

  const actualType = detectActualImageType(file.buffer);
  if (!actualType) {
    throw new AppException(
      ErrorCode.INVALID_IMAGE_FILE,
      '파일 내용이 이미지 형식과 일치하지 않습니다. (GIF, SVG는 지원하지 않습니다)',
    );
  }

  if (actualType !== mimeType || actualType !== extensionType) {
    throw new AppException(
      ErrorCode.INVALID_IMAGE_FILE,
      '파일의 실제 형식이 확장자/Content-Type과 일치하지 않습니다.',
    );
  }

  return actualType;
}
