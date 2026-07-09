/**
 * 알림 그룹핑을 위한 groupKey를 계산한다. 현재는 이 키를 저장만 해두고 실제 병합 로직은
 * 적용하지 않는다(모든 알림을 개별 row로 생성). 향후 그룹핑을 켤 때는
 * "동일 userId + groupKey 조합이 최근 N분 내에 있으면 새로 만들지 않고
 * 기존 row의 groupCount를 증가시키고 message를 갱신"하는 로직을 추가하면 되며,
 * 이 키 계산 로직 자체는 그대로 재사용된다.
 */
export function computeNotificationGroupKey(
  type: string,
  targetType?: string | null,
  targetId?: string | null,
): string {
  return `${type}:${targetType ?? 'none'}:${targetId ?? 'none'}`;
}
