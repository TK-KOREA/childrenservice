// 행사마다 카톡 링크 미리보기용 공유 페이지(e/<id>.html)를 만든다.
// 앱 주소는 #/e/<id> 처럼 # 뒤로 행사를 고르는데, 카톡 등 미리보기 봇은 # 뒤를 서버에 보내지 않아
// 언제나 index.html의 공통 제목만 보게 된다. 그래서 행사별 og 태그를 가진 작은 페이지를 두고,
// 사람이 열면 바로 앱의 그 행사 화면으로 넘겨 준다.
// 행사를 추가하거나 제목·시간을 바꾼 뒤: node tools/share-pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://tk-korea.github.io/childrenservice/smallgroup/';
const WEEK = '일월화수목금토';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = (iso) => { const d = new Date(`${iso}T12:00:00Z`); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEK[d.getUTCDay()]})`; };

const { events } = JSON.parse(readFileSync(join(ROOT, 'events/index.json'), 'utf8'));
mkdirSync(join(ROOT, 'e'), { recursive: true });

for (const e of events) {
  if (e.link) continue; // 앱 밖의 따로 만든 행사 페이지는 그 페이지가 미리보기를 가진다.
  const app = `../#/e/${e.id}`;
  const title = `${e.title} · ${md(e.date)}`;
  const desc = `${e.time} · ${e.place}. 일정을 보고 참석 여부를 알려 주세요.`;
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} | 어린이소그룹</title>
<!-- 카톡 링크 미리보기 (tools/share-pages.mjs가 만든 파일, 직접 고치지 말 것) -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="어린이소그룹">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}e/${e.id}.html">
<meta property="og:image" content="${BASE}icons/icon-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="description" content="${esc(desc)}">
<meta http-equiv="refresh" content="0; url=${app}">
<script>location.replace(${JSON.stringify(app)});</script>
</head>
<body>
<p><a href="${app}">${esc(e.title)} 안내 열기</a></p>
</body>
</html>
`;
  writeFileSync(join(ROOT, 'e', `${e.id}.html`), html);
  console.log(`e/${e.id}.html`);
}
