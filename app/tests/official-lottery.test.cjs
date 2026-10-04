const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const result={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/officialImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result});
test('lottery extraction keeps rounds separate and does not invent times',()=>{
 const text='第1期 抽選対象期間 2026年7月18日（土） ～ 2026年7月23日（木） 応募期間 2026年6月26日（金） ～ 2026年7月5日（日） 当選のご連絡 2026年7月9日（木） 第2期 抽選対象期間 2026年7月24日（金） ～ 2026年7月30日（木） 応募期間 2026年7月10日（金） ～ 2026年7月12日（日） 当選のご連絡 2026年7月16日（木）';
 const rounds=result.lotteryRoundsFromText(text);assert.equal(rounds.length,2);assert.equal(rounds[0].applicationStart,'2026-06-26');assert.equal(rounds[1].resultDate,'2026-07-16');assert.equal(result.lotteryRoundsFromText('第1期 応募期間 未定').length,0);
});
if(fs.existsSync('/tmp/grandshop-text.txt'))test('provided Grand Shop page yields six complete rounds',()=>{const rounds=result.lotteryRoundsFromText(fs.readFileSync('/tmp/grandshop-text.txt','utf8'));assert.equal(rounds.length,6);assert.equal(rounds[5].resultDate,'2026-08-21');assert.ok(rounds[3].name.includes('2F'));});
test('event periods support AGF omitted month/year and valid full ranges',()=>{
 for(const [input,start,end] of [['2026年11月7日(土)・8日(日)','2026-11-07','2026-11-08'],['2026年7月18日（土）～2026年9月30日（水）','2026-07-18','2026-09-30'],['2026年11月7日','2026-11-07','2026-11-07'],['2026年11月30日～12月1日','2026-11-30','2026-12-01']]){
 const actual=result.eventPeriod(input);assert.equal(actual.startDate,start);assert.equal(actual.endDate,end);
 }
 for(const input of ['11月7日・8日','2026年2月30日','2026年11月8日～7日'])assert.equal(result.eventPeriod(input),undefined);
});
test('live performance dates stay paired with each venue and opening/start times',()=>{
 const shows=result.performanceLines('2027年1月23日(土)　開場15:30／開演17:30\n2027年1月24日(日)　開場13:00／開演15:00','Kアリーナ横浜');
 assert.equal(shows.length,2);assert.equal(shows[0].date,'2027-01-23');assert.equal(shows[1].doorsOpen,'13:00');assert.equal(shows[1].startTime,'15:00');assert.equal(shows[1].venue,'Kアリーナ横浜');
 const other=result.performanceLines('2027年1月30日(土) 開場15:30／開演17:30\n2027年1月31日(日) 開場13:00／開演15:00','IGアリーナ');
 const selected=result.fieldsForPerformances([shows[1],other[0]]);assert.equal(selected.startDate,'2027-01-24');assert.equal(selected.endDate,'2027-01-30');assert.equal(selected.venue,undefined);assert.equal(selected.startTime,undefined);
 assert.equal(result.fieldsForPerformances([shows[0]]).startTime,'17:30');
});
test('performance parsing rejects ticket deadlines, viewing-only times and invalid dates',()=>{
 for(const text of ['2026年10月21日(水)10:00～2026年11月1日(日)23:59','2027年1月23日(土) 開演17:30','2027年2月30日(火) 開場15:30／開演17:30','2027年1月23日(土) 開場25:30／開演27:30'])assert.equal(result.performanceLines(text,'会場').length,0);
 assert.equal(result.performanceLines('2027年1月23日(土) 開場15:30／開演17:30','').length,0);
});
test('cast extraction retains roles and excludes notices and ticket sections',()=>{
 assert.equal(result.performersFromText('＜出演者＞\n寺島拓篤（一十木音也 役）\n鈴村健一（聖川真斗 役）\n※出演者は予告なく変更になる場合があります。\n＜チケット情報＞\n20,000円'),'寺島拓篤（一十木音也 役）\n鈴村健一（聖川真斗 役）');
 assert.equal(result.performersFromText('出演者\n名前（役名）\n＜チケット情報＞\n料金'),'名前（役名）');
 assert.equal(result.performersFromText('※出演者は変更になる場合があります。'),'');
});
