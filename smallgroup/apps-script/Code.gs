/**
 * 어린이소그룹 참석 회신 API (구글 시트에 붙여 쓰는 Apps Script)
 *
 * 설치
 * 1. 어린이소그룹 시트(아래 SHEET_ID)를 열고  확장 프로그램 → Apps Script  를 연다.
 * 2. 이 파일 내용을 Code.gs 에 그대로 붙여 넣고 저장한다.
 * 3. 함수 목록에서 setup 을 골라 ▶ 실행 (처음 한 번 권한 허용).
 *    → EVENTS 에 적힌 행사마다 탭이 생긴다.
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 사용자: 나 / 액세스 권한: 모든 사용자
 *    → 나온 /exec 주소를 앱의 js/config.js API_URL 에 넣는다.
 *
 * 새 행사를 추가할 때: EVENTS 에 id 한 줄 넣고 setup 다시 실행. EVENTS 에 없는 행사는 회신을 받지 않는다.
 * 코드를 고친 뒤에는  배포 → 배포 관리 → 수정 → 새 버전  으로 올려야 반영된다.
 */

// 어린이소그룹 시트: https://docs.google.com/spreadsheets/d/1IyfNYLzPEcQbw7bwc1Yt13Ep7uWJLZlGh0UQaYg4rmY/edit
const SHEET_ID = '1IyfNYLzPEcQbw7bwc1Yt13Ep7uWJLZlGh0UQaYg4rmY';

const EVENTS = [
  '20261017_seoulgrandpark',
  '20261004_daebudo',
];

const HEADERS = ['가정이름', '참석', '어른', '아이', '유아', '저녁식사', '남길말', '처음회신', '마지막수정'];
const ID_RE = /^\d{8}_[a-z0-9_]+$/;

function setup() {
  const ss = book_();
  EVENTS.forEach(function (id) { sheetFor_(ss, id); });
  // 처음 시트에 딸려 오는 빈 '시트1'은 정리한다.
  const blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'status') return json_({ ok: true, responses: read_(checkId_(p.event)), updatedAt: new Date().toISOString() });
    return json_({ ok: true, name: '어린이소그룹 API' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const b = JSON.parse(e.postData.contents);
    if (b.action !== 'rsvp') throw new Error('알 수 없는 요청이에요.');
    const id = checkId_(b.event);
    const family = String(b.family || '').trim().slice(0, 30);
    if (!family) throw new Error('가정이름을 적어 주세요.');
    const attend = b.attend === 'Y' ? 'Y' : 'N';
    const n = function (v) { v = Math.floor(Number(v) || 0); return Math.max(0, Math.min(20, v)); };

    const sh = sheetFor_(book_(), id);
    const now = new Date();
    const row = [
      safe_(family), attend,
      attend === 'Y' ? n(b.adults) : 0,
      attend === 'Y' ? n(b.kids) : 0,
      attend === 'Y' ? n(b.toddlers) : 0,
      attend === 'Y' && b.dinner === 'Y' ? 'Y' : 'N',
      safe_(String(b.note || '').slice(0, 200)),
    ];

    // 같은 가정이름이면 덮어쓰기 (공백·대소문자 무시)
    const key = norm_(family);
    const last = sh.getLastRow();
    const names = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    let at = -1;
    for (let i = 0; i < names.length; i++) if (norm_(names[i][0]) === key) { at = i + 2; break; }

    if (at > 0) {
      const first = sh.getRange(at, 8).getValue() || now;
      sh.getRange(at, 1, 1, HEADERS.length).setValues([row.concat([first, now])]);
    } else {
      sh.appendRow(row.concat([now, now]));
    }
    return json_({ ok: true, responses: read_(id) });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function read_(id) {
  const sh = book_().getSheetByName(id);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues()
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return {
        family: String(r[0]).replace(/^'/, ''), attend: r[1], adults: r[2], kids: r[3], toddlers: r[4],
        dinner: r[5],
        // 불참 사유는 현황에 보이므로 남길말은 불참일 때만 내보낸다.
        note: r[1] === 'Y' ? '' : String(r[6] || ''),
      };
    });
}

function book_() { return SpreadsheetApp.openById(SHEET_ID); }

function sheetFor_(ss, id) {
  let sh = ss.getSheetByName(id);
  if (!sh) {
    sh = ss.insertSheet(id);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#E4F1F1');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 160);
  }
  return sh;
}

function checkId_(id) {
  id = String(id || '');
  if (!ID_RE.test(id)) throw new Error('없는 행사예요.');
  if (EVENTS.indexOf(id) < 0) throw new Error('회신을 받지 않는 행사예요.');
  return id;
}

const norm_ = function (s) { return String(s).replace(/^'/, '').replace(/\s+/g, '').toLowerCase(); };
// 시트 수식 주입 방지: =, +, -, @ 로 시작하면 앞에 ' 를 붙인다.
const safe_ = function (s) { return /^[=+\-@]/.test(s) ? "'" + s : s; };

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
