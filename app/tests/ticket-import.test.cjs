const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const result={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/ticketImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result});
const premiere='▼プレミア先行抽選販売\n2026年10月21日(水)発売のCDのシリアルコードが必要です。\n【抽選申込期間】\n2026年10月21日(水)10:00～2026年11月1日(日)23:59\n【抽選結果発表】\n2026年11月6日(金)13:00～';
test('lottery uses labelled deadlines and keeps serial requirements',()=>{
 const c=result.receptionFromText(premiere,'現地公演');assert.equal(c.applicationStartDate,'2026-10-21');assert.equal(c.applicationStartTime,'10:00');assert.equal(c.applicationDeadlineDate,'2026-11-01');assert.equal(c.applicationDeadlineTime,'23:59');assert.equal(c.resultDate,'2026-11-06');assert.equal(c.resultTime,'13:00');assert.match(c.note,/シリアルコード/);
});
test('general sale has no lottery result and does not invent a deadline',()=>{
 const c=result.receptionFromText('▼一般販売（先着順）\n2026年12月5日（土）10:00～発売開始','現地公演');assert.equal(c.receptionType,'general');assert.equal(c.applicationStartDate,'2026-12-05');assert.equal(c.applicationDeadlineDate,undefined);assert.equal(c.resultDate,undefined);
});
test('live viewing has independent scope and retains approximate result note',()=>{
 const c=result.receptionFromText('▼プレオーダー （抽選）\n【抽選申込期間】\n2026年11月28日(土)18:00～2026年12月6日(日)23:59\n【抽選結果発表】\n2027年1月16日(土)13:00頃','ライブビューイング');assert.equal(c.mode,'ライブビューイング');assert.equal(c.resultDate,'2027-01-16');assert.match(c.note,/頃/);
});
test('ambiguous windows and invalid or missing dates are not guessed',()=>{
 assert.equal(result.receptionFromText(premiere.replace('11月1日','2月30日'),'現地公演'),undefined);
 assert.equal(result.receptionFromText('▼一般販売（先着順）\n【神奈川公演】\n2027年1月16日（土）18:00～2027年1月22日（金）12:00\n【愛知公演】\n2027年1月16日（土）18:00～2027年1月29日（金）12:00','ライブビューイング'),undefined);
 assert.equal(result.receptionFromText('▼プレミア先行抽選\n発売日2026年10月21日\n申込日未定','現地公演'),undefined);
});
