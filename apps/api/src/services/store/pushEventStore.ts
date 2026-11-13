import crypto from 'crypto';
import {
  ALLOWED_NOTIFICATION_TYPES,
  DEFAULT_POPUP_EVENTS,
  EventPopupItem,
  InAppNotificationRecord,
  PushCampaignRecord,
  PushNotificationType,
  PushStaggerConfig,
  PwaPushSubscriptionRecord,
  StoreContext,
  UserDeviceRecord,
  UserRecord,
  parseDeviceFromUserAgent,
} from './storeTypes.js';
import { DailyChallengeItem } from '../seedData.js';
import { isDayUnlocked } from './challengeStore.js';

export function getPushConfig(ctx: StoreContext): PushStaggerConfig {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pushConfig) ctx.ensurePushState(data);
  return data.pushConfig!;
}

export function updatePushConfig(
  ctx: StoreContext,
  patch: Partial<PushStaggerConfig>
): PushStaggerConfig {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  const current = getPushConfig(ctx);
  data.pushConfig = { ...current, ...patch };
  ctx.save();
  return data.pushConfig;
}

export function getPwaSubscriptions(
  ctx: StoreContext,
  onlyInstalledPwa = true
): PwaPushSubscriptionRecord[] {
  ctx.reloadIfChanged();
  const list = ctx.getData().pwaSubscriptions || [];
  return onlyInstalledPwa ? list.filter((s) => s.isPwaInstalled) : list;
}

export function upsertPwaSubscription(
  ctx: StoreContext,
  input: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    userId?: string | null;
    deviceId?: string | null;
    employeeId?: string | null;
    fullName?: string | null;
    isPwaInstalled?: boolean;
    userAgent?: string;
  }
): PwaPushSubscriptionRecord {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pwaSubscriptions) data.pwaSubscriptions = [];
  data.pwaSubscriptions = data.pwaSubscriptions.filter((s) => Boolean(s.userId));

  const now = new Date().toISOString();
  const userObj = input.userId ? data.users.find((u) => u.id === input.userId) : undefined;
  const resolvedEmployeeId = input.employeeId || userObj?.employeeId || null;
  const resolvedFullName = input.fullName || userObj?.fullName || null;

  const existingByEndpoint = data.pwaSubscriptions.find((s) => s.endpoint === input.endpoint);
  const existingSeedByUser =
    input.userId && !input.endpoint.includes('speakright.local')
      ? data.pwaSubscriptions.find((s) => s.userId === input.userId && s.isSimulated)
      : undefined;
  const target = existingByEndpoint || existingSeedByUser;

  if (target) {
    target.endpoint = input.endpoint;
    target.keys = {
      p256dh: input.keys?.p256dh || target.keys.p256dh || '',
      auth: input.keys?.auth || target.keys.auth || '',
    };
    if (input.userId !== undefined) target.userId = input.userId;
    if (input.deviceId !== undefined) target.deviceId = input.deviceId;
    target.employeeId = resolvedEmployeeId;
    target.fullName = resolvedFullName;
    target.isPwaInstalled = input.isPwaInstalled ?? true;
    target.isSimulated = input.endpoint.includes('speakright.local');
    if (input.userAgent) target.userAgent = input.userAgent;
    target.updatedAt = now;
    ctx.save();
    return target;
  }

  const created: PwaPushSubscriptionRecord = {
    id: `pwa-${crypto.randomUUID().slice(0, 8)}`,
    endpoint: input.endpoint,
    keys: { p256dh: input.keys?.p256dh || '', auth: input.keys?.auth || '' },
    userId: input.userId || null,
    deviceId: input.deviceId || null,
    employeeId: resolvedEmployeeId,
    fullName: resolvedFullName,
    isPwaInstalled: input.isPwaInstalled ?? true,
    isSimulated: input.endpoint.includes('speakright.local'),
    userAgent: input.userAgent || 'PWA Client',
    createdAt: now,
    updatedAt: now,
    lastNotifiedAt: null,
  };

  data.pwaSubscriptions.push(created);
  ctx.save();
  return created;
}

export function removePwaSubscription(ctx: StoreContext, endpoint: string): boolean {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pwaSubscriptions) return false;
  const before = data.pwaSubscriptions.length;
  data.pwaSubscriptions = data.pwaSubscriptions.filter((s) => s.endpoint !== endpoint);
  if (data.pwaSubscriptions.length !== before) {
    ctx.save();
    return true;
  }
  return false;
}

export function unbindDeviceSubscriptions(
  ctx: StoreContext,
  userId?: string | null,
  endpoint?: string | null,
  deviceId?: string | null
): number {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pwaSubscriptions || data.pwaSubscriptions.length === 0) return 0;
  const before = data.pwaSubscriptions.length;
  data.pwaSubscriptions = data.pwaSubscriptions.filter((s) => {
    if (!s.userId) return false;
    const matchEndpoint = Boolean(endpoint && s.endpoint === endpoint);
    const matchDevice = Boolean(deviceId && s.deviceId === deviceId);
    const matchUserDevice = Boolean(userId && s.userId === userId && (matchEndpoint || matchDevice));
    return !(matchEndpoint || matchUserDevice || (matchDevice && !userId));
  });
  const removed = before - data.pwaSubscriptions.length;
  if (removed > 0) ctx.save();
  return removed;
}

export function getLatestUnlockedChallenge(ctx: StoreContext): DailyChallengeItem {
  const data = ctx.getData();
  const unlocked = data.challenges
    .filter((c) => isDayUnlocked(ctx, c))
    .sort((a, b) => b.dayNumber - a.dayNumber);
  return unlocked[0] || data.challenges[0];
}

export function getUnstudiedAccountsWithPwa(ctx: StoreContext) {
  const data = ctx.getData();
  const targetDay = getLatestUnlockedChallenge(ctx);
  const pwaSubs = getPwaSubscriptions(ctx, true);

  const results: {
    user: UserRecord;
    subscriptions: PwaPushSubscriptionRecord[];
    targetDay: DailyChallengeItem;
    neverStudiedAnyDay: boolean;
  }[] = [];

  for (const user of data.users) {
    if (user.role !== 'USER') continue;
    const userAttempts = data.attempts.filter((a) => a.userId === user.id);
    const doneTargetDay = userAttempts.some((a) => a.dayNumber === targetDay.dayNumber);
    const neverStudiedAnyDay = user.completedDays === 0 && userAttempts.length === 0;

    if (!doneTargetDay || neverStudiedAnyDay) {
      const userSubs = pwaSubs.filter(
        (s) => s.userId === user.id || (s.employeeId && s.employeeId === user.employeeId)
      );
      results.push({ user, subscriptions: userSubs, targetDay, neverStudiedAnyDay });
    }
  }
  return results;
}

export function getCompletedAccountsForCurrentDay(ctx: StoreContext) {
  const data = ctx.getData();
  const targetDay = getLatestUnlockedChallenge(ctx);
  const pwaSubs = getPwaSubscriptions(ctx, true);

  const results: {
    user: UserRecord;
    subscriptions: PwaPushSubscriptionRecord[];
    targetDay: DailyChallengeItem;
    attemptScore: number;
  }[] = [];

  for (const user of data.users) {
    if (user.role !== 'USER') continue;
    const attempt = data.attempts.find(
      (a) => a.userId === user.id && a.dayNumber === targetDay.dayNumber
    );
    if (attempt) {
      const userSubs = pwaSubs.filter(
        (s) => s.userId === user.id || (s.employeeId && s.employeeId === user.employeeId)
      );
      results.push({ user, subscriptions: userSubs, targetDay, attemptScore: attempt.score });
    }
  }
  return results;
}

export function getPushCampaigns(ctx: StoreContext): PushCampaignRecord[] {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pushCampaigns) data.pushCampaigns = [];
  return data.pushCampaigns;
}

export function addPushCampaign(
  ctx: StoreContext,
  campaign: PushCampaignRecord
): PushCampaignRecord {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.pushCampaigns) data.pushCampaigns = [];
  data.pushCampaigns.unshift(campaign);
  if (data.pushCampaigns.length > 30) data.pushCampaigns = data.pushCampaigns.slice(0, 30);
  ctx.save();
  return campaign;
}

export function addInAppNotification(ctx: StoreContext, notif: InAppNotificationRecord) {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.inAppNotifications) data.inAppNotifications = [];
  data.inAppNotifications.unshift(notif);
  if (data.inAppNotifications.length > 1000) {
    data.inAppNotifications = data.inAppNotifications.slice(0, 1000);
  }
  ctx.setLastNotificationTimestamp(Date.now());
  ctx.save();
}

export function addBatchInAppNotifications(ctx: StoreContext, notifs: InAppNotificationRecord[]) {
  ctx.reloadIfChanged();
  if (!notifs || notifs.length === 0) return;
  const data = ctx.getData();
  if (!data.inAppNotifications) data.inAppNotifications = [];
  data.inAppNotifications.unshift(...notifs);
  if (data.inAppNotifications.length > 1000) {
    data.inAppNotifications = data.inAppNotifications.slice(0, 1000);
  }
  ctx.setLastNotificationTimestamp(Date.now());
  ctx.save();
}

export function markNotificationsDelivered(
  ctx: StoreContext,
  notificationIds: string[],
  userId?: string | null,
  deviceId?: string | null
): boolean {
  if (!notificationIds || notificationIds.length === 0) return false;
  if (!userId && !deviceId) return false;

  ctx.reloadIfChanged();
  const list = ctx.getData().inAppNotifications;
  if (!list || list.length === 0) return false;

  const idSet = new Set(notificationIds);
  let changed = false;

  for (const n of list) {
    if (!idSet.has(n.id)) continue;
    if (userId) {
      if (!n.deliveredToUserIds) n.deliveredToUserIds = [];
      if (!n.deliveredToUserIds.includes(userId)) {
        n.deliveredToUserIds.push(userId);
        changed = true;
      }
    }
    if (deviceId) {
      if (!n.deliveredToDeviceIds) n.deliveredToDeviceIds = [];
      if (!n.deliveredToDeviceIds.includes(deviceId)) {
        n.deliveredToDeviceIds.push(deviceId);
        changed = true;
      }
    }
  }

  if (changed) ctx.save();
  return changed;
}

export function getRecentInAppNotifications(
  ctx: StoreContext,
  userId?: string | null,
  sinceMs = 0,
  options?: { forPushPoll?: boolean; deviceId?: string | null }
): InAppNotificationRecord[] {
  ctx.reloadIfChanged();
  if (!userId) return [];

  if (sinceMs > 0 && sinceMs >= ctx.getLastNotificationTimestamp()) {
    return [];
  }

  const data = ctx.getData();
  const list = data.inAppNotifications || [];
  if (list.length === 0) return [];

  const userObj = data.users.find((u) => u.id === userId);
  const userCreatedMs = userObj?.createdAt ? new Date(userObj.createdAt).getTime() : 0;
  const pollWindowFloorMs = options?.forPushPoll
    ? Math.max(sinceMs, Date.now() - 24 * 60 * 60 * 1000)
    : sinceMs;

  return list.filter((n) => {
    if (!ALLOWED_NOTIFICATION_TYPES.has(n.type)) return false;
    const deliveredMs = new Date(n.deliveredAt).getTime();
    if (deliveredMs <= pollWindowFloorMs) return false;

    if (n.userId === null && Number.isFinite(userCreatedMs) && userCreatedMs > 0) {
      if (deliveredMs < userCreatedMs - 60_000) return false;
    }

    if (n.userId !== null && n.userId !== userId) return false;
    if (n.excludedUserIds && n.excludedUserIds.includes(userId)) return false;

    if (options?.forPushPoll && n.deliveredToUserIds && n.deliveredToUserIds.includes(userId)) {
      return false;
    }
    return true;
  });
}

export function sendPersonalizedNotification(
  ctx: StoreContext,
  payload: {
    targetType: 'all' | 'user';
    targetValue?: string;
    title: string;
    body: string;
    targetUrl?: string;
    type?: PushNotificationType;
  }
): { sentCount: number; success: boolean } {
  const data = ctx.getData();
  let targets: UserRecord[] = [];
  if (payload.targetType === 'user' && payload.targetValue) {
    const u = data.users.find((usr) => usr.id === payload.targetValue);
    if (u) targets = [u];
  } else {
    targets = data.users;
  }

  if (targets.length === 0) return { sentCount: 0, success: false };

  const campaignId = `camp-custom-${Date.now()}`;
  const targetUrl = payload.targetUrl || '#challenges';
  const notifType: PushNotificationType = ALLOWED_NOTIFICATION_TYPES.has(payload.type || '')
    ? (payload.type as PushNotificationType)
    : 'NEW_TOP_1';

  const generated = targets.map((user) => ({
    id: `inapp-${Date.now()}-${user.id}`,
    campaignId,
    type: notifType,
    userId: user.id,
    title: payload.title
      .replace(/\{name\}/gi, user.fullName)
      .replace(/\{gen\}/gi, user.employeeId)
      .replace(/\{score\}/gi, String(user.totalScore || 0)),
    body: payload.body
      .replace(/\{name\}/gi, user.fullName)
      .replace(/\{gen\}/gi, user.employeeId)
      .replace(/\{score\}/gi, String(user.totalScore || 0)),
    targetUrl,
    deliveredAt: new Date().toISOString(),
  }));

  addBatchInAppNotifications(ctx, generated);
  console.log(
    `[IN-APP NOTIF] 📢 Đã gửi thông báo cá nhân hóa tới ${targets.length} nhân viên (targetType: ${payload.targetType}${payload.targetValue ? `=${payload.targetValue}` : ''})`
  );
  return { sentCount: targets.length, success: true };
}

export function getUserDevices(
  ctx: StoreContext,
  userId: string,
  currentUa = ''
): UserDeviceRecord[] {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.devices) data.devices = [];
  const userDevices = data.devices.filter((d) => d.userId === userId);
  if (userDevices.length === 0) {
    const parsed = parseDeviceFromUserAgent(currentUa);
    const defaultDevice: UserDeviceRecord = {
      id: `dev-${userId}-main`,
      userId,
      deviceType: parsed.deviceType,
      deviceName: `${parsed.browser} trên ${parsed.os}`,
      browser: parsed.browser,
      os: parsed.os,
      userAgent: currentUa || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      isCurrent: true,
      isPwaInstalled: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    data.devices.push(defaultDevice);
    ctx.save();
    return [defaultDevice];
  }

  return userDevices.map((d) => ({
    ...d,
    isCurrent: Boolean(currentUa && d.userAgent === currentUa),
  }));
}

export function recordUserDevice(
  ctx: StoreContext,
  userId: string,
  userAgent = '',
  ip = ''
): UserDeviceRecord {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.devices) data.devices = [];
  const parsed = parseDeviceFromUserAgent(userAgent);
  const existing = data.devices.find(
    (d) =>
      d.userId === userId &&
      (d.userAgent === userAgent || (d.browser === parsed.browser && d.os === parsed.os))
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.lastActiveAt = now;
    if (ip) existing.ip = ip;
    ctx.save();
    return existing;
  }

  const newDevice: UserDeviceRecord = {
    id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    deviceType: parsed.deviceType,
    deviceName: `${parsed.browser} trên ${parsed.os}`,
    browser: parsed.browser,
    os: parsed.os,
    ip,
    userAgent,
    isCurrent: true,
    isPwaInstalled: /standalone|pwa/i.test(userAgent),
    createdAt: now,
    lastActiveAt: now,
  };
  data.devices.push(newDevice);
  ctx.save();
  return newDevice;
}

export function removeUserDevice(ctx: StoreContext, userId: string, deviceId: string): boolean {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!data.devices) return false;
  const initialLen = data.devices.length;
  data.devices = data.devices.filter((d) => !(d.userId === userId && d.id === deviceId));
  if (data.devices.length !== initialLen) {
    ctx.save();
    return true;
  }
  return false;
}

export function getEvents(ctx: StoreContext, onlyVisible = false): EventPopupItem[] {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!Array.isArray(data.events) || data.events.length === 0) {
    data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
    ctx.save();
  }
  const list = [...(data.events || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  return onlyVisible ? list.filter((e) => e.isVisible) : list;
}

export function createEvent(ctx: StoreContext, input: Partial<EventPopupItem>): EventPopupItem {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!Array.isArray(data.events)) {
    data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
  }
  const events = data.events || [];
  const nextOrder = events.length + 1;

  const newEvent: EventPopupItem = {
    id: input.id?.trim() || `event-${Date.now()}`,
    orderIndex: input.orderIndex !== undefined ? Number(input.orderIndex) : nextOrder,
    num: input.num?.trim() || String(input.orderIndex || nextOrder).padStart(2, '0'),
    titleA: input.titleA?.trim() || 'SỰ KIỆN',
    titleB: input.titleB?.trim() || '',
    titleC: input.titleC?.trim() || 'MỚI',
    desc: input.desc?.trim() || '',
    img: input.img?.trim() || 'events/golden-bell.jpg',
    iconName: input.iconName || 'Sparkles',
    chips: Array.isArray(input.chips) ? input.chips.filter(Boolean) : [],
    note: input.note?.trim() || '',
    more: Array.isArray(input.more) ? input.more.filter(Boolean) : [],
    themeColor: input.themeColor || 'amber',
    actionType: input.actionType || 'expand',
    actionUrl: input.actionUrl?.trim() || '',
    isVisible: input.isVisible ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  events.push(newEvent);
  data.events = events;
  ctx.save();
  return newEvent;
}

export function updateEvent(
  ctx: StoreContext,
  id: string,
  patch: Partial<EventPopupItem>
): EventPopupItem | null {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!Array.isArray(data.events)) {
    data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
  }
  const events = data.events || [];
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const current = events[idx];
  const updated: EventPopupItem = {
    ...current,
    ...patch,
    id: current.id,
    orderIndex: patch.orderIndex !== undefined ? Number(patch.orderIndex) : current.orderIndex,
    num: patch.num !== undefined ? String(patch.num) : current.num,
    chips: Array.isArray(patch.chips) ? patch.chips.filter(Boolean) : current.chips,
    more: Array.isArray(patch.more) ? patch.more.filter(Boolean) : current.more,
    updatedAt: new Date().toISOString(),
  };

  events[idx] = updated;
  data.events = events;
  ctx.save();
  return updated;
}

export function toggleEventVisibility(ctx: StoreContext, id: string): EventPopupItem | null {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!Array.isArray(data.events)) {
    data.events = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
  }
  const events = data.events || [];
  const event = events.find((e) => e.id === id);
  if (!event) return null;

  event.isVisible = !event.isVisible;
  event.updatedAt = new Date().toISOString();
  data.events = events;
  ctx.save();
  return event;
}

export function deleteEvent(ctx: StoreContext, id: string): boolean {
  ctx.reloadIfChanged();
  const data = ctx.getData();
  if (!Array.isArray(data.events)) return false;
  const initialLen = data.events.length;
  data.events = data.events.filter((e) => e.id !== id);
  if (data.events.length !== initialLen) {
    ctx.save();
    return true;
  }
  return false;
}

export function resetEventsToDefault(ctx: StoreContext): EventPopupItem[] {
  ctx.reloadIfChanged();
  const defaults: EventPopupItem[] = JSON.parse(JSON.stringify(DEFAULT_POPUP_EVENTS));
  ctx.getData().events = defaults;
  ctx.save();
  return defaults;
}
