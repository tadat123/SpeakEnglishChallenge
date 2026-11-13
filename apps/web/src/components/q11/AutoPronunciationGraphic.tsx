import React from 'react';
import type { WorkplaceWordItem } from './q11Data';
import { analyzeWordPronunciation } from './q11Analyzer';

export interface AutoPronunciationGraphicProps {
  item: Partial<WorkplaceWordItem>;
  isPlaying?: boolean;
  darkMode?: boolean;
  compact?: boolean;
  onListen?: () => void;
}

/**
 * Hình vẽ SVG tự động sinh 100% từ 4 trường:
 * (Từ tiếng Anh, IPA, Nghĩa tiếng Việt, Hướng dẫn phát âm)
 * - Vẽ biểu đồ đường cong ngữ điệu (Pitch Contour) & cột nhịp trọng âm (▲ / •)
 * - Vẽ sơ đồ khẩu hình miệng & lưỡi (Tròn môi / Căng môi / Mở hàm / Đầu lưỡi)
 */
export const AutoPronunciationGraphic: React.FC<AutoPronunciationGraphicProps> = ({
  item,
  isPlaying = false,
  darkMode = false,
  compact = false,
  onListen,
}) => {
  const analysis = analyzeWordPronunciation(item);
  const { syllables, stressedIndex, mouthPosture, mouthLabelVi, endingCueVi } = analysis;

  // Tọa độ các nút âm tiết trên SVG đường cong ngữ điệu (ViewBox 220 x 72)
  const count = syllables.length;
  const svgWidth = 220;
  const points = syllables.map((syl, idx) => {
    const x =
      count === 1
        ? svgWidth / 2
        : 28 + (idx * (svgWidth - 56)) / Math.max(1, count - 1);
    const y = syl.stressed ? 16 : syl.secondary ? 32 : 46;
    return { x, y, ...syl };
  });

  // Tạo đường cong mượt nối các âm tiết
  const buildCurvePath = () => {
    if (points.length === 1) {
      const p = points[0];
      return `M 30 46 Q ${p.x} ${p.y - 10} ${svgWidth - 30} 46`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  return (
    <div
      onClick={onListen}
      role={onListen ? 'button' : undefined}
      tabIndex={onListen ? 0 : undefined}
      className={`rounded-xl border transition select-none overflow-hidden ${
        onListen ? 'cursor-pointer' : ''
      } ${compact ? 'p-2' : 'p-2.5 sm:p-3'} ${
        isPlaying
          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/20'
          : darkMode
          ? 'bg-slate-900/95 border-slate-700 hover:border-blue-500/60'
          : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 border-slate-200/90 hover:border-blue-300 shadow-inner'
      }`}
    >
      {/* Hàng trên: Badge Trọng âm + Badge Khẩu hình */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
            darkMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          ▲ Nhấn âm {stressedIndex + 1}/{count}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate ${
            darkMode
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          👄 {mouthPosture === 'rounded'
            ? 'Tròn môi'
            : mouthPosture === 'spread'
            ? 'Căng khóe môi'
            : mouthPosture === 'tongue'
            ? 'Cong/Bật lưỡi'
            : 'Mở rộng hàm'}
        </span>
      </div>

      {/* Khu vực Hình vẽ chính: Biểu đồ sóng trọng âm + Sơ đồ khẩu hình SVG */}
      <div className="grid grid-cols-12 gap-1.5 items-center">
        {/* Cột trái (8/12): Đường cong ngữ điệu & cột âm tiết */}
        <div className="col-span-8 flex flex-col items-center">
          <svg
            viewBox={`0 0 ${svgWidth} 64`}
            className={`w-full ${compact ? 'h-12' : 'h-14'} overflow-visible`}
          >
            <defs>
              <linearGradient id="stressCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Đường chuẩn ngang mờ */}
            <line
              x1="14"
              y1="48"
              x2={svgWidth - 14}
              y2="48"
              stroke={darkMode ? '#334155' : '#cbd5e1'}
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Đường cong nối cao độ giữa các âm tiết */}
            <path
              d={buildCurvePath()}
              fill="none"
              stroke="url(#stressCurveGrad)"
              strokeWidth="2.75"
              strokeLinecap="round"
            />

            {/* Các cột & điểm nút âm tiết */}
            {points.map((pt, idx) => (
              <g key={idx}>
                {/* Cột thẳng đứng từ đáy lên điểm nhấn */}
                <line
                  x1={pt.x}
                  y1="52"
                  x2={pt.x}
                  y2={pt.y}
                  stroke={pt.stressed ? '#f59e0b' : '#3b82f6'}
                  strokeWidth={pt.stressed ? '5' : '3'}
                  strokeLinecap="round"
                  opacity={pt.stressed ? 0.9 : 0.45}
                />

                {/* Nút tròn tại đỉnh âm tiết */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.stressed ? (isPlaying ? 8 : 6.5) : 4.5}
                  fill={pt.stressed ? '#f59e0b' : '#3b82f6'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Ký hiệu ▲ cho trọng âm chính */}
                {pt.stressed && (
                  <text
                    x={pt.x}
                    y={pt.y - 9}
                    textAnchor="middle"
                    fill={darkMode ? '#fcd34d' : '#d97706'}
                    fontSize="9"
                    fontWeight="900"
                  >
                    ▲
                  </text>
                )}

                {/* Nhãn IPA / Âm tiết bên dưới */}
                <text
                  x={pt.x}
                  y="62"
                  textAnchor="middle"
                  fill={
                    pt.stressed
                      ? darkMode
                        ? '#fbbf24'
                        : '#b45309'
                      : darkMode
                      ? '#94a3b8'
                      : '#475569'
                  }
                  fontSize={count > 3 ? '8.5' : '9.5'}
                  fontWeight={pt.stressed ? '900' : '700'}
                >
                  {pt.ipaPart.length > 7 ? `${pt.ipaPart.slice(0, 6)}…` : pt.ipaPart}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Cột phải (4/12): Sơ đồ Khẩu hình miệng SVG tự động */}
        <div
          className={`col-span-4 flex flex-col items-center justify-center rounded-lg p-1 border ${
            darkMode
              ? 'bg-slate-800/90 border-slate-700'
              : 'bg-white/90 border-slate-200/80'
          }`}
        >
          <svg
            viewBox="0 0 80 54"
            className={`${compact ? 'w-12 h-9' : 'w-14 h-10'} overflow-visible`}
          >
            {mouthPosture === 'rounded' && (
              <g>
                {/* Khẩu hình Tròn môi (→ ○ ←) */}
                <ellipse
                  cx="40"
                  cy="27"
                  rx="14"
                  ry="14"
                  fill="#fb7185"
                  fillOpacity="0.2"
                  stroke="#e11d48"
                  strokeWidth="3"
                />
                <ellipse
                  cx="40"
                  cy="27"
                  rx="7.5"
                  ry="7.5"
                  fill={darkMode ? '#0f172a' : '#1e293b'}
                />
                {/* Mũi tên chụm vào */}
                <path
                  d="M 10 27 L 21 27 M 17 23 L 21 27 L 17 31"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 70 27 L 59 27 M 63 23 L 59 27 L 63 31"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'spread' && (
              <g>
                {/* Khẩu hình Căng ngang khóe miệng (← ▬▬ →) */}
                <path
                  d="M 16 26 Q 40 16 64 26 Q 40 38 16 26 Z"
                  fill="#fb7185"
                  fillOpacity="0.22"
                  stroke="#e11d48"
                  strokeWidth="2.75"
                />
                <path
                  d="M 22 26 Q 40 23 58 26 Q 40 32 22 26 Z"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {/* Mũi tên kéo sang 2 bên */}
                <path
                  d="M 15 26 L 6 26 M 10 22 L 6 26 L 10 30"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 65 26 L 74 26 M 70 22 L 74 26 L 70 30"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'open' && (
              <g>
                {/* Khẩu hình Hạ hàm mở rộng (↓ ◯ ↑) */}
                <ellipse
                  cx="40"
                  cy="26"
                  rx="18"
                  ry="14"
                  fill="#fb7185"
                  fillOpacity="0.22"
                  stroke="#e11d48"
                  strokeWidth="2.75"
                />
                <ellipse
                  cx="40"
                  cy="26"
                  rx="12"
                  ry="9.5"
                  fill={darkMode ? '#0f172a' : '#1e293b'}
                />
                {/* Răng trên */}
                <path
                  d="M 31 18 Q 40 20 49 18"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Mũi tên hạ hàm xuống */}
                <path
                  d="M 40 42 L 40 51 M 36 47 L 40 51 L 44 47"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}

            {mouthPosture === 'tongue' && (
              <g>
                {/* Khẩu hình Đầu lưỡi nâng chạm hàm trên (/l/, /t/, /d/, /n/) */}
                <path
                  d="M 16 28 Q 40 14 64 28 Q 40 42 16 28 Z"
                  fill="#fb7185"
                  fillOpacity="0.2"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                />
                {/* Lưỡi cong lên chạm vòm họng trên */}
                <path
                  d="M 26 35 Q 40 34 45 20 Q 50 32 54 35"
                  fill="#f43f5e"
                  fillOpacity="0.65"
                  stroke="#be123c"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Điểm chạm hàm trên */}
                <circle cx="45" cy="19" r="3" fill="#f59e0b" />
              </g>
            )}
          </svg>
          <span
            className={`text-[9px] font-extrabold text-center leading-tight line-clamp-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {mouthLabelVi}
          </span>
        </div>
      </div>

      {/* Dòng nhắc phát âm dưới đáy hình vẽ */}
      <div
        className={`mt-1.5 pt-1 border-t flex items-center justify-between gap-1 text-[10px] ${
          darkMode ? 'border-slate-800 text-blue-300' : 'border-slate-200/70 text-blue-700'
        }`}
      >
        <span className="font-bold truncate">{endingCueVi}</span>
        {onListen && (
          <span className="font-extrabold shrink-0 text-amber-600 dark:text-amber-400">
            🔊 Nghe
          </span>
        )}
      </div>
    </div>
  );
};
