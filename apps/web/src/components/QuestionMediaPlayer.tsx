import React from 'react';
import { ExternalLink, Youtube, Film } from 'lucide-react';
import { parseQuestionMediaUrl } from '../utils/mediaEmbed';

interface QuestionMediaPlayerProps {
  url?: string;
  darkMode: boolean;
  compact?: boolean;
}

/**
 * Hiển thị video trực tiếp (.mp4/.webm), nhúng iframe (YouTube, Vimeo, Google Drive),
 * hoặc thẻ liên kết mở nguồn phát âm tham khảo bên ngoài.
 */
export const QuestionMediaPlayer: React.FC<QuestionMediaPlayerProps> = ({
  url,
  darkMode,
  compact = false,
}) => {
  const media = parseQuestionMediaUrl(url);
  if (!media) return null;

  if (media.kind === 'youtube' || media.kind === 'vimeo' || media.kind === 'gdrive') {
    return (
      <div
        className={`rounded-2xl overflow-hidden border ${
          darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-950 border-blue-200'
        }`}
      >
        <div className="px-3 py-1.5 bg-slate-900/90 text-slate-200 text-[11px] font-bold flex items-center justify-between border-b border-slate-800">
          <span className="inline-flex items-center gap-1.5">
            {media.kind === 'youtube' ? (
              <Youtube className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Film className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{media.label}</span>
          </span>
          <a
            href={media.resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 text-[10px]"
          >
            <span>Mở gốc</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className={`w-full ${compact ? 'max-h-52 aspect-video mx-auto' : 'aspect-video'}`}>
          <iframe
            src={media.embedUrl}
            title={`Question ${media.label} media`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (media.kind === 'external') {
    return (
      <a
        href={media.resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition ${
          darkMode
            ? 'bg-slate-900/70 border-slate-700 hover:border-blue-500 text-slate-100'
            : 'bg-blue-50/70 border-blue-200 hover:border-blue-400 text-slate-800'
        }`}
      >
        <div className="min-w-0">
          <div className="text-xs font-extrabold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Liên kết phát âm / tài liệu tham khảo ({media.label})</span>
          </div>
          <div className="text-[11px] opacity-75 truncate mt-0.5">{media.resolvedUrl}</div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold shrink-0">
          Mở ↗
        </span>
      </a>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-slate-950 border flex justify-center ${
        darkMode ? 'border-slate-700' : 'border-blue-200'
      }`}
    >
      <video
        src={media.resolvedUrl}
        controls
        playsInline
        className={compact ? 'max-h-44 w-auto' : 'max-h-56 w-full object-contain'}
      />
    </div>
  );
};
