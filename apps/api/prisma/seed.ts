import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'SUPER_ADMIN', description: '최고 관리자 - 모든 권한' },
  { name: 'ADMIN', description: '운영 관리자' },
  { name: 'MODERATOR', description: '게시판 운영자 - 신고 처리, 게시글/댓글 삭제' },
  { name: 'USER', description: '일반 회원' },
] as const;

const PERMISSIONS = [
  { code: 'POST_DELETE_ANY', description: '타인의 게시글 삭제' },
  { code: 'COMMENT_DELETE_ANY', description: '타인의 댓글 삭제' },
  { code: 'REPORT_RESOLVE', description: '신고 처리' },
  { code: 'USER_BAN', description: '회원 정지' },
  { code: 'BOARD_MANAGE', description: '게시판/카테고리 관리' },
  { code: 'AD_MANAGE', description: '광고/배너 관리' },
  { code: 'SETTING_MANAGE', description: '사이트 설정 관리' },
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: PERMISSIONS.map((p) => p.code),
  MODERATOR: ['POST_DELETE_ANY', 'COMMENT_DELETE_ANY', 'REPORT_RESOLVE'],
  USER: [],
};

const CATEGORIES: Array<{ name: string; slug: string; boards: string[] }> = [
  {
    name: 'AI',
    slug: 'ai',
    boards: [
      'ChatGPT',
      'Claude',
      'Gemini',
      'Cursor',
      'Windsurf',
      'Copilot',
      'AI Coding',
      'Prompt',
      'MCP',
      'AI News',
    ],
  },
  {
    name: '개발',
    slug: 'dev',
    boards: [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'Spring',
      'React',
      'Next.js',
      'NestJS',
      'Node.js',
      'Docker',
      'Kubernetes',
      'AWS',
    ],
  },
  {
    name: '커뮤니티',
    slug: 'community',
    boards: ['자유게시판', '질문답변', '프로젝트 모집', '취업', '유머', '정보공유'],
  },
  {
    name: '운영',
    slug: 'ops',
    boards: ['공지사항', '건의사항'],
  },
];

const AD_SLOTS = [
  { code: 'HEADER_TOP', name: '헤더 상단 배너' },
  { code: 'HOME_FEED_1', name: '홈 피드 삽입 광고 1' },
  { code: 'HOME_FEED_2', name: '홈 피드 삽입 광고 2' },
  { code: 'POST_TOP', name: '게시글 상단 배너' },
  { code: 'POST_BOTTOM', name: '게시글 하단 배너' },
  { code: 'SIDEBAR_TOP', name: '사이드바 상단 배너' },
  { code: 'SIDEBAR_BOTTOM', name: '사이드바 하단 배너' },
  { code: 'FOOTER', name: '푸터 배너' },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown }> = [
  { key: 'site_name', value: 'devhub' },
  { key: 'theme_default', value: 'light' },
  { key: 'maintenance_mode', value: false },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedRolesAndPermissions(): Promise<Map<string, string>> {
  const roleIdByName = new Map<string, string>();

  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roleIdByName.set(role.name, created.id);
  }

  const permissionIdByCode = new Map<string, string>();
  for (const permission of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: { code: permission.code, description: permission.description },
    });
    permissionIdByCode.set(permission.code, created.id);
  }

  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) continue;

    for (const code of permissionCodes) {
      const permissionId = permissionIdByCode.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  return roleIdByName;
}

async function seedCategoriesAndBoards(): Promise<void> {
  for (const [index, category] of CATEGORIES.entries()) {
    const createdCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: index },
      create: { name: category.name, slug: category.slug, sortOrder: index },
    });

    for (const [boardIndex, boardName] of category.boards.entries()) {
      const boardSlug = `${category.slug}-${slugify(boardName)}`;
      await prisma.board.upsert({
        where: { slug: boardSlug },
        update: { name: boardName, sortOrder: boardIndex, categoryId: createdCategory.id },
        create: {
          name: boardName,
          slug: boardSlug,
          sortOrder: boardIndex,
          categoryId: createdCategory.id,
        },
      });
    }
  }
}

async function seedAdSlots(): Promise<void> {
  for (const slot of AD_SLOTS) {
    await prisma.adSlot.upsert({
      where: { code: slot.code },
      update: { name: slot.name },
      create: { code: slot.code, name: slot.name },
    });
  }
}

async function seedSettings(): Promise<void> {
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value as never },
    });
  }
}

async function seedAdminUser(roleIdByName: Map<string, string>): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD 환경변수가 없습니다. 최초 관리자 계정 정보를 하드코딩하지 않습니다.',
    );
  }

  const superAdminRoleId = roleIdByName.get('SUPER_ADMIN');
  if (!superAdminRoleId) {
    throw new Error('SUPER_ADMIN 역할이 시드되지 않았습니다.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      nickname: 'admin',
      roleId: superAdminRoleId,
      emailVerifiedAt: new Date(),
    },
  });
}

async function main(): Promise<void> {
  const roleIdByName = await seedRolesAndPermissions();
  await seedCategoriesAndBoards();
  await seedAdSlots();
  await seedSettings();
  await seedAdminUser(roleIdByName);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
