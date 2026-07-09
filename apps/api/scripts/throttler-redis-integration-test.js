/**
 * @nest-lab/throttler-storage-redis 통합 테스트.
 * 실제 로컬 Redis(포트 6390)에 대해 다음을 검증한다:
 *   1) 다중 인스턴스 환경에서 카운터 공유
 *   2) TTL 만료 후 카운터 리셋
 *   3) 동일 사용자/IP(키) 제한이 다른 키와 서로 간섭하지 않는지 (키 격리)
 *   4) Redis 장애 시 동작 (연결 끊김 -> 에러 전파 -> 재연결 후 정상 복구)
 */
const assert = require('assert');
const Redis = require('ioredis');
const { ThrottlerStorageRedisService } = require('@nest-lab/throttler-storage-redis');

const REDIS_PORT = 6390;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testMultiInstanceSharing() {
  console.log('\n=== 1) 다중 인스턴스 카운터 공유 테스트 ===');

  const redisA = new Redis({ port: REDIS_PORT });
  const redisB = new Redis({ port: REDIS_PORT });
  const storageA = new ThrottlerStorageRedisService(redisA);
  const storageB = new ThrottlerStorageRedisService(redisB);

  const key = 'test:multi-instance:' + Date.now();
  const ttl = 5000;
  const limit = 5;
  const blockDuration = 0;

  const seq = ['A', 'A', 'A', 'B', 'B'];
  let lastRecord;
  for (const instance of seq) {
    const storage = instance === 'A' ? storageA : storageB;
    lastRecord = await storage.increment(key, ttl, limit, blockDuration, 'default');
  }

  assert.strictEqual(lastRecord.totalHits, 5, `기대값 5, 실제값 ${lastRecord.totalHits}`);
  console.log(`  통과: 인스턴스 A(3회)+B(2회) = 합산 ${lastRecord.totalHits}회로 정확히 공유됨`);

  await redisA.quit();
  await redisB.quit();
}

async function testTtlExpiration() {
  console.log('\n=== 2) TTL 만료 후 카운터 리셋 테스트 ===');

  const redis = new Redis({ port: REDIS_PORT });
  const storage = new ThrottlerStorageRedisService(redis);

  const key = 'test:ttl:' + Date.now();
  const ttlMs = 1500;
  const limit = 100;

  const first = await storage.increment(key, ttlMs, limit, 0, 'default');
  assert.strictEqual(first.totalHits, 1);
  console.log(`  1차 요청 직후 카운트: ${first.totalHits}`);

  await sleep(ttlMs + 500);

  const afterExpiry = await storage.increment(key, ttlMs, limit, 0, 'default');
  assert.strictEqual(afterExpiry.totalHits, 1, `TTL 만료 후에는 1로 리셋되어야 함, 실제값 ${afterExpiry.totalHits}`);
  console.log(`  통과: TTL(${ttlMs}ms) 만료 후 카운트가 ${afterExpiry.totalHits}로 정확히 리셋됨`);

  await redis.quit();
}

async function testKeyIsolation() {
  console.log('\n=== 3) 동일 사용자/IP(키) 격리 테스트 ===');

  const redis = new Redis({ port: REDIS_PORT });
  const storage = new ThrottlerStorageRedisService(redis);

  const userAKey = 'test:user:1.2.3.4:' + Date.now();
  const userBKey = 'test:user:5.6.7.8:' + Date.now();

  await storage.increment(userAKey, 5000, 10, 0, 'default');
  await storage.increment(userAKey, 5000, 10, 0, 'default');
  await storage.increment(userAKey, 5000, 10, 0, 'default');

  const userBResult = await storage.increment(userBKey, 5000, 10, 0, 'default');

  assert.strictEqual(userBResult.totalHits, 1, 'IP가 다른 사용자는 독립적인 카운터를 가져야 함');
  console.log(`  통과: userA는 3회 요청했지만 userB(다른 IP)의 카운트는 ${userBResult.totalHits}로 독립적임`);

  await redis.quit();
}

async function testRedisFailureRecovery() {
  console.log('\n=== 4) Redis 장애/복구 테스트 ===');

  const redis = new Redis({ port: REDIS_PORT, retryStrategy: () => null, maxRetriesPerRequest: 1 });
  const storage = new ThrottlerStorageRedisService(redis);
  const key = 'test:failure:' + Date.now();

  const before = await storage.increment(key, 5000, 10, 0, 'default');
  console.log(`  장애 전 정상 동작 확인: totalHits=${before.totalHits}`);

  redis.disconnect();
  await sleep(200);

  let failed = false;
  try {
    await storage.increment(key, 5000, 10, 0, 'default');
  } catch (error) {
    failed = true;
    console.log(`  통과: 연결이 끊긴 상태에서 increment 호출 시 에러가 발생함 (${error.message})`);
  }
  assert.strictEqual(failed, true, 'Redis 연결이 끊긴 상태에서는 에러가 발생해야 한다');

  const redis2 = new Redis({ port: REDIS_PORT });
  const storage2 = new ThrottlerStorageRedisService(redis2);
  const after = await storage2.increment(key, 5000, 10, 0, 'default');
  console.log(`  통과: 새 연결로 재시도하면 정상 복구됨 (totalHits=${after.totalHits})`);

  await redis2.quit();
}

async function main() {
  await testMultiInstanceSharing();
  await testTtlExpiration();
  await testKeyIsolation();
  await testRedisFailureRecovery();
  console.log('\n모든 통합 테스트 통과.');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n통합 테스트 실패:', error);
  process.exit(1);
});
