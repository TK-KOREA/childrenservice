// 행사 내용(JSON)과 참석 회신(Apps Script → 구글 시트)을 불러오고 보낸다.
import { API_URL } from './config.js';

export const isPreview = !API_URL;

export async function loadIndex() {
  const res = await fetch('events/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('행사 목록을 불러오지 못했어요.');
  return res.json();
}

export async function loadEvent(id) {
  if (!/^\d{8}_[a-z0-9_]+$/.test(id)) throw new Error('없는 행사예요.');
  const res = await fetch(`events/${id}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('행사 안내를 불러오지 못했어요.');
  return res.json();
}

/** 참석 현황: { responses: [...], updatedAt } */
export async function loadStatus(eventId) {
  if (isPreview) return { responses: previewRows(eventId), updatedAt: new Date().toISOString() };
  const res = await fetch(`${API_URL}?action=status&event=${encodeURIComponent(eventId)}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '현황을 불러오지 못했어요.');
  return data;
}

/** 회신 보내기. 같은 가정이름이면 시트에서 덮어쓴다. */
export async function sendRsvp(eventId, form) {
  if (isPreview) {
    const rows = previewRows(eventId).filter((r) => r.family !== form.family);
    rows.push({ ...form, updatedAt: new Date().toISOString() });
    try { localStorage.setItem(previewKey(eventId), JSON.stringify(rows)); } catch {}
    return { ok: true, responses: rows };
  }
  // text/plain으로 보내야 Apps Script가 CORS 사전 요청 없이 받는다.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'rsvp', event: eventId, ...form }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '보내지 못했어요. 잠시 뒤 다시 해 주세요.');
  return data;
}

// ── 미리보기 모드: 시안 확인용 예시 데이터 ──
const previewKey = (id) => `sg-preview-${id}`;
function previewRows(eventId) {
  try {
    const saved = JSON.parse(localStorage.getItem(previewKey(eventId)) || 'null');
    if (saved) return saved;
  } catch {}
  if (eventId !== '20261017_seoulgrandpark') return [];
  return [
    { family: '예시) 김OO 가정', attend: 'Y', adults: 2, kids: 2, toddlers: 0, dinner: 'Y', note: '' },
    { family: '예시) 이OO 가정', attend: 'Y', adults: 1, kids: 2, toddlers: 1, dinner: 'Y', note: '' },
    { family: '예시) 박OO 가정', attend: 'N', adults: 0, kids: 0, toddlers: 0, dinner: 'N', note: '다음에 꼭 갈게요' },
  ];
}
