import { Lang } from '../../utils/i18n';
import { EventPopupItem } from '../SpeakRightEventsPopup';
import { appDialog } from '../AppDialogProvider';

export interface AdminDashboardProps {
  token: string;
  challenges: any[];
  onRefreshGlobal: () => void;
  onEventsChange?: (events: EventPopupItem[]) => void;
  onExportCsv: () => void;
  lang: Lang;
  darkMode: boolean;
  user?: any;
  onBackToUserMode?: () => void;
  onToggleDarkMode?: () => void;
  onChangeLang?: (l: Lang) => void;
  onLogout?: () => void;
}

export interface AdminThemeProps {
  token: string;
  darkMode: boolean;
  lang: Lang;
  cardBg: string;
  subCardBg: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  showMessage: (msg: string, isErr?: boolean) => void;
}

export const getTodayVnYmd = () =>
  new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Tránh lặp dạng "Day 1: Day 1" khi tiêu đề mặc định đã có sẵn tiền tố Day N. */
export const formatDayHeading = (dayNumber: number, title?: string | null): string => {
  const dayLabel = `Day ${dayNumber}`;
  const trimmed = (title || '').trim();
  if (!trimmed) return dayLabel;
  if (new RegExp(`^day\\s+${dayNumber}(?:$|\\s*[:\\-–—])`, 'i').test(trimmed)) {
    return trimmed;
  }
  return `${dayLabel}: ${trimmed}`;
};

export const formatYmdToDmy = (ymd: string) => {
  const parts = ymd.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ymd;
};

export interface ManualUnlockChallengeOptions {
  dayNumber: number;
  totalDays: number;
  eventStatus: 'NOT_STARTED' | 'COUNTDOWN' | 'ACTIVE';
  scheduledDateLabel?: string | null;
  headers: Record<string, string>;
}

/**
 * Mở khóa một ngày thủ công. Nếu sự kiện đang đếm ngược ngày mở (COUNTDOWN) hoặc chưa bắt đầu (NOT_STARTED),
 * yêu cầu Admin xác nhận có muốn bắt đầu thử thách từ ngày hôm nay hay giữ nguyên lịch hẹn.
 */
export async function confirmAndUnlockChallengeDay({
  dayNumber,
  totalDays,
  eventStatus,
  scheduledDateLabel,
  headers,
}: ManualUnlockChallengeOptions): Promise<{
  performed: boolean;
  ok?: boolean;
  isUnlocked?: boolean;
  data?: any;
}> {
  if (eventStatus === 'COUNTDOWN' || eventStatus === 'NOT_STARTED') {
    const todayYmd = getTodayVnYmd();
    const todayDmy = formatYmdToDmy(todayYmd);
    const isCountdown = eventStatus === 'COUNTDOWN';

    const confirmed = await appDialog.confirm({
      title: isCountdown
        ? 'Sự kiện đang hẹn lịch đếm ngược'
        : 'Bắt đầu thử thách từ hôm nay?',
      message: isCountdown
        ? `Thử thách đang được hẹn lịch bắt đầu vào ngày ${
            scheduledDateLabel || 'đã đặt'
          } (đang đếm ngược).\n\nBạn có muốn hủy lịch hẹn cũ và bắt đầu thử thách từ ngày hôm nay (${todayDmy}) không?\n(Sẽ mở ngay Day ${dayNumber} hôm nay và tự động lên lịch các ngày tiếp theo lúc 00:00 mỗi ngày.)`
        : `Sự kiện hiện chưa bắt đầu (toàn bộ ngày đang khóa).\n\nBạn có muốn bắt đầu thử thách từ ngày hôm nay (${todayDmy}) với Day ${dayNumber} không?`,
      confirmText: 'Bắt đầu từ hôm nay',
      cancelText: isCountdown ? 'Giữ lịch đếm ngược' : 'Hủy',
      variant: isCountdown ? 'warning' : 'primary',
    });

    if (!confirmed) {
      return { performed: false };
    }

    const res = await fetch('/api/admin/challenges/start-schedule', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        totalDays: Math.min(90, Math.max(1, Number(totalDays) || 21)),
        startFromDayNumber: dayNumber,
        startDateStr: todayYmd,
        lockPreviousDays: dayNumber > 1,
        lockAllUntilStart: false,
      }),
    });
    const data = await res.json();
    return {
      performed: true,
      ok: res.ok,
      isUnlocked: res.ok ? true : undefined,
      data,
    };
  }

  const res = await fetch(`/api/admin/challenges/${dayNumber}/unlock`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ unlockNow: true }),
  });
  const data = await res.json();
  return {
    performed: true,
    ok: res.ok,
    isUnlocked: data?.isUnlocked !== undefined ? data.isUnlocked : res.ok,
    data,
  };
}

export const compressImageIfNeeded = (
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      // Giữ nguyên ảnh GIF động hoặc SVG để không mất hiệu ứng động
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outMime, quality);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
};

export const ADMIN_I18N = {
  vi: {
    headerTitle: 'Lịch Trình & Đề Thi',
    headerSub: '',
    exportBtn: 'Xuất Excel',
    selectDayTitle: 'Chọn Ngày Thi (Day 1 → Day {totalDays}):',
    openStatus: '🔓 Mở',
    lockedStatus: '🔒 Khóa',
    dayTitleLabel: 'Tên ngày thi',
    dayDateLabel: 'Ngày tháng',
    saveDayMetaBtn: 'Lưu',
    activePlayersLabel: 'đang làm bài',
    lockDayBtn: 'Khóa',
    unlockDayBtn: 'Mở khóa',
    nowSuffix: 'ngay',
    liveBannerTitle: '🟢 Đang có người làm bài trên',
    liveBannerProtection: 'Bảo vệ Snapshot đề thi',
    questionListTitle: 'Danh Sách Câu Hỏi',
    questionsCountUnit: 'câu',
    questionListSub: '',
    cloneAllBtn: 'Sao chép sang tất cả ngày',
    bulkImportBtn: 'Nhập Excel / CSV',
    addQuestionBtn: 'Thêm Câu Hỏi',
    questionPrefix: 'Câu',
    correctAnsBadge: 'Đáp án đúng',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 Video',
    editBtn: 'Sửa',
    deleteBtnTitle: 'Xóa câu hỏi',
    lockModalTitle: 'Tùy chọn Khóa',
    lockModalSubPrefix: 'Hiện có',
    lockModalSubSuffix: 'nhân viên đang làm bài',
    gracefulTitle: 'Khóa Mềm / Ân hạn',
    safeBadge: 'An toàn',
    gracefulDesc:
      'Chặn bắt đầu lượt mới, cho phép người đang làm dở hoàn thành nốt.',
    forceTitle: 'Khóa Cưỡng Chế',
    forceDesc:
      'Dừng ngay lập tức các phiên đang thi dở. Không mất lượt thi.',
    modalAddTitle: '➕ Thêm Câu Hỏi Mới vào Day',
    modalEditTitle: '✏️ Chỉnh sửa Câu',
    questionTypeLabel: 'Dạng câu hỏi *',
    promptTextLabel: 'Nội dung câu hỏi *',
    targetWordLabel: 'Từ phát âm mẫu',
    statementTextLabel: 'Nhận định (True / False)',
    promptAudioTitle: 'Âm thanh đề bài',
    showSpeakerLabel: 'Hiện nút Loa',
    uploadAudioBtn: 'Tải file Audio',
    uploadingText: 'Đang tải...',
    testListenBtn: '🔊 Nghe thử',
    promptVideoTitle: 'Video đề bài',
    uploadVideoBtn: 'Tải Video',
    removeVideoBtn: 'Xóa Video',
    optionsSectionLabel: 'Phương án trả lời:',
    correctSelectedBadge: '(Đáp án Đúng)',
    hasOptionSpeaker: 'Có nút Loa',
    explanationLabel: 'Giải thích chi tiết',
    cancelBtn: 'Hủy',
    saveQuestionBtn: 'Lưu Câu Hỏi',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: 'Multiple Choice (3 đáp án)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False (Đúng / Sai)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Nghe audio / Video (3 đáp án)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Nghĩa của từ / Viết tắt (3 đáp án)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Điền từ (Fill in the blank)',
      },
    ],
    sidebarDashboard: 'Dashboard',
    sidebarDashboardSub: '',
    sidebarUsers: 'Nhân Viên',
    sidebarUsersSub: '',
    sidebarChallenges: 'Lịch Trình & Đề Thi',
    sidebarChallengesSub: '',
    sidebarEvents: 'Pop-up Sự Kiện',
    sidebarEventsSub: '',
    sidebarNotifications: 'Thông Báo',
    sidebarNotificationsSub: '',
    sidebarSecurity: 'Bảo Mật',
    sidebarSecuritySub: '',
    backToQuiz: 'Về Chỗ Làm Bài',
    backToQuizShort: 'Làm bài',
  },
  en: {
    headerTitle: 'Schedule & Challenges',
    headerSub: '',
    exportBtn: 'Export Excel',
    selectDayTitle: 'Select Day (Day 1 → Day {totalDays}):',
    openStatus: '🔓 Open',
    lockedStatus: '🔒 Locked',
    dayTitleLabel: 'Day Title',
    dayDateLabel: 'Display Date',
    saveDayMetaBtn: 'Save',
    activePlayersLabel: 'active players',
    lockDayBtn: 'Lock',
    unlockDayBtn: 'Unlock',
    nowSuffix: 'now',
    liveBannerTitle: '🟢 Active users on',
    liveBannerProtection: 'Snapshot Protection Active',
    questionListTitle: 'Question List',
    questionsCountUnit: 'questions',
    questionListSub: '',
    cloneAllBtn: 'Copy to all days',
    bulkImportBtn: 'Import Excel / CSV',
    addQuestionBtn: 'Add Question',
    questionPrefix: 'Q',
    correctAnsBadge: 'Correct',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 Video',
    editBtn: 'Edit',
    deleteBtnTitle: 'Delete question',
    lockModalTitle: 'Lock Options',
    lockModalSubPrefix: 'Currently',
    lockModalSubSuffix: 'users taking quiz',
    gracefulTitle: '🛡️ Graceful Lock (Recommended)',
    safeBadge: 'Safe',
    gracefulDesc:
      'Block new starts, allow in-progress users to finish (up to 15 mins).',
    forceTitle: '🚨 Force Lock Immediately',
    forceDesc:
      'Stop all active sessions immediately without consuming attempts.',
    modalAddTitle: '➕ Add Question to Day',
    modalEditTitle: '✏️ Edit Question',
    questionTypeLabel: 'Question Type *',
    promptTextLabel: 'Question Prompt *',
    targetWordLabel: 'Target Word/Phrase',
    statementTextLabel: 'Statement (True / False)',
    promptAudioTitle: 'Audio',
    showSpeakerLabel: 'Show speaker button',
    uploadAudioBtn: 'Upload Audio',
    uploadingText: 'Uploading...',
    testListenBtn: '🔊 Preview',
    promptVideoTitle: 'Video (.MP4 / Link)',
    uploadVideoBtn: 'Upload Video',
    removeVideoBtn: 'Remove Video',
    optionsSectionLabel: 'Answer Options:',
    correctSelectedBadge: '(Correct)',
    hasOptionSpeaker: 'Has speaker',
    explanationLabel: 'Explanation',
    cancelBtn: 'Cancel',
    saveQuestionBtn: 'Save Question',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: 'Multiple Choice (3 options)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: 'Audio / Video (3 options)',
      },
      {
        value: 'VOCAB_MEANING',
        label: 'Vocabulary / Acronym',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: 'Fill in the blank',
      },
    ],
    sidebarDashboard: 'Dashboard',
    sidebarDashboardSub: '',
    sidebarUsers: 'Users',
    sidebarUsersSub: '',
    sidebarChallenges: 'Schedule & Quiz',
    sidebarChallengesSub: '',
    sidebarEvents: 'Event Pop-ups',
    sidebarEventsSub: '',
    sidebarNotifications: 'Notifications',
    sidebarNotificationsSub: '',
    sidebarSecurity: 'Security',
    sidebarSecuritySub: '',
    backToQuiz: 'Back to Quiz',
    backToQuizShort: 'Quiz',
  },
  ko: {
    headerTitle: '일정 및 챌린지 관리',
    headerSub: '',
    exportBtn: '엑셀 내보내기',
    selectDayTitle: '챌린지 날짜 선택 (Day 1 → Day {totalDays}):',
    openStatus: '🔓 열림',
    lockedStatus: '🔒 잠김',
    dayTitleLabel: '일차 제목',
    dayDateLabel: '표시 날짜',
    saveDayMetaBtn: '저장',
    activePlayersLabel: '명 응시 중',
    lockDayBtn: '잠금',
    unlockDayBtn: '잠금 해제',
    nowSuffix: '즉시',
    liveBannerTitle: '🟢 응시 중인 임직원:',
    liveBannerProtection: '스냅샷 보호 활성화',
    questionListTitle: '문제 목록',
    questionsCountUnit: '문항',
    questionListSub: '',
    cloneAllBtn: '전체 일차 복사',
    bulkImportBtn: 'Excel / CSV 등록',
    addQuestionBtn: '새 문제 추가',
    questionPrefix: '문항',
    correctAnsBadge: '정답',
    mp3Badge: '🎵 MP3',
    videoBadge: '🎬 비디오',
    editBtn: '수정',
    deleteBtnTitle: '문제 삭제',
    lockModalTitle: '잠금 옵션',
    lockModalSubPrefix: '현재',
    lockModalSubSuffix: '명 응시 중',
    gracefulTitle: '소프트 잠금 (권장)',
    safeBadge: '안전',
    gracefulDesc:
      '신규 진입 차단, 현재 응시자는 제출 허용.',
    forceTitle: '즉시 강제 잠금',
    forceDesc:
      '진행 중인 모든 세션 즉시 중단.',
    modalAddTitle: '➕ 새 문제 추가 - Day',
    modalEditTitle: '✏️ 문제 수정 - 문항',
    questionTypeLabel: '문제 유형 *',
    promptTextLabel: '문제 내용 *',
    targetWordLabel: '발음 단어 / 구문',
    statementTextLabel: '진술문 (True / False)',
    promptAudioTitle: '오디오',
    showSpeakerLabel: '스피커 표시',
    uploadAudioBtn: '오디오 업로드',
    uploadingText: '업로드 중...',
    testListenBtn: '🔊 듣기',
    promptVideoTitle: '비디오',
    uploadVideoBtn: '비디오 업로드',
    removeVideoBtn: '비디오 삭제',
    optionsSectionLabel: '답안 보기:',
    correctSelectedBadge: '(정답)',
    hasOptionSpeaker: '스피커',
    explanationLabel: '상세 해설',
    cancelBtn: '취소',
    saveQuestionBtn: '문제 저장',
    types: [
      {
        value: 'CHOOSE_AUDIO',
        label: '객관식 (3개 보기)',
      },
      {
        value: 'TRUE_FALSE',
        label: 'True / False (참/거짓)',
      },
      {
        value: 'LISTEN_AND_CHOOSE',
        label: '듣기 / 비디오 (3개 보기)',
      },
      {
        value: 'VOCAB_MEANING',
        label: '단어 의미 / 약어 (3개 보기)',
      },
      {
        value: 'FILL_IN_THE_BLANK',
        label: '빈칸 채우기',
      },
    ],
    sidebarDashboard: '대시보드',
    sidebarDashboardSub: '',
    sidebarUsers: '임직원',
    sidebarUsersSub: '',
    sidebarChallenges: '21일 챌린지',
    sidebarChallengesSub: '',
    sidebarEvents: '이벤트 팝업',
    sidebarEventsSub: '',
    sidebarNotifications: '알림',
    sidebarNotificationsSub: '',
    sidebarSecurity: '보안',
    sidebarSecuritySub: '',
    backToQuiz: '시험 화면으로',
    backToQuizShort: '시험',
  },
};
