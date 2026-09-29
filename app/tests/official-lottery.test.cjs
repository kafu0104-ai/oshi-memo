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
