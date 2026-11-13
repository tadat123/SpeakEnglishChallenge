export type AdminSubTab =
  | 'dashboard'
  | 'users'
  | 'challenges'
  | 'events'
  | 'notifications'
  | 'security';

export const ADMIN_SUBTABS: readonly AdminSubTab[] = [
  'dashboard',
  'users',
  'challenges',
  'events',
  'notifications',
  'security',
] as const;

export interface AdminRouteState {
  subTab: AdminSubTab;
  dayNumber?: number;
}

export interface AdminRouteMeta {
  segment: AdminSubTab;
  titleVi: string;
  titleEn: string;
  titleKo: string;
}

export const ADMIN_ROUTE_META: Record<AdminSubTab, AdminRouteMeta> = {
  dashboard: {
    segment: 'dashboard',
    titleVi: 'Tổng quan CMS',
    titleEn: 'Dashboard Overview',
    titleKo: '대시보드 개요',
  },
  users: {
    segment: 'users',
    titleVi: 'Thành viên',
    titleEn: 'Members',
    titleKo: '회원 관리',
  },
  challenges: {
    segment: 'challenges',
    titleVi: 'Thử thách 21 ngày',
    titleEn: '21-Day Challenges',
    titleKo: '21일 챌린지',
  },
  events: {
    segment: 'events',
    titleVi: 'Popup Sự kiện',
    titleEn: 'Event Popups',
    titleKo: '이벤트 팝업',
  },
  notifications: {
    segment: 'notifications',
    titleVi: 'Thông báo Push',
    titleEn: 'Push Notifications',
    titleKo: '푸시 알림',
  },
  security: {
    segment: 'security',
    titleVi: 'Bảo mật & Hệ thống',
    titleEn: 'Security & System',
    titleKo: '보안 및 시스템',
  },
};

function extractAdminSegments(hash?: string, pathname?: string): string[] | null {
  const rawHash = (hash ?? (typeof window !== 'undefined' ? window.location.hash : ''))
    .replace(/^#\/?/, '')
    .split('?')[0]
    .trim();

  if (rawHash) {
    const hashParts = rawHash.split('/').filter(Boolean);
    if (hashParts[0]?.toLowerCase() === 'admin') {
      return hashParts;
    }
  }

  const rawPath = (pathname ?? (typeof window !== 'undefined' ? window.location.pathname : ''))
    .split('?')[0]
    .trim();

  if (rawPath) {
    const pathParts = rawPath.split('/').filter(Boolean);
    const adminIdx = pathParts.findIndex((seg) => seg.toLowerCase() === 'admin');
    if (adminIdx !== -1) {
      return pathParts.slice(adminIdx);
    }
  }

  return null;
}

/**
 * Kiểm tra URL hiện tại (hash hoặc pathname) có đang trỏ tới khu vực Admin hay không.
 */
export function isAdminUrl(hash?: string, pathname?: string): boolean {
  return extractAdminSegments(hash, pathname) !== null;
}

/**
 * Phân tích route Admin từ URL hash (`#admin/users`, `#admin/challenges/day/5`, `#/admin/events`)
 * hoặc pathname (`/admin/users`). Mặc định trả về `{ subTab: 'dashboard' }`.
 */
export function parseAdminRoute(hash?: string, pathname?: string): AdminRouteState {
  const segments = extractAdminSegments(hash, pathname);
  if (!segments) {
    return { subTab: 'dashboard' };
  }

  const candidateSub = segments[1]?.toLowerCase() as AdminSubTab | undefined;
  const subTab: AdminSubTab =
    candidateSub && (ADMIN_SUBTABS as readonly string[]).includes(candidateSub)
      ? candidateSub
      : 'dashboard';

  if (subTab === 'challenges' || subTab === 'dashboard') {
    const dayToken = segments[2]?.toLowerCase() === 'day' ? segments[3] : segments[2];
    if (dayToken) {
      const parsedDay = Number.parseInt(dayToken, 10);
      if (Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 21) {
        return { subTab, dayNumber: parsedDay };
      }
    }
  }

  return { subTab };
}

/**
 * Tạo hash chuẩn cho trang Admin, ví dụ `#admin/dashboard`, `#admin/users`, `#admin/challenges/day/5`.
 */
export function buildAdminHash(subTab: AdminSubTab, dayNumber?: number): string {
  if (subTab === 'challenges' && typeof dayNumber === 'number' && dayNumber >= 1 && dayNumber <= 21) {
    return `#admin/challenges/day/${dayNumber}`;
  }
  if (subTab === 'dashboard' && typeof dayNumber === 'number' && dayNumber >= 1 && dayNumber <= 21) {
    return `#admin/dashboard/day/${dayNumber}`;
  }
  return `#admin/${subTab}`;
}

/**
 * Tạo document.title phù hợp với route Admin hiện tại.
 */
export function getAdminDocumentTitle(
  route: AdminRouteState,
  lang: 'vi' | 'en' | 'ko'
): string {
  const meta = ADMIN_ROUTE_META[route.subTab];
  const label =
    lang === 'en' ? meta.titleEn : lang === 'ko' ? meta.titleKo : meta.titleVi;
  if (route.subTab === 'challenges' && route.dayNumber) {
    const dayPrefix = lang === 'en' ? 'Day' : lang === 'ko' ? 'Day' : 'Ngày';
    return `${label} (${dayPrefix} ${route.dayNumber}) | Admin CMS`;
  }
  return `${label} | Admin CMS`;
}
