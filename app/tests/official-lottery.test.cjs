const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const result={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/officialImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result});
test('lottery extraction keeps rounds separate and does not invent times',()=>{
 const text='第1期 抽選対象期間 2026年7月18日（土） ～ 2026年7月23日（木） 応募期間 2026年6月26日（金） ～ 2026年7月5日（日） 当選のご連絡 2026年7月9日（木） 第2期 抽選対象期間 2026年7月24日（金） ～ 2026年7月30日（木） 応募期間 2026年7月10日（金） ～ 2026年7月12日（日） 当選のご連絡 2026年7月16日（木）';
 const rounds=result.lotteryRoundsFromText(text);assert.equal(rounds.length,2);assert.equal(rounds[0].applicationStart,'2026-06-26');assert.equal(rounds[1].resultDate,'2026-07-16');assert.equal(result.lotteryRoundsFromText('第1期 応募期間 未定').length,0);
});
if(fs.existsSync('/tmp/grandshop-text.txt'))test('provided Grand Shop page yields six complete rounds',()=>{const rounds=result.lotteryRoundsFromText(fs.readFileSync('/tmp/grandshop-text.txt','utf8'));assert.equal(rounds.length,6);assert.equal(rounds[5].resultDate,'2026-08-21');assert.ok(rounds[3].name.includes('2F'));});
