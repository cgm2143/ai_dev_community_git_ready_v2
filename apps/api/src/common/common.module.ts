import { Global, Module } from '@nestjs/common';
import { PermissionCheckService } from './services/permission-check.service';
import { AdminAuditLogService } from './services/admin-audit-log.service';
import { TargetValidatorRegistry } from './domain/target-validator.registry';

/**
 * 여러 도메인 모듈에서 공통으로 재사용하는 서비스(권한 체크, 다형성 대상 검증 레지스트리,
 * 관리자 감사 로그 등)를 전역 등록한다. 새로운 공용 서비스가 필요해지면 이 모듈에 추가한다.
 */
@Global()
@Module({
  providers: [PermissionCheckService, TargetValidatorRegistry, AdminAuditLogService],
  exports: [PermissionCheckService, TargetValidatorRegistry, AdminAuditLogService],
})
export class CommonModule {}
