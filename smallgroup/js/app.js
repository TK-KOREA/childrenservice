// 어린이소그룹: 행사 목록(홈) → 행사 한 장 요약 + 회신 시트 → 자세히(일정·비용·준비물·저녁·현황).
import { h, icon, toast, md, dday as ddayAt, toDate, won } from './ui.js';
import * as api from './api.js';
import { GROUP_NAME, CONTACT_NOTE } from './config.js';

const main = document.getElementById('app');
let index = null;

// 확인용: 주소에 ?now=2026-10-17T14:40 을 붙이면 그 시각 기준으로 화면을 그린다 (당일 화면 미리 보기).
const NOW_OVERRIDE = Date.parse(new URLSearchParams(location.search).get('now') || '');
const now = () => (Number.isNaN(NOW_OVERRIDE) ? new Date() : new Date(NOW_OVERRIDE));
const dday = (s) => ddayAt(s, now());

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

window.addEventListener('hashchange', route);
route();

async function route() {
  const m = location.hash.match(/^#\/e\/([\w-]+)/);
  try {
    if (!index) index = (await api.loadIndex()).events;
    if (m) await renderEvent(m[1]);
    else renderHome();
  } catch (err) {
    main.replaceChildren(h('div', { class: 'wrap' }, h('p', { class: 'error' }, err.message),
      h('a', { class: 'btn ghost', href: '#/' }, '처음으로')));
  }
  main.focus({ preventScroll: true });
}

// 마지막 날이 오늘보다 앞이면 지난 행사
const isPast = (e) => dday(e.endDate || e.date) < 0;

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
/** "모레 · 토요일" */
function whenLabel(e) {
  const d = dday(e.date);
  const wd = WEEKDAY[toDate(e.date).getDay()];
  if (d < 0) return isPast(e) ? '지난 행사' : '진행 중';
  if (d === 0) return `오늘 · ${wd}`;
  if (d === 1) return `내일 · ${wd}`;
  if (d === 2) return `모레 · ${wd}`;
  return `${d}일 뒤 · ${md(e.date)}`;
}

/** '13:50' → '오후 1:50' */
function ampm(t) {
  const [hh, mm] = t.split(':').map(Number);
  return `${hh < 12 ? '오전' : '오후'} ${hh % 12 || 12}:${String(mm).padStart(2, '0')}`;
}
const later = (m) => (m < 60 ? `${m}분 뒤` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''} 뒤`);
const toMin = (t) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };

// ───────────────────────── 홈 ─────────────────────────
function renderHome() {
  document.title = GROUP_NAME;
  window.scrollTo(0, 0);
  const upcoming = index.filter((e) => !isPast(e)).sort((a, b) => toDate(a.date) - toDate(b.date));
  const past = index.filter(isPast).sort((a, b) => toDate(b.date) - toDate(a.date));
  const [next, ...later] = upcoming;

  main.replaceChildren(
    h('div', { class: 'wrap home' },
      h('header', { class: 'home-head' }, h('h1', null, GROUP_NAME)),

      next ? nextCard(next) : h('div', { class: 'empty' }, '지금은 예정된 행사가 없어요. 새 소식이 오면 여기 맨 위에 떠요.'),

      later.length > 0 && h('section', { class: 'sec' },
        h('h2', null, '이어서 있을 행사'),
        h('div', { class: 'list' }, later.map((e) => rowCard(e)))),

      past.length > 0 && h('details', { class: 'past' },
        h('summary', null, `지난 행사 ${past.length}개`, icon('chevron', 16)),
        h('div', { class: 'list' }, past.map((e) => rowCard(e, true)))),

      h('p', { class: 'foot' }, CONTACT_NOTE)),
  );
}

function nextCard(e) {
  return h('a', { class: 'next-card', href: `#/e/${e.id}` },
    h('div', { class: 'art', html: art(e.theme) }),
    h('div', { class: 'next-body' },
      h('p', { class: 'when' }, whenLabel(e)),
      h('h2', null, e.title),
      h('p', { class: 'meta' }, `${md(e.date)} · ${e.time}`),
      h('p', { class: 'meta' }, e.place),
      h('span', { class: 'btn primary block' }, '안내 보고 회신하기')));
}

function rowCard(e, past = false) {
  const href = past && e.link ? e.link : `#/e/${e.id}`;
  return h('a', { class: `row${past ? ' is-past' : ''}`, href },
    h('div', { class: 'row-date' },
      h('b', null, toDate(e.date).getDate()),
      h('span', null, `${toDate(e.date).getMonth() + 1}월`)),
    h('div', { class: 'row-body' },
      h('strong', null, e.title),
      h('span', null, `${e.time} · ${e.place}`)),
    icon('chevron', 18));
}

// ───────────────────────── 행사 ─────────────────────────
let last = { yes: 0 };   // 공유 문구에 쓰는 최근 현황

async function renderEvent(id) {
  const ev = await api.loadEvent(id);
  const meta = index.find((e) => e.id === id) || ev;
  document.title = `${meta.title} | ${GROUP_NAME}`;
  const past = isPast(meta);
  const closed = past || (ev.deadline && now() > Date.parse(ev.deadline));
  const sheet = past ? null : rsvpSheet(ev, closed);

  const page = h('div', { class: 'event' },
    h('div', { class: 'topbar' },
      h('a', { class: 'icon-btn', href: '#/', 'aria-label': '행사 목록' }, icon('back', 22)),
      h('b', null, GROUP_NAME),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': '공유하기', onclick: () => share(meta) }, icon('share', 20))),

    h('div', { class: 'wrap' },
      // ── 한 장 요약 ──
      h('div', { class: 'art hero-art', html: art(ev.theme) }),
      h('p', { class: 'when' }, whenLabel(meta)),
      h('h1', null, meta.title),

      !past && h('div', { id: 'now' }),
      !past && h('div', { id: 'mine' }),
      factsView(ev),
      closed && !past && dday(meta.date) > 0 && h('p', { class: 'fine' }, '회신이 마감됐어요. 바꿀 일이 있으면 섬기는 분께 말씀해 주세요.'),
      !past && h('button', { class: 'faces', id: 'faces', type: 'button', onclick: () => jump('status') },
        h('span', { class: 'faces-text' }, h('small', null, '함께 가는 가정을 불러오는 중…'))),

      past && ev.lead && h('p', { class: 'lead' }, ev.lead),
      past && ev.link && h('a', { class: 'btn ghost block', href: ev.link }, '그때 안내 페이지 보기'),

      // ── 자세히 ──
      ev.schedule && sec('schedule', '일정', ev.scheduleLede,
        h('ol', { class: 'timeline', id: 'timeline' }, ev.schedule.map((s) => h('li', { 'data-t': s.time },
          h('time', null, h('small', null, ampm(s.time).split(' ')[0]), ampm(s.time).split(' ')[1]),
          h('div', null,
            h('strong', null, s.title, s.tag && h('em', null, s.tag)),
            s.desc && h('p', null, s.desc))))),
        ev.scheduleNote && h('p', { class: 'fine' }, ev.scheduleNote)),

      ev.fees && sec('fees', '비용', ev.fees.title, feesView(ev.fees)),
      ev.parking && sec('parking', '주차', ev.parking.title, parkingView(ev.parking)),
      ev.bring && sec('bring', '챙길 것', null, bringView(ev)),
      ev.notices && sec('notice', '꼭 알아 주세요', null, h('ul', { class: 'notices' }, ev.notices.map((n) => h('li', null, n)))),
      !past && sec('status', '함께 가는 가정', null, h('div', { id: 'status' }, h('p', { class: 'muted' }, '불러오는 중…'))),

      h('p', { class: 'foot' }, CONTACT_NOTE)),

    !past && !closed && h('div', { class: 'cta' },
      h('button', { class: 'btn primary block', id: 'cta-btn', type: 'button', onclick: () => sheet.open() }, '참석 회신'),
      ev.deadlineLabel && h('small', null, deadlineText(ev))),
    sheet?.el,
  );

  main.replaceChildren(page);
  window.scrollTo(0, 0);
  if (!past) {
    drawMine(ev, sheet, closed);
    startClock(ev);
    refreshStatus(ev);
  }
}

function sec(id, title, lede, ...body) {
  return h('section', { class: 'sec', id: `s-${id}` }, h('h2', null, title), lede && h('p', { class: 'lede' }, lede), ...body);
}

function jump(k) {
  document.getElementById(`s-${k}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/** 마감이 오늘이면 "오늘 밤 10시까지" */
function deadlineText(ev) {
  const label = ev.deadlineLabel;
  if (!ev.deadline) return label;
  const d = new Date(Date.parse(ev.deadline));
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const left = dday(key);
  if (left === 0) return label.replace(/^.*?\)\s*/, '오늘 ');
  if (left === 1) return label.replace(/^.*?\)\s*/, '내일 ');
  return label;
}

// 요점 네 줄: 모임·비용은 행사 JSON의 summary, 저녁·챙길 것은 자동으로.
function factsView(ev) {
  const rows = [...(ev.summary || (ev.overview || []).slice(0, 2).map((o) => ({ k: o.label, v: o.value, sub: o.sub })))];
  const has = (to) => rows.some((r) => r.to === to);
  if (ev.bring && !has('bring')) rows.push({ k: '챙길 것', v: ev.bring.slice(0, 3).map((b) => b.item).join(', '), to: 'bring' });
  // 저녁 줄은 식당 이름이 바뀌면 저절로 따라가도록 JSON의 dinner에서 만든다 (챙길 것 앞에, 누르면 지도).
  if (ev.dinner) {
    const at = rows.findIndex((r) => r.to === 'bring');
    const d = ev.dinner;
    rows.splice(at < 0 ? rows.length : at, 0, { k: '저녁', v: `${ampm(d.time.split(/\s*~/)[0])} · ${d.name || '식당 정하는 중'}`, sub: d.address, map: d.name && (d.map || d.address || d.name) });
  }
  if (rows.length === 0) return null;
  return h('div', { class: 'facts' }, rows.map((r) => {
    const inner = [
      h('span', { class: 'k' }, r.k),
      h('span', { class: 'v' }, h('b', null, r.v), r.sub && h('small', null, r.sub)),
      r.map ? h('span', { class: 'go' }, '지도') : r.to && h('span', { class: 'go' }, icon('chevron', 16)),
    ];
    if (r.map) return h('a', { class: 'fact', href: `https://map.naver.com/p/search/${encodeURIComponent(r.map)}`, target: '_blank', rel: 'noopener' }, inner);
    if (r.to) return h('button', { class: 'fact', type: 'button', onclick: () => jump(r.to) }, inner);
    return h('div', { class: 'fact' }, inner);
  }));
}

// ───────────────────────── 당일: 지금 · 다음 ─────────────────────────
let clock;
function startClock(ev) {
  clearInterval(clock);
  const tick = () => {
    if (!document.getElementById('now')) return clearInterval(clock);
    drawNow(ev);
  };
  tick();
  clock = setInterval(tick, 30000);
}

function drawNow(ev) {
  const box = document.getElementById('now');
  const steps = document.querySelectorAll('#timeline li');
  const isDay = dday(ev.date) === 0 && ev.schedule?.length;
  if (!isDay) { box.replaceChildren(); return; }

  const n = now(), cur = n.getHours() * 60 + n.getMinutes();
  const items = ev.schedule.map((s, i, all) => ({ ...s, s: toMin(s.time), e: all[i + 1] ? toMin(all[i + 1].time) : toMin(s.time) + 90 }));
  const i = items.findIndex((x) => cur >= x.s && cur < x.e);
  steps.forEach((el, k) => {
    el.classList.toggle('is-now', k === i);
    el.classList.toggle('is-done', cur >= items[k].e);
  });

  const nextList = (from) => items.slice(from, from + 2).map((x) => h('div', { class: 'next-step' },
    h('time', null, ampm(x.time).split(' ')[1]),
    h('div', null, h('b', null, x.title), h('small', null, later(x.s - cur)))));

  if (cur < items[0].s) {
    const f = items[0];
    box.replaceChildren(h('div', { class: 'now-card' },
      h('small', null, `곧 · ${ampm(f.time)}`), h('b', null, f.title), f.desc && h('span', null, f.desc)),
    ...nextList(1));
  } else if (i < 0) {
    box.replaceChildren(h('div', { class: 'now-card calm' }, h('small', null, '오늘'), h('b', null, '함께해서 고마워요'), h('span', null, '조심히 들어가세요.')));
  } else {
    const x = items[i];
    const pct = Math.round(((cur - x.s) / (x.e - x.s)) * 100);
    box.replaceChildren(h('div', { class: 'now-card' },
      h('small', null, `지금 · ${ampm(x.time)}부터`), h('b', null, x.title), x.desc && h('span', null, x.desc),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': '이 순서 진행' }, h('i', { style: `width:${pct}%` }))),
    ...nextList(i + 1));
  }
}

// ───────────────────────── 회신 시트 ─────────────────────────
const myKey = (ev) => `sg-me-${ev.id}`;
function loadMine(ev) { try { return JSON.parse(localStorage.getItem(myKey(ev)) || 'null'); } catch { return null; } }

function drawMine(ev, sheet, closed) {
  const box = document.getElementById('mine');
  const me = loadMine(ev);
  // 회신을 보낸 뒤에는 아래 고정 버튼 대신 초록 줄의 "고치기"를 쓴다.
  const cta = document.querySelector('.cta');
  if (cta) cta.hidden = !!me;
  if (!me) { box.replaceChildren(); return; }
  const n = (+me.adults) + (+me.kids) + (+me.toddlers);
  const text = me.attend === 'Y' ? `${me.family} · ${n}명${me.dinner === 'Y' ? ' · 저녁 함께' : ''}` : `${me.family} · 이번엔 못 가요`;
  box.replaceChildren(h('div', { class: `mine${me.attend === 'Y' ? '' : ' no'}` },
    icon('check', 18), h('span', null, text),
    !closed && h('button', { type: 'button', onclick: () => sheet.open() }, '고치기')));
}

function rsvpSheet(ev, closed) {
  const dlg = h('dialog', { class: 'sheet', 'aria-labelledby': 'sheet-title' });
  if (closed) return { el: dlg, open() {} };

  const saved = loadMine(ev);
  const st = { attend: saved?.attend || 'Y', dinner: saved?.dinner || 'Y' };

  const family = h('input', { id: 'f-family', type: 'text', required: true, maxlength: 30, placeholder: '예) 김OO 형제님 가정', value: saved?.family || '', autocomplete: 'off' });
  const counters = {};
  const counter = (k, label, sub) => {
    let v = saved?.[k] ?? (k === 'adults' ? 1 : 0);
    const out = h('output', { 'aria-live': 'polite' }, v);
    const set = (n) => { v = Math.max(0, Math.min(20, n)); out.textContent = v; counters[k].value = v; };
    counters[k] = { value: v };
    return h('div', { class: 'counter' },
      h('div', null, h('strong', null, label), sub && h('small', null, sub)),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', 'aria-label': `${label} 한 명 빼기`, onclick: () => set(v - 1) }, '−'),
        out,
        h('button', { type: 'button', 'aria-label': `${label} 한 명 더하기`, onclick: () => set(v + 1) }, '+')));
  };

  const seg = (name, label, options, onpick) => h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, options.map(([val, text]) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(st[name] === val), onclick: () => {
      st[name] = val;
      b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      onpick?.();
    } }, text);
    return b;
  }));

  const detail = h('div', { class: 'attend-detail' },
    h('div', { class: 'counters' },
      counter('adults', '어른', '만 19세 이상'),
      counter('kids', '아이', '만 6세 ~ 고등학생'),
      counter('toddlers', '유아', '만 5세 이하')),
    ev.dinner && h('div', null,
      h('p', { class: 'label' }, '저녁도 함께 먹나요?'),
      seg('dinner', '저녁 식사', [['Y', '함께 먹어요'], ['N', '나들이만']])));
  const syncAttend = () => { detail.hidden = st.attend !== 'Y'; };

  const note = h('textarea', { id: 'f-note', rows: 2, maxlength: 200, placeholder: '알레르기, 늦게 도착 등 (선택)' }, saved?.note || '');
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, '보내기');
  // 시트가 열려 있으면 화면 아래 알림이 시트 뒤에 가려지므로, 오류는 보내기 버튼 바로 위에 띄운다.
  const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
  // 이름 오류는 이름 칸 바로 아래, 나머지는 보내기 버튼 위에.
  const fail = (msg, near) => {
    err.textContent = msg; err.hidden = false;
    if (near) near.after(err); else submit.before(err);
    (near ? err : submit).scrollIntoView({ block: 'nearest' });
  };

  const form = h('form', { class: 'rsvp', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    err.hidden = true;
    const name = family.value.trim();
    if (!name) { fail('가정 이름을 적어 주세요.', family); family.focus({ preventScroll: true }); return; }
    const yes = st.attend === 'Y';
    const data = {
      family: name, attend: st.attend,
      adults: yes ? counters.adults.value : 0,
      kids: yes ? counters.kids.value : 0,
      toddlers: yes ? counters.toddlers.value : 0,
      dinner: yes && ev.dinner ? st.dinner : 'N',
      note: note.value.trim(),
    };
    if (yes && data.adults + data.kids + data.toddlers === 0) return fail('함께 가는 사람 수를 넣어 주세요.');
    submit.disabled = true; submit.textContent = '보내는 중…';
    try {
      await api.sendRsvp(ev.id, data);
      try { localStorage.setItem(myKey(ev), JSON.stringify(data)); } catch {}
      dlg.close();
      toast(yes ? '받았어요. 그날 만나요!' : '알려 주셔서 고마워요.');
      drawMine(ev, api_, false);
      refreshStatus(ev);
    } catch (e2) {
      // 통신이 끊기면 브라우저 영어 문구("Failed to fetch")가 오므로 우리말로 바꾼다.
      fail(e2 instanceof TypeError ? '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.' : e2.message);
    } finally { submit.disabled = false; submit.textContent = '보내기'; }
  } },
    h('div', { class: 'sheet-head' },
      h('h2', { id: 'sheet-title' }, '참석 회신'),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': '닫기', onclick: () => dlg.close() }, icon('close', 20))),
    api.isPreview && h('p', { class: 'preview-tag' }, '미리보기 모드 · 회신이 이 기기에만 저장돼요'),
    h('label', { class: 'label', for: 'f-family' }, '가정 이름'), family,
    seg('attend', '참석 여부', [['Y', '갈게요'], ['N', '이번엔 못 가요']], syncAttend),
    detail,
    h('label', { class: 'label', for: 'f-note' }, '남길 말'), note,
    h('p', { class: 'fine' }, '같은 가정 이름으로 다시 보내면 고쳐져요.'),
    err,
    submit);

  dlg.append(form);
  // 바깥(어두운 부분)을 누르면 닫는다
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  syncAttend();

  const api_ = { el: dlg, open() { dlg.showModal(); if (!family.value) family.focus(); } };
  return api_;
}

// ───────────────────────── 현황 ─────────────────────────
async function refreshStatus(ev) {
  const box = document.getElementById('status');
  if (!box) return;
  try {
    const { responses } = await api.loadStatus(ev.id);
    box.replaceChildren(statusView(ev, responses));
    drawFaces(responses);
  } catch (err) {
    box.replaceChildren(h('p', { class: 'error' }, err.message));
    document.getElementById('faces')?.replaceChildren(h('span', { class: 'faces-text' }, h('small', null, '현황을 불러오지 못했어요')));
  }
}

const sum = (list, k) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const initial = (name) => String(name).replace(/^예시\)\s*/, '').trim().charAt(0) || '?';

function avatar(name, i) {
  return h('span', { class: `av t${i % 4}`, 'aria-hidden': 'true' }, initial(name));
}

function drawFaces(rows) {
  const box = document.getElementById('faces');
  if (!box) return;
  const yes = rows.filter((r) => r.attend === 'Y');
  last.yes = yes.length;
  if (yes.length === 0) {
    box.replaceChildren(h('span', { class: 'faces-text' }, h('b', null, '아직 회신한 가정이 없어요'), h('small', null, '첫 회신을 보내 주세요')));
    return;
  }
  const shown = yes.slice(-4).reverse();
  const more = yes.length - shown.length;
  box.replaceChildren(
    h('span', { class: 'pile' }, shown.map((r, i) => avatar(r.family, i)), more > 0 && h('span', { class: 'av more', 'aria-hidden': 'true' }, `+${more}`)),
    h('span', { class: 'faces-text' },
      h('b', null, `${yes.length}가정이 함께 가요`),
      h('small', null, `어른 ${sum(yes, 'adults')} · 아이 ${sum(yes, 'kids') + sum(yes, 'toddlers')}`)),
    icon('chevron', 16));
}

function statusView(ev, rows) {
  const yes = rows.filter((r) => r.attend === 'Y');
  const no = rows.filter((r) => r.attend !== 'Y');
  const diners = yes.filter((r) => r.dinner === 'Y');
  const dinerCount = sum(diners, 'adults') + sum(diners, 'kids') + sum(diners, 'toddlers');

  return h('div', null,
    h('div', { class: 'stats' },
      h('div', null, h('b', null, yes.length), h('small', null, '가정')),
      h('div', null, h('b', null, sum(yes, 'adults')), h('small', null, '어른')),
      h('div', null, h('b', null, sum(yes, 'kids') + sum(yes, 'toddlers')), h('small', null, '아이')),
      ev.dinner && h('div', null, h('b', null, dinerCount), h('small', null, '저녁'))),
    yes.length === 0
      ? h('p', { class: 'muted' }, '아직 회신한 가정이 없어요.')
      : h('ul', { class: 'people' }, yes.map((r, i) => h('li', null,
        avatar(r.family, i),
        h('div', null,
          h('strong', null, r.family),
          h('small', null, `어른 ${r.adults} · 아이 ${(+r.kids) + (+r.toddlers)}${r.dinner === 'Y' ? ' · 저녁 함께' : ''}`)),
        h('b', null, `${(+r.adults) + (+r.kids) + (+r.toddlers)}명`)))),
    no.length > 0 && h('p', { class: 'fine' }, `이번엔 못 가요: ${no.map((r) => r.family).join(', ')}`),
    h('button', { class: 'btn ghost small', type: 'button', onclick: () => refreshStatus(ev) }, icon('refresh', 16), '새로고침'));
}

// ───────────────────────── 자세히 ─────────────────────────
function feesView(f) {
  return h('div', null,
    f.callout && h('div', { class: 'callout' }, icon('info', 20), h('div', null, h('strong', null, f.callout.title), h('p', null, f.callout.body))),
    h('ul', { class: 'prices' }, f.rows.map((r) => h('li', null,
      h('div', null, h('strong', null, r.who), h('small', null, r.age)),
      h('b', null, won(r.price))))),
    f.save && h('p', { class: 'save', html: f.save }),
    f.notes?.length > 0 && h('ul', { class: 'fine-list' }, f.notes.map((n) => h('li', null, n))));
}

function bringView(ev) {
  const key = `sg-bring-${ev.id}`;
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  return h('div', { class: 'checklist' }, ev.bring.map((b, i) => {
    const btn = h('button', { type: 'button', 'aria-pressed': String(done.includes(i)), onclick: () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      done = on ? [...done, i] : done.filter((x) => x !== i);
      try { localStorage.setItem(key, JSON.stringify(done)); } catch {}
    } },
      h('span', { class: 'box' }, icon('check', 14)),
      h('span', null, h('strong', null, b.item), b.note && h('small', null, b.note)));
    return btn;
  }));
}

const mapLink = (q) => h('a', { class: 'map-link', href: `https://map.naver.com/p/search/${encodeURIComponent(q)}`, target: '_blank', rel: 'noopener' },
  icon('map', 16), '지도에서 보기');

function parkingView(p) {
  return h('div', null,
    h('ul', { class: 'prices' }, p.rows.map(([k, v]) => h('li', null,
      h('div', null, h('strong', null, k), h('small', null, v))))),
    p.notes?.length > 0 && h('ul', { class: 'fine-list' }, p.notes.map((n) => h('li', null, n))),
    p.map && mapLink(p.map),
    p.source && h('p', { class: 'fine' }, p.source));
}

async function share(e) {
  const url = `${location.origin}${location.pathname}#/e/${e.id}`;
  const text = `${e.title} · ${md(e.date)} ${e.time}${last.yes ? `\n${last.yes}가정이 함께 가요. 회신해 주세요!` : ''}`;
  try {
    if (navigator.share) await navigator.share({ title: e.title, text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('링크를 복사했어요. 단톡방에 붙여 넣어 주세요.'); }
  } catch {}
}

// ───────────────────────── 테마 그림 ─────────────────────────
function art(theme) {
  const sky = 'var(--art-sky)';
  if (theme === 'zoo') {
    return `<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice" role="img" aria-label="단풍 든 언덕, 기린, 리프트">
      <rect width="320" height="120" fill="${sky}"/>
      <circle cx="252" cy="36" r="20" fill="var(--art-sun)"/>
      <path d="M0 80 Q80 52 160 74 T320 64 V120 H0z" fill="var(--art-hill1)"/>
      <path d="M0 98 Q100 78 200 98 T320 92 V120 H0z" fill="var(--art-hill2)"/>
      <g fill="var(--art-leaf1)"><circle cx="34" cy="80" r="12"/><circle cx="50" cy="85" r="9"/></g><rect x="40" y="85" width="3" height="16" fill="var(--art-trunk)"/>
      <g fill="var(--art-leaf2)"><circle cx="292" cy="80" r="11"/><circle cx="278" cy="86" r="8"/></g><rect x="289" y="86" width="3" height="14" fill="var(--art-trunk)"/>
      <path d="M110 8 L320 56" stroke="var(--art-trunk)" stroke-width="1.4"/>
      <g transform="translate(200 31) rotate(13)"><rect x="-1" y="0" width="2" height="7" fill="var(--art-trunk)"/><rect x="-9" y="7" width="18" height="13" rx="3" fill="var(--art-lift)"/><rect x="-6" y="10" width="12" height="5" rx="2" fill="var(--art-sun)"/></g>
      <g transform="translate(112 30)" fill="var(--art-giraffe)">
        <rect x="0" y="0" width="8" height="44" rx="4" transform="rotate(-12 4 44)"/>
        <ellipse cx="-6" cy="2" rx="9" ry="5.5"/>
        <ellipse cx="-10" cy="52" rx="21" ry="10.5"/>
        <rect x="-27" y="58" width="4.5" height="22" rx="2"/><rect x="-18" y="60" width="4.5" height="20" rx="2"/>
        <rect x="-2" y="58" width="4.5" height="22" rx="2"/><rect x="5" y="57" width="4.5" height="23" rx="2"/>
      </g>
      <g fill="var(--art-spot)"><circle cx="98" cy="80" r="3"/><circle cx="108" cy="86" r="2.6"/><circle cx="91" cy="88" r="2.2"/><circle cx="112" cy="56" r="1.9"/></g>
    </svg>`;
  }
  if (theme === 'sea') {
    return `<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice" role="img" aria-label="바다와 언덕">
      <rect width="320" height="120" fill="${sky}"/><circle cx="256" cy="38" r="18" fill="var(--art-sun)"/>
      <path d="M0 74 Q72 46 160 70 T320 63 V120 H0z" fill="var(--art-sea1)"/>
      <path d="M0 90 Q80 77 160 90 T320 87 V120 H0z" fill="var(--art-sea2)"/>
      <path d="M0 104 Q80 94 160 104 T320 102 V120 H0z" fill="var(--art-sea3)"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="320" height="120" fill="${sky}"/><circle cx="256" cy="38" r="18" fill="var(--art-sun)"/>
    <path d="M0 84 Q80 60 160 80 T320 74 V120 H0z" fill="var(--art-hill1)"/></svg>`;
}
