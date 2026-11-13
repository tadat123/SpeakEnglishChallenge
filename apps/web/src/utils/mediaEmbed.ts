import { resolveMediaUrl } from './clientApiFallback';

export interface ParsedMediaResource {
  kind: 'youtube' | 'vimeo' | 'gdrive' | 'video' | 'external';
  resolvedUrl: string;
  embedUrl?: string;
  label: string;
}

function parseTimeSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return null;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

/**
 * Phân tích URL video hoặc liên kết tham khảo phát âm để chọn cách phát/nhúng phù hợp.
 */
export function parseQuestionMediaUrl(rawUrl?: string): ParsedMediaResource | null {
  const clean = String(rawUrl || '').trim();
  if (!clean) return null;

  const resolvedUrl = resolveMediaUrl(clean) || clean;

  // Các file video trực tiếp hoặc đường dẫn upload nội bộ (/api/uploads/...)
  if (
    resolvedUrl.startsWith('/api/uploads/') ||
    /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(resolvedUrl)
  ) {
    return {
      kind: 'video',
      resolvedUrl,
      label: 'Video',
    };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(resolvedUrl);
  } catch {
    return {
      kind: 'video',
      resolvedUrl,
      label: 'Video',
    };
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  // 1. YouTube (watch, youtu.be, shorts, embed)
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be' ||
    host === 'youtube-nocookie.com'
  ) {
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (parsed.pathname.startsWith('/watch')) {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    } else if (parsed.pathname.startsWith('/live/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    }

    if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      const startSec = parseTimeSeconds(
        parsed.searchParams.get('t') || parsed.searchParams.get('start')
      );
      const endSec = parseTimeSeconds(parsed.searchParams.get('end'));
      const embedParams = new URLSearchParams({ rel: '0', modestbranding: '1' });
      if (startSec && startSec > 0) embedParams.set('start', String(startSec));
      if (endSec && endSec > 0) embedParams.set('end', String(endSec));

      return {
        kind: 'youtube',
        resolvedUrl,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`,
        label: 'YouTube',
      };
    }
  }

  // 2. Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeoMatch = parsed.pathname.match(/(\d{5,15})/);
    if (vimeoMatch) {
      return {
        kind: 'vimeo',
        resolvedUrl,
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        label: 'Vimeo',
      };
    }
  }

  // 3. Google Drive (video/audio file preview)
  if (host === 'drive.google.com') {
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    const idParam = parsed.searchParams.get('id');
    const driveId = fileMatch?.[1] || idParam;
    if (driveId) {
      return {
        kind: 'gdrive',
        resolvedUrl,
        embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
        label: 'Google Drive',
      };
    }
  }

  // 4. Các link web ngoài (YouGlish, Cambridge, Oxford, Forvo...) -> mở tab mới an toàn
  return {
    kind: 'external',
    resolvedUrl,
    label: host,
  };
}

export interface DictionaryAudioLookupResult {
  word: string;
  audioUrl: string;
  ipa?: string;
}

/**
 * Tra nhanh file MP3 phát âm chuẩn từ Free Dictionary API (Wikimedia Commons) cho từ đơn tiếng Anh.
 */
export async function lookupDictionaryAudio(rawInput: string): Promise<DictionaryAudioLookupResult | null> {
  const cleaned = String(rawInput || '')
    .replace(/\/[^/]+\//g, ' ')
    .trim();
  const wordMatch = cleaned.match(/[a-zA-Z]+(?:-[a-zA-Z]+)?/);
  const word = wordMatch?.[0]?.toLowerCase();
  if (!word) return null;

  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) return null;

  const entries = await res.json();
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const phonetics: Array<{ text?: string; audio?: string }> = [];
  for (const entry of entries) {
    if (Array.isArray(entry?.phonetics)) {
      phonetics.push(...entry.phonetics);
    }
  }

  const withAudio = phonetics.filter((p) => p?.audio && String(p.audio).trim().length > 0);
  if (withAudio.length === 0) return null;

  const preferred =
    withAudio.find((p) => String(p.audio).includes('-us.')) ||
    withAudio.find((p) => String(p.audio).includes('-uk.')) ||
    withAudio[0];

  const ipaEntry = phonetics.find((p) => p?.text)?.text || preferred?.text;
  return {
    word,
    audioUrl: String(preferred.audio).trim(),
    ipa: ipaEntry,
  };
}
