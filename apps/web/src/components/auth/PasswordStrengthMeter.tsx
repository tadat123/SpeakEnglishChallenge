import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PasswordCriteria } from '../../utils/validation';
import { Lang } from '../../utils/i18n';

export const PasswordStrengthMeter: React.FC<{
  criteria: PasswordCriteria;
  lang: Lang;
  darkMode: boolean;
}> = ({ criteria, lang, darkMode }) => {
  const L = (vi: string, en: string, ko: string) => (lang === 'en' ? en : lang === 'ko' ? ko : vi);

  return (
    <div className="space-y-2 mt-2">
      {/* 1. Thanh đo độ mạnh (4 segments) + Nhãn */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-bold flex items-center gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{L('Độ mạnh mật khẩu:', 'Password strength:', '비밀번호 강도:')}</span>
          </span>
          {criteria.level !== 'EMPTY' ? (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-xs ${criteria.badgeBg}`}>
              {criteria.levelText[lang] || criteria.levelText.vi}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">
              {L('Chưa nhập', 'Empty', '미입력')}
            </span>
          )}
        </div>

        {/* Thanh 4 vạch (Segments) */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((seg) => (
            <div
              key={seg}
              className={`h-full rounded-full transition-all duration-300 ${
                seg <= criteria.activeBars
                  ? criteria.barColor
                  : darkMode
                  ? 'bg-slate-700'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. Bảng 5 tiêu chuẩn bảo mật chi tiết */}
      <div
        className={`grid grid-cols-2 gap-x-2 gap-y-1.5 p-2.5 rounded-2xl text-[11px] border transition ${
          darkMode
            ? 'bg-slate-800/80 border-slate-700/60'
            : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            criteria.minLength
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.minLength ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Tối thiểu 8 ký tự', '8+ characters', '8자 이상')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasUpper
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasUpper ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ HOA (A-Z)', 'Uppercase (A-Z)', '대문자 (A-Z)')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasLower
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasLower ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ thường (a-z)', 'Lowercase (a-z)', '소문자 (a-z)')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            criteria.hasNumber
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasNumber ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Chữ số (0-9)', 'Number (0-9)', '숫자 (0-9)')}</span>
        </div>

        <div
          className={`col-span-2 flex items-center gap-1.5 ${
            criteria.hasSpecial
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {criteria.hasSpecial ? (
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">•</span>
          )}
          <span>{L('Ký tự đặc biệt (!@#$...)', 'Special char (!@#$...)', '특수문자 (!@#$...)')}</span>
        </div>
      </div>
    </div>
  );
};
