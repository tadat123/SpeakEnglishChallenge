import React from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lock,
  Star,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  SharedThemeProps,
  TabType,
  formatTimeMmSs,
} from '../app/appTypes';

interface QuizResultViewProps extends SharedThemeProps {
  quizResult: any;
  isGuest: boolean;
  user: any;
  totalDays: number;
  midnightCountdown: string;
  adminPreviewResult: boolean;
  setAdminPreviewResult: (v: boolean) => void;
  showDetailedReview: boolean;
  setShowDetailedReview: (v: boolean) => void;
  onOpenAuth: (mode: 'login' | 'register', notice?: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onSpeak: (id: string, textToSpeak: string, audioUrl?: string) => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  quizResult,
  isGuest,
  user,
  totalDays,
  midnightCountdown,
  adminPreviewResult,
  setAdminPreviewResult,
  showDetailedReview,
  setShowDetailedReview,
  onOpenAuth,
  onNavigateTab,
  onSpeak,
  darkMode,
  cardBg,
  subCardBg,
  textPrimary,
  textSecondary,
  t,
  L,
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      {!quizResult.resultsRevealed && !adminPreviewResult ? (
        <div className={`rounded-3xl shadow-xl border p-6 text-center ${cardBg}`}>
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Clock className="w-9 h-9" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-blue-600">
            {L(
              `🎉 Đã ghi nhận bài nộp Day ${quizResult.dayNumber}!`,
              `🎉 Day ${quizResult.dayNumber} submission recorded!`,
              `🎉 Day ${quizResult.dayNumber} 제출 완료!`
            )}
          </h2>
          <p className={`text-xs sm:text-sm font-bold mt-1 ${textPrimary}`}>
            {L(
              'Thời gian hoàn thành (Tính đến Câu 10):',
              'Completion time (Questions 1–10):',
              '소요 시간 (1~10번):'
            )}{' '}
            {formatTimeMmSs(Math.round(quizResult.timeSpentMs / 1000))}
          </p>

          <div
            className={`my-5 p-4 sm:p-5 rounded-3xl border text-left space-y-2.5 ${
              darkMode
                ? 'bg-amber-950/40 border-amber-700/70 text-amber-200'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="text-xs sm:text-sm font-black flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {L(
                  'Chế độ Bảo mật Đáp án & Kết quả khi Challenge đang diễn ra',
                  'Active Challenge Security Mode',
                  '진행 중 챌린지 보안 모드'
                )}
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {L(
                'Theo thể lệ chương trình, người chơi chưa biết ngay đáp án đúng/sai lúc vừa nộp bài để đảm bảo tính công bằng. Điểm số và giải thích đáp án chi tiết sẽ tự động được công bố ngay khi Challenge của ngày hôm nay kết thúc (lúc 00:00 đêm nay)!',
                'To ensure competition fairness, correct/wrong answers remain hidden right after submission. Full scores and detailed explanations will be automatically published at midnight (00:00 tonight)!',
                '공정한 경쟁을 위해 제출 직후에는 정답 여부가 공개되지 않습니다. 최종 점수와 상세 해설은 오늘 자정(00:00) 챌린지 마감 후 자동 공개됩니다!'
              )}
            </p>
            <div className="pt-1 flex items-center justify-between text-xs font-extrabold">
              <span>
                {L(
                  '⏳ Thời gian mở công bố kết quả & Challenge mới:',
                  '⏳ Results & New Challenge Release:',
                  '⏳ 결과 및 새 챌린지 공개:'
                )}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-black">
                00:00{' '}
                {L(
                  `(còn ${midnightCountdown})`,
                  `(${midnightCountdown} left)`,
                  `(${midnightCountdown} 남음)`
                )}
              </span>
            </div>
          </div>

          {quizResult.q11Pronunciation?.submitted && (
            <div className={`mb-5 p-4 rounded-2xl border text-left text-xs space-y-1.5 ${subCardBg}`}>
              <div className="font-black text-indigo-600">
                {L(
                  '🎙️ Đã hoàn thành tự luyện phát âm Câu 11 (Không tính điểm):',
                  '🎙️ Completed Q11 Pronunciation Practice (Untimed):',
                  '🎙️ 11번 문항 발음 연습 완료 (점수 미반영):'
                )}
              </div>
              <p className={textSecondary}>{quizResult.q11Pronunciation.aiSummaryFeedback}</p>
            </div>
          )}

          {isGuest && (
            <div className="my-5 p-4 sm:p-5 rounded-3xl border text-center space-y-3 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-blue-500/15 border-amber-400">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow">
                ⭐
              </div>
              <div>
                <h3 className="text-base font-black text-amber-700 dark:text-amber-300">
                  {L(
                    'Bạn đang ở Chế độ Khách (Chưa lưu điểm)',
                    'You are in Guest Mode (Score not saved)',
                    '게스트 모드 (미저장)'
                  )}
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  {L(
                    `Bài làm của bạn đã được ghi nhận tạm thời. Để lưu điểm vào hệ thống, tính vào tiến độ ${totalDays > 0 ? `${totalDays} ngày` : 'thử thách'} và tham gia Bảng xếp hạng Samsung, vui lòng đăng nhập hoặc tạo tài khoản ngay!`,
                    `Your submission was temporarily recorded. To save your score, count towards the ${totalDays > 0 ? `${totalDays}-day` : ''} challenge and join the Samsung leaderboard, please log in or create an account!`,
                    `제출이 임시 기록되었습니다. ${totalDays > 0 ? `${totalDays}일 ` : ''}챌린지 진행도 및 랭킹에 반영하려면 지금 로그인하거나 가입하세요!`
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenAuth(
                      'register',
                      L(
                        '✨ Đăng ký tài khoản nhanh (Số GEN + Gmail) để lưu kết quả bài thi hôm nay!',
                        "✨ Register now (GEN ID + Gmail) to save today's score!",
                        '✨ 오늘 점수를 저장하려면 사번과 이메일로 가입하세요!'
                      )
                    )
                  }
                  className="py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md transition"
                >
                  🚀 {L('Tạo tài khoản để lưu điểm', 'Register to save score', '가입하고 점수 저장')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenAuth(
                      'login',
                      L(
                        'Đăng nhập bằng Số GEN (8 số) để lưu kết quả bài làm vào tài khoản của bạn.',
                        'Log in with GEN ID to save your score to your account.',
                        '계정에 점수를 저장하려면 사번으로 로그인하세요.'
                      )
                    )
                  }
                  className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md transition"
                >
                  🔑 {L('Đã có tài khoản? Đăng nhập', 'Already have account? Log in', '로그인')}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => onNavigateTab('home')}
              className="flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
            >
              {t.backToHome}
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setAdminPreviewResult(true)}
                className={`px-4 py-3.5 rounded-2xl font-bold text-xs border ${subCardBg}`}
              >
                👁️{' '}
                {L('Xem trước kết quả (Quyền Admin)', 'Preview Result (Admin)', '결과 미리보기 (관리자)')}
              </button>
            )}
          </div>
        </div>
      ) : !showDetailedReview ? (
        <div className={`rounded-3xl shadow-xl border p-6 text-center ${cardBg}`}>
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center mb-2">
            <Star className="w-10 h-10 text-amber-400 fill-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-rose-500">Great Job!</h2>
          <p className={`text-sm font-bold ${textPrimary}`}>
            {t.completedDayMsg} Day {quizResult.dayNumber}
          </p>

          <div className={`my-5 p-4 rounded-3xl border ${subCardBg}`}>
            {quizResult.isExpired ? (
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs mb-2">
                  {L(
                    '🎯 Bài thi luyện tập — Không tính điểm Bảng Xếp Hạng',
                    '🎯 Practice Mode — Score not counted on Leaderboard',
                    '🎯 연습 모드 — 리더보드 점수 미반영'
                  )}
                </div>
                <div className="text-3xl font-black text-slate-700 dark:text-slate-200">
                  {quizResult.practiceScore ?? quizResult.score}/{quizResult.totalPoints}{' '}
                  {t.pointsSuffix}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                  {L(
                    'Bạn đã hoàn thành bài để luyện tập. Do nộp sau ngày thi chính thức nên điểm bài này không được cộng vào BXH.',
                    'Practice completed. Since it was submitted after the deadline, this score is not added to the Leaderboard.',
                    '연습을 완료했습니다. 공식 기한 이후 제출되어 리더보드 점수에는 반영되지 않습니다.'
                  )}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-4xl font-black text-blue-600">
                  {quizResult.score}/{quizResult.totalPoints} {t.pointsSuffix}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  {(() => {
                    const qCount =
                      quizResult.detailedReview?.length ||
                      (Number(quizResult.correctCount || 0) + Number(quizResult.wrongCount || 0));
                    return L(
                      `(Điểm từ ${qCount || 'các'} câu trắc nghiệm & điền từ • Luyện đọc không tính giờ, không tính điểm)`,
                      `(Score from ${qCount || 'official'} questions • Pronunciation practice is untimed & ungraded)`,
                      `(공식 ${qCount || ''}문항 점수 • 발음 연습은 시간 및 점수 미반영)`
                    );
                  })()}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
              <div>
                <span className="text-base font-black text-emerald-600 block">
                  {quizResult.correctCount}
                </span>
                {t.correctCountLabel}
              </div>
              <div>
                <span className="text-base font-black text-rose-600 block">
                  {quizResult.wrongCount}
                </span>
                {t.wrongCountLabel}
              </div>
              <div>
                <span className="text-base font-black text-blue-600 block">
                  {formatTimeMmSs(Math.round(quizResult.timeSpentMs / 1000))}
                </span>
                {t.timeSpentLabel}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                setShowDetailedReview(true);
                window.location.hash = `#review/${quizResult.dayNumber}`;
              }}
              className="py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"
            >
              {t.viewDetailedAnswers}
            </button>
            <button
              onClick={() => onNavigateTab('home')}
              className={`py-3.5 rounded-2xl font-bold text-sm ${
                darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t.backToHome}
            </button>
          </div>
        </div>
      ) : (
        <div className={`rounded-3xl shadow-xl border p-4 sm:p-6 ${cardBg}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
            <button
              onClick={() => setShowDetailedReview(false)}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600"
            >
              <ChevronLeft className="w-5 h-5" /> {t.resultBtn}
            </button>
            <h3 className={`text-sm sm:text-base font-black ${textPrimary}`}>
              Day {quizResult.dayNumber}
            </h3>
            <button
              onClick={() => onNavigateTab('home')}
              className="text-xs font-bold text-slate-500"
            >
              {t.closeBtn}
            </button>
          </div>

          <div className="space-y-2.5">
            {(quizResult.detailedReview || []).map((item: any) => (
              <div
                key={item.questionId}
                className={`p-3 rounded-2xl border ${
                  item.isCorrect
                    ? 'bg-emerald-50/80 border-emerald-200 text-slate-900'
                    : 'bg-rose-50/80 border-rose-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-extrabold">
                      {t.questionLabel} {item.orderIndex}: {item.correctOptionText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSpeak(`rev-${item.questionId}`, item.targetWord)}
                    className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-700 mt-1 pl-6">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
