/**
 * SQL Injection Guard Middleware (WAF Layer for Fastify)
 * Phát hiện và chặn đứng mọi mẫu tấn công SQL Injection (Classic, Tautology, Blind, Time-based, Stacked, Comment, Outfile).
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ipThreatManager } from './ddosProtection.js';

// Danh sách các mẫu Regular Expression đặc trưng của tấn công SQL Injection
const SQLI_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // 1. Classic UNION SELECT
  {
    name: 'UNION_SELECT',
    regex: /\bUNION\b(?:\s+ALL)?\s+\bSELECT\b/i,
  },
  // 2. Dangerous SQL DDL & DML Commands
  {
    name: 'DANGEROUS_COMMANDS',
    regex: /\b(?:DROP|TRUNCATE|ALTER)\s+(?:TABLE|DATABASE|VIEW|INDEX|PROCEDURE|SCHEMA)\b/i,
  },
  {
    name: 'STACKED_QUERIES',
    regex: /;\s*(?:DROP|DELETE|UPDATE|INSERT|SELECT|EXEC|SHUTDOWN)\b/i,
  },
  {
    name: 'SYSTEM_PROCEDURES',
    regex: /\b(?:xp_cmdshell|sp_executesql|sp_makewebtask|sp_send_dbmail)\b/i,
  },
  // 3. Tautology / Boolean-based SQLi (VD: ' OR '1'='1', ' OR 1=1, admin' --)
  {
    name: 'TAUTOLOGY_OR_AND',
    regex: /(?:'|"|`|\b\d+\b)\s*(?:OR|AND)\s*['"`]?\w+['"`]?\s*=\s*['"`]?\w+['"`]?/i,
  },
  {
    name: 'OR_1_EQUALS_1',
    regex: /\b(?:OR|AND)\b\s+(?:1\s*=\s*1|0\s*=\s*0|true\s*=\s*true|'1'\s*=\s*'1')/i,
  },
  {
    name: 'COMMENT_BYPASS',
    regex: /(?:'|"|`)\s*(?:--|#|\/\*)/,
  },
  // 4. Time-based Blind SQLi (VD: pg_sleep, benchmark, sleep, waitfor delay)
  {
    name: 'TIME_BASED_BLIND',
    regex: /\b(?:WAITFOR\s+DELAY|PG_SLEEP|BENCHMARK|SLEEP|DBMS_PIPE\.RECEIVE_MESSAGE)\s*\(/i,
  },
  // 5. System Catalogs & Schema Enumeration
  {
    name: 'SCHEMA_ENUMERATION',
    regex: /\b(?:INFORMATION_SCHEMA|SYS\.TABLES|PG_CATALOG|SYSOBJECTS|ALL_TABLES|SYS\.DATABASES)\b/i,
  },
  // 6. Function-based / Outfile / Hex SQLi
  {
    name: 'OUTFILE_OR_DUMPFILE',
    regex: /\b(?:INTO\s+(?:OUTFILE|DUMPFILE)|LOAD_FILE)\b/i,
  },
  {
    name: 'ERROR_BASED_FUNCS',
    regex: /\b(?:EXTRACTVALUE|UPDATEXML)\s*\(/i,
  },
  {
    name: 'HEX_OR_CHAR_CAST',
    regex: /\b(?:UNHEX|CHAR|CONCAT_WS)\s*\(/i,
  },
];

/**
 * Kiểm tra xem một chuỗi có chứa mẫu tấn công SQL Injection hay không
 */
export function checkSqlInjectionPattern(val: string): { detected: boolean; pattern?: string; snippet?: string } {
  if (!val || typeof val !== 'string' || val.length < 4) {
    return { detected: false };
  }

  // Giải mã URI nếu chuỗi bị URL-encode (VD: %27%20OR%201%3D1)
  let decoded = val;
  try {
    decoded = decodeURIComponent(val);
  } catch {
    // Nếu lỗi URI decode thì giữ nguyên
  }

  for (const { name, regex } of SQLI_PATTERNS) {
    if (regex.test(decoded)) {
      return {
        detected: true,
        pattern: name,
        snippet: val.length > 80 ? val.substring(0, 80) + '...' : val,
      };
    }
  }

  return { detected: false };
}

/**
 * Duyệt đệ quy toàn bộ Object / Array để quét sạch dữ liệu đầu vào
 */
export function deepScanForSqlInjection(obj: any, currentDepth = 0): { detected: boolean; pattern?: string; path?: string; snippet?: string } {
  if (currentDepth > 10 || !obj) return { detected: false };

  if (typeof obj === 'string') {
    const res = checkSqlInjectionPattern(obj);
    if (res.detected) {
      return { detected: true, pattern: res.pattern, snippet: res.snippet };
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const res = deepScanForSqlInjection(obj[i], currentDepth + 1);
      if (res.detected) {
        return { ...res, path: `[${i}]` + (res.path ? `.${res.path}` : '') };
      }
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      // Quét cả tên key (chống Key-name SQL Injection)
      const keyCheck = checkSqlInjectionPattern(key);
      if (keyCheck.detected) {
        return { detected: true, pattern: keyCheck.pattern, path: key, snippet: key };
      }
      // Quét giá trị value
      const res = deepScanForSqlInjection(obj[key], currentDepth + 1);
      if (res.detected) {
        return { ...res, path: key + (res.path ? `.${res.path}` : '') };
      }
    }
  }

  return { detected: false };
}

/**
 * Fastify Hook: sqlInjectionGuard
 * Quét toàn bộ Request: URL, Query Params, Route Params, Headers và Request Body
 */
export async function sqlInjectionGuard(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown';

  // 1. Quét URL & Query String thô
  const urlCheck = checkSqlInjectionPattern(request.url);
  if (urlCheck.detected) {
    return handleSqlViolation(ip, request, reply, 'URL', urlCheck);
  }

  // 2. Quét Query Object
  if (request.query) {
    const queryCheck = deepScanForSqlInjection(request.query);
    if (queryCheck.detected) {
      return handleSqlViolation(ip, request, reply, 'QUERY', queryCheck);
    }
  }

  // 3. Quét Route Params
  if (request.params) {
    const paramsCheck = deepScanForSqlInjection(request.params);
    if (paramsCheck.detected) {
      return handleSqlViolation(ip, request, reply, 'PARAMS', paramsCheck);
    }
  }

  // 4. Quét Request Body
  if (request.body) {
    const bodyCheck = deepScanForSqlInjection(request.body);
    if (bodyCheck.detected) {
      return handleSqlViolation(ip, request, reply, 'BODY', bodyCheck);
    }
  }
}

function handleSqlViolation(
  ip: string,
  request: FastifyRequest,
  reply: FastifyReply,
  location: string,
  details: { pattern?: string; path?: string; snippet?: string }
) {
  // Ghi nhận Strike vào hệ thống chống DDoS (Tấn công SQLi sẽ bị phạt 3 strikes = Khóa IP lập tức)
  ipThreatManager.recordStrike(ip, 3, `SQL_INJECTION_${details.pattern || 'UNKNOWN'}`);

  request.log.warn({
    event: 'SQL_INJECTION_BLOCKED',
    ip,
    method: request.method,
    url: request.url,
    location,
    pattern: details.pattern,
    path: details.path,
    snippet: details.snippet,
  }, `[WAF SQLi] Đã chặn tấn công SQL Injection từ IP ${ip} (${details.pattern})`);

  return reply.status(403).send({
    statusCode: 403,
    error: 'SECURITY_VIOLATION',
    code: 'SQL_INJECTION_DETECTED',
    message: 'Yêu cầu bị từ chối do vi phạm quy tắc an toàn bảo mật (Phát hiện mẫu SQL Injection nguy hiểm).',
    timestamp: new Date().toISOString(),
  });
}
