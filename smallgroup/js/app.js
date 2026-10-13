// 어린이소그룹: 행사 목록(홈) → 행사 안내 → 참석 회신·현황.
import { h, icon, toast, md, dday, toDate, won } from './ui.js';
import * as api from './api.js';
import { GROUP_NAME, CONTACT_NOTE } from './config.js';

const main = document.getElementById('app');
let index = null;

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

// ───────────────────────── 홈 ─────────────────────────
function renderHome() {
  document.title = GROUP_NAME;
  window.scrollTo(0, 0);
  const upcoming = index.filter((e) => !isPast(e)).sort((a, b) => toDate(a.date) - toDate(b.date));
  const past = index.filter(isPast).sort((a, b) => toDate(b.date) - toDate(a.date));
  const [next, ...later] = upcoming;

  main.replaceChildren(
    h('div', { class: 'wrap home' },
      h('header', { class: 'home-head' },
        h('p', { class: 'kicker' }, '우리 아이들 함께 자라요'),
        h('h1', null, GROUP_NAME)),

      next ? nextCard(next) : h('div', { class: 'card empty' }, '지금은 예정된 행사가 없어요. 새 소식이 오면 여기 맨 위에 떠요.'),

      later.length > 0 && h('section', { class: 'sec' },
        h('h2', null, '이어서 있을 행사'),
        h('div', { class: 'list' }, later.map((e) => rowCard(e)))),

      past.length > 0 && h('details', { class: 'past' },
        h('summary', null, `지난 행사 ${past.length}개`, icon('chevron', 16)),
        h('div', { class: 'list' }, past.map((e) => rowCard(e, true)))),

      h('p', { class: 'foot' }, CONTACT_NOTE)),
  );
}

function ddayLabel(e) {
  const d = dday(e.date);
  if (d === 0) return '오늘';
  if (d < 0) return '진행 중';
  return `D-${d}`;
}

// 다가오는 행사: 절취선 있는 입장권 모양
function nextCard(e) {
  return h('a', { class: 'ticket next', href: `#/e/${e.id}` },
    h('div', { class: 't-main' },
      h('div', { class: 't-art', html: art(e.theme) }),
      h('div', { class: 't-body' },
        h('div', { class: 't-kicker' }, '다가오는 행사'),
        h('h2', { class: 't-title small' }, e.title),
        h('p', { class: 'meta' }, icon('calendar', 16), `${md(e.date)} · ${e.time}`),
        h('p', { class: 'meta' }, icon('pin', 16), e.place),
        h('span', { class: 'btn dark block' }, '안내 보고 참석 회신하기', icon('chevron', 18)))),
    h('div', { class: 't-stub' }, h('span', { class: 'no' }, 'ADMIT ONE FAMILY'), h('span', { class: 'dd' }, ddayLabel(e))));
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

// ───────────────────────── 행사 안내 ─────────────────────────
async function renderEvent(id) {
  const ev = await api.loadEvent(id);
  const meta = index.find((e) => e.id === id) || ev;
  document.title = `${meta.title} | ${GROUP_NAME}`;
  const past = isPast(meta);
  const closed = past || (ev.deadline && Date.now() > Date.parse(ev.deadline));

  const sections = [
    ev.passes && ['passes', '탑승권'],
    ev.schedule && ['schedule', '일정'],
    ev.fees && ['fees', '입장료'],
    ev.bring && ['bring', '준비물'],
    ev.dinner && ['food', '저녁'],
    !past && ['rsvp', '회신'],
    !past && ['status', '현황'],
  ].filter(Boolean);

  const page = h('div', { class: 'event' },
    h('div', { class: 'topbar' },
      h('a', { class: 'icon-btn', href: '#/', 'aria-label': '행사 목록' }, icon('back', 22)),
      h('b', null, GROUP_NAME),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': '공유하기', onclick: () => share(meta) }, icon('share', 20))),

    h('div', { class: 'wrap' },
      ticketView(ev, meta, past),

      !past && ev.ticket?.start && h('div', { class: 'count', 'aria-label': '출발까지 남은 시간' },
        h('div', null, h('b', { id: 'cd-d' }, '0'), h('small', null, '일')),
        h('div', null, h('b', { id: 'cd-h' }, '0'), h('small', null, '시간')),
        h('div', null, h('b', { id: 'cd-m' }, '0'), h('small', null, '분'))),

      !past && ev.deadlineLabel && h('p', { class: `deadline${closed ? ' closed' : ''}` },
        icon('clock', 16), closed ? '회신이 마감됐어요' : `회신 마감 ${ev.deadlineLabel}`),

      sections.length > 2 && h('nav', { class: 'chips', 'aria-label': '바로가기' },
        sections.map(([k, label]) => h('a', { href: `#/e/${id}`, onclick: (e) => { e.preventDefault(); jump(k); } }, label))),

      ev.overview && sec('overview', '오는 길', null, h('div', { class: 'card' },
        ev.overview.map((o) => h('div', { class: 'ov' },
          h('span', { class: 'ov-ic' }, icon(o.icon, 20)),
          h('div', null, h('small', null, o.label), h('strong', null, o.value), o.sub && h('span', null, o.sub)))))),

      ev.passes && sec('passes', ev.passes.title, ev.passes.lede, h('div', { class: 'passes' },
        ev.passes.list.map((p) => h('div', { class: `pass ${p.dir}` },
          h('div', { class: 'ic' }, icon(p.icon, 24)),
          h('small', null, p.when), h('strong', null, p.name), h('p', null, p.desc))))),

      ev.schedule && sec('schedule', '오늘의 순서', '당일에는 지금 할 차례에 초록 테두리가 생겨요.',
        h('ol', { class: 'stubs', id: 'stubs' }, ev.schedule.map((s) => h('li', { class: `stub${s.tag ? ' key' : ''}`, 'data-t': s.time },
          h('time', null, s.time),
          h('div', null,
            h('strong', null, s.title, s.tag && h('em', null, s.tag)),
            s.desc && h('p', null, s.desc))))),
        ev.scheduleNote && h('p', { class: 'note' }, icon('info', 16), ev.scheduleNote)),

      ev.fees && sec('fees', '입장료', ev.fees.title, feesView(ev.fees)),

      ev.bring && sec('bring', '챙겼나요?', '챙긴 물건을 누르면 도장이 쾅!', bringView(ev)),

      ev.dinner && sec('food', '저녁 식사', null, dinnerView(ev.dinner)),

      ev.notices && sec('notice', '꼭 알아 주세요', null, h('ul', { class: 'notes' }, ev.notices.map((n) => h('li', null, n)))),

      !past && sec('rsvp', '참석 회신', null, rsvpView(ev, closed)),
      !past && sec('status', '참석 현황', null, h('div', { id: 'status' }, h('p', { class: 'muted' }, '불러오는 중…'))),

      past && ev.link && h('a', { class: 'btn ghost block', href: ev.link }, '그때 안내 페이지 보기'),
      h('p', { class: 'foot' }, CONTACT_NOTE)),

    !past && !closed && h('div', { class: 'cta' },
      h('button', { class: 'btn dark block', type: 'button', onclick: () => jump('rsvp') },
        '참석 도장 찍기', ev.deadlineLabel && h('span', { class: 'pill' }, ev.deadlineLabel.replace(/ 밤.*$/, '까지'))),
  ));

  main.replaceChildren(page);
  window.scrollTo(0, 0);
  startClock(ev);

  // 회신·현황이 화면에 보이면 아래 고정 버튼은 숨긴다 (폼을 가리지 않게)
  const cta = page.querySelector('.cta');
  if (cta && 'IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
      cta.classList.toggle('gone', seen.size > 0);
    });
    ['s-rsvp', 's-status'].forEach((k) => io.observe(document.getElementById(k)));
  }
  if (!past) refreshStatus(ev);
}

function sec(id, title, lede, ...body) {
  return h('section', { class: 'sec', id: `s-${id}` }, h('h2', null, title), lede && h('p', { class: 'lede' }, lede), ...body);
}

// 행사 입장권. ev.ticket이 없으면 제목·안내문으로 채운다.
function ticketView(ev, meta, past) {
  const t = ev.ticket || {};
  const grid = t.grid || [['DATE', md(meta.date)], ['TIME', meta.time], ['PLACE', meta.place]];
  return h('article', { class: 'ticket', 'aria-label': `${meta.title} 입장권` },
    h('div', { class: 't-main' },
      h('div', { class: 't-art', html: art(ev.theme) }),
      h('div', { class: 't-body' },
        h('div', { class: 't-kicker' }, t.kicker || ev.kicker),
        h('h1', { class: 't-title' }, t.title || meta.title),
        h('p', { class: 't-sub' }, t.sub || ev.lead),
        h('div', { class: 't-grid' }, grid.map(([k, v]) => h('div', null, h('small', null, k), h('strong', null, v)))))),
    h('div', { class: 't-stub' },
      h('span', { class: 'no' }, t.no || 'ADMIT ONE FAMILY'),
      h('span', { class: 'dd', id: 'dd' }, past ? 'THANKS' : ddayLabel(meta))),
    t.stamp && h('div', { class: 'stamp', 'aria-hidden': 'true' }, t.stamp.map((s, i) => [i ? h('br') : null, s])));
}

// 출발 카운트다운과 당일 "지금 여기" 표시. 30초마다 다시 계산한다.
let clock;
function startClock(ev) {
  clearInterval(clock);
  const start = ev.ticket?.start ? Date.parse(ev.ticket.start) : null;
  const toMin = (t) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };
  const tick = () => {
    if (!document.body.contains(document.getElementById('stubs') || document.getElementById('cd-d'))) return clearInterval(clock);
    const now = new Date();
    if (start) {
      const ms = Math.max(0, start - now);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('cd-d', Math.floor(ms / 864e5)); set('cd-h', Math.floor(ms / 36e5) % 24); set('cd-m', Math.floor(ms / 6e4) % 60);
    }
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 6e4);
    const isDay = dday(ev.date) === 0, cur = kst.getHours() * 60 + kst.getMinutes();
    const items = [...document.querySelectorAll('#stubs .stub')];
    items.forEach((el, i) => {
      const s = toMin(el.dataset.t), e = items[i + 1] ? toMin(items[i + 1].dataset.t) : s + 90;
      el.classList.toggle('now', isDay && cur >= s && cur < e);
      el.classList.toggle('done', isDay && cur >= e);
    });
  };
  tick();
  clock = setInterval(tick, 30000);
}

function jump(k) {
  document.getElementById(`s-${k}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

async function share(e) {
  const url = `${location.origin}${location.pathname}#/e/${e.id}`;
  const text = `${e.title} · ${md(e.date)} ${e.time}`;
  try {
    if (navigator.share) await navigator.share({ title: e.title, text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('링크를 복사했어요. 단톡방에 붙여 넣어 주세요.'); }
  } catch {}
}

// 요금: 가격표 태그
function feesView(f) {
  return h('div', null,
    h('div', { class: 'tags' }, f.rows.map((r) => h('div', { class: 'tag' },
      h('strong', null, r.who), h('small', null, r.age),
      r.was && h('s', null, r.was.toLocaleString('ko-KR')),
      h('b', null, won(r.price))))),
    f.save && h('div', { class: 'save', html: f.save }),
    f.notes?.length > 0 && h('ul', { class: 'fine' }, f.notes.map((n) => h('li', null, n))),
    f.source && h('p', { class: 'src' }, f.source));
}

// 준비물: 누르면 "챙김" 도장
function bringView(ev) {
  const key = `sg-bring-${ev.id}`;
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  return h('div', { class: 'bring' }, ev.bring.map((b, i) => {
    const btn = h('button', { type: 'button', class: b.highlight ? 'hl' : null, 'aria-pressed': String(done.includes(i)), onclick: () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      done = on ? [...done, i] : done.filter((x) => x !== i);
      try { localStorage.setItem(key, JSON.stringify(done)); } catch {}
    } },
      h('strong', null, b.item), b.note && h('small', null, b.note),
      h('span', { class: 'ok', 'aria-hidden': 'true' }, '챙김'));
    return btn;
  }));
}

// 식당이 정해지기 전에는 name을 비워 두면 "정하는 중" 안내가 나간다.
function dinnerView(d) {
  return h('div', { class: `dinner${d.name ? '' : ' pending'}` },
    h('span', { class: 'plate' }, icon('meal', 26)),
    h('div', null,
      h('small', null, d.time),
      h('strong', null, d.name || '식당은 정하는 중이에요'),
      !d.name && d.pending && h('p', null, d.pending),
      d.address && h('p', null, icon('pin', 14), d.address),
      d.note && h('p', null, d.note),
      d.name && h('a', { class: 'map-link', href: `https://map.naver.com/p/search/${encodeURIComponent(d.address || d.name)}`, target: '_blank', rel: 'noopener' },
        icon('map', 14), '지도에서 보기')));
}

// ───────────────────────── 참석 회신 ─────────────────────────
function rsvpView(ev, closed) {
  if (closed) return h('div', { class: 'card empty' }, '회신이 마감됐어요. 변경은 섬기는 분께 직접 말씀해 주세요.');

  const saved = (() => { try { return JSON.parse(localStorage.getItem(`sg-me-${ev.id}`) || 'null'); } catch { return null; } })();
  const st = { attend: saved?.attend || '', dinner: saved?.dinner || 'Y' };

  const family = h('input', { id: 'f-family', type: 'text', required: true, maxlength: 30, placeholder: '예) 김OO 형제님 가정', value: saved?.family || '', autocomplete: 'off' });
  const counters = {};
  const counter = (k, label, sub, min = 0) => {
    let v = saved?.[k] ?? (k === 'adults' ? 1 : 0);
    const out = h('output', null, v);
    const set = (n) => { v = Math.max(min, Math.min(20, n)); out.textContent = v; counters[k].value = v; };
    counters[k] = { value: v };
    return h('div', { class: 'counter' },
      h('div', null, h('strong', null, label), h('small', null, sub)),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', 'aria-label': `${label} 한 명 빼기`, onclick: () => set(v - 1) }, '−'),
        out,
        h('button', { type: 'button', 'aria-label': `${label} 한 명 더하기`, onclick: () => set(v + 1) }, '+')));
  };

  const seg = (name, options, onpick) => h('div', { class: 'seg', role: 'radiogroup' }, options.map(([val, label]) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(st[name] === val), onclick: () => {
      st[name] = val;
      b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      onpick?.();
    } }, label);
    return b;
  }));

  const detail = h('div', { class: 'attend-detail' },
    h('p', { class: 'label' }, '함께 가는 사람'),
    h('div', { class: 'card counters' },
      counter('adults', '어른', '만 19세 이상'),
      counter('kids', '아이', '만 6세 ~ 고등학생'),
      counter('toddlers', '유아', '만 5세 이하')),
    ev.dinner && h('div', null,
      h('p', { class: 'label' }, '저녁 식사도 함께 하나요?'),
      seg('dinner', [['Y', '함께 먹어요'], ['N', '나들이만']])));

  function syncAttend() { detail.hidden = st.attend !== 'Y'; }

  const note = h('textarea', { rows: 2, maxlength: 200, placeholder: '알레르기, 늦게 도착 등 (선택)' }, saved?.note || '');
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, saved ? '회신 고치기' : '회신 보내기');

  const form = h('form', { class: 'rsvp', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const name = family.value.trim();
    if (!name) { family.focus(); return toast('가정이름을 적어 주세요.'); }
    if (!st.attend) return toast('참석하는지 골라 주세요.');
    const yes = st.attend === 'Y';
    const data = {
      family: name, attend: st.attend,
      adults: yes ? counters.adults.value : 0,
      kids: yes ? counters.kids.value : 0,
      toddlers: yes ? counters.toddlers.value : 0,
      dinner: yes && ev.dinner ? st.dinner : 'N',
      note: note.value.trim(),
    };
    if (yes && data.adults + data.kids + data.toddlers === 0) return toast('함께 가는 사람 수를 넣어 주세요.');
    submit.disabled = true; submit.textContent = '보내는 중…';
    try {
      await api.sendRsvp(ev.id, data);
      try { localStorage.setItem(`sg-me-${ev.id}`, JSON.stringify(data)); } catch {}
      toast(yes ? '고마워요! 회신을 받았어요.' : '알려 주셔서 고마워요.');
      submit.textContent = '회신 고치기';
      refreshStatus(ev);
      jump('status');
    } catch (err) {
      toast(err.message);
      submit.textContent = saved ? '회신 고치기' : '회신 보내기';
    } finally { submit.disabled = false; }
  } },
    h('p', { class: 'muted' }, '가정마다 한 번만 보내 주세요. 같은 가정이름으로 다시 보내면 고쳐져요.'),
    api.isPreview && h('p', { class: 'preview-tag' }, '미리보기 모드 · 회신이 이 기기에만 저장돼요'),
    h('div', { class: 'card form' },
      h('label', { class: 'label', for: 'f-family' }, '가정이름'), family,
      h('p', { class: 'label' }, '참석 여부'),
      seg('attend', [['Y', '참석해요'], ['N', '이번엔 못 가요']], syncAttend),
      detail,
      h('label', { class: 'label' }, '남길 말', note),
      submit));

  syncAttend();
  return form;
}

// ───────────────────────── 참석 현황 ─────────────────────────
async function refreshStatus(ev) {
  const box = document.getElementById('status');
  if (!box) return;
  try {
    const { responses } = await api.loadStatus(ev.id);
    box.replaceChildren(statusView(ev, responses));
  } catch (err) {
    box.replaceChildren(h('p', { class: 'error' }, err.message));
  }
}

function statusView(ev, rows) {
  const yes = rows.filter((r) => r.attend === 'Y');
  const no = rows.filter((r) => r.attend !== 'Y');
  const sum = (k, list = yes) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const diners = yes.filter((r) => r.dinner === 'Y');

  let tab = 'Y';
  const list = h('div', { class: 'people' });
  const draw = () => {
    const shown = tab === 'Y' ? yes : no;
    if (shown.length === 0) return list.replaceChildren(h('p', { class: 'muted center' }, '아직 없어요.'));
    list.replaceChildren(...shown.map((r) => h('div', { class: 'person' },
      h('div', null,
        h('strong', null, r.family),
        h('small', null, r.attend === 'Y'
          ? `어른 ${r.adults} · 아이 ${r.kids} · 유아 ${r.toddlers}${r.dinner === 'Y' ? ' · 저녁 함께' : ''}`
          : (r.note || '불참'))),
      r.attend === 'Y' && h('b', null, `${(+r.adults) + (+r.kids) + (+r.toddlers)}명`))));
  };

  const tabs = h('div', { class: 'seg small' },
    [['Y', `참석 ${yes.length}`], ['N', `불참 ${no.length}`]].map(([k, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(tab === k), onclick: () => {
        tab = k; tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw();
      } }, label);
      return b;
    }));
  draw();

  // 식당 예약 인원
  const dinnerLine = ev.dinner && h('p', { class: 'note' }, icon('meal', 16),
    `저녁 함께 ${sum('adults', diners) + sum('kids', diners) + sum('toddlers', diners)}명 · 어른 ${sum('adults', diners)} · 아이 ${sum('kids', diners)} · 유아 ${sum('toddlers', diners)}`);

  return h('div', null,
    h('div', { class: 'card stats' },
      h('div', null, h('b', null, yes.length), h('small', null, '가정')),
      h('div', null, h('b', null, sum('adults')), h('small', null, '어른')),
      h('div', null, h('b', null, sum('kids') + sum('toddlers')), h('small', null, '아이'))),
    dinnerLine,
    h('div', { class: 'card' }, tabs, list),
    h('button', { class: 'btn ghost small', type: 'button', onclick: () => refreshStatus(ev) }, icon('refresh', 16), '새로고침'));
}

// ───────────────────────── 테마 그림 ─────────────────────────
function art(theme) {
  const sky = 'var(--art-sky)';
  if (theme === 'zoo') {
    return `<svg viewBox="0 0 320 168" preserveAspectRatio="xMidYMax slice" role="img" aria-label="단풍 든 언덕, 기린, 리프트">
      <rect width="320" height="168" fill="${sky}"/>
      <circle cx="250" cy="52" r="26" fill="var(--art-sun)"/>
      <path d="M0 120 Q70 84 150 110 T320 96 V168 H0z" fill="var(--art-hill1)"/>
      <path d="M0 140 Q90 112 190 138 T320 128 V168 H0z" fill="var(--art-hill2)"/>
      <g fill="var(--art-leaf1)"><circle cx="40" cy="112" r="16"/><circle cx="60" cy="118" r="12"/></g><rect x="47" y="118" width="4" height="22" fill="var(--art-trunk)"/>
      <g fill="var(--art-leaf2)"><circle cx="286" cy="112" r="15"/><circle cx="270" cy="120" r="11"/></g><rect x="282" y="120" width="4" height="20" fill="var(--art-trunk)"/>
      <path d="M120 20 L320 70" stroke="var(--art-trunk)" stroke-width="1.6"/>
      <g transform="translate(196 40) rotate(14)"><rect x="-1" y="0" width="2" height="10" fill="var(--art-trunk)"/><rect x="-11" y="10" width="22" height="16" rx="4" fill="var(--art-lift)"/><rect x="-7" y="13" width="14" height="6" rx="2" fill="var(--art-sun)"/></g>
      <g transform="translate(118 50)" fill="var(--art-giraffe)">
        <rect x="0" y="0" width="11" height="60" rx="5" transform="rotate(-12 5 60)"/>
        <ellipse cx="-8" cy="3" rx="12" ry="7.5"/>
        <ellipse cx="-14" cy="70" rx="28" ry="14"/>
        <rect x="-36" y="78" width="6" height="30" rx="3"/><rect x="-24" y="80" width="6" height="28" rx="3"/>
        <rect x="-2" y="78" width="6" height="30" rx="3"/><rect x="8" y="76" width="6" height="32" rx="3"/>
      </g>
      <g fill="var(--art-spot)"><circle cx="100" cy="118" r="4"/><circle cx="114" cy="126" r="3.5"/><circle cx="90" cy="128" r="3"/><circle cx="118" cy="90" r="2.6"/><circle cx="114" cy="72" r="2.4"/></g>
    </svg>`;
  }
  if (theme === 'sea') {
    return `<svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" role="img" aria-label="바다와 언덕">
      <rect width="400" height="180" fill="${sky}"/><circle cx="320" cy="56" r="22" fill="var(--art-sun)"/>
      <path d="M0 110 Q90 70 200 105 T400 95 V180 H0z" fill="var(--art-sea1)"/>
      <path d="M0 135 Q100 115 200 135 T400 130 V180 H0z" fill="var(--art-sea2)"/>
      <path d="M0 155 Q100 140 200 155 T400 152 V180 H0z" fill="var(--art-sea3)"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="400" height="180" fill="${sky}"/><circle cx="320" cy="56" r="22" fill="var(--art-sun)"/>
    <path d="M0 125 Q100 90 200 120 T400 110 V180 H0z" fill="var(--art-hill1)"/></svg>`;
}
