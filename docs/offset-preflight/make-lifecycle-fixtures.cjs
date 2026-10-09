const fs=require('node:fs'),path=require('node:path'),manifest=require('./manifest.json');
const ts=require(path.join(manifest.candidate_path,'node_modules/typescript'));
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const api=require(path.join(manifest.candidate_path,'src/services/settlementOffsets.ts')),groups=require(path.join(manifest.candidate_path,'src/services/offsetGroups.ts'));
const root=path.resolve(__dirname,'../..'),old=require(path.join(root,'.sites-deploy/src/services/settlementOffsets.ts'));
const dir=path.join(__dirname,'fixtures'),snapshot=JSON.parse(fs.readFileSync(path.join(dir,'01-primary-before.snapshot.json'),'utf8'));
const tickets=JSON.parse(snapshot.records['oshi-memo-tickets']),events=JSON.parse(snapshot.records['oshi-memo-events']);
const i=api.settlementItems(tickets,events);const request={source:i[0],targets:[i[1]],offsetDate:'2026-10-08',settleRemainder:false};
const r=api.applyOffset(tickets,events,request,'offset-qa-v1-history-primary','2026-10-08T00:00:00Z'),g=groups.offsetGroups(r.tickets,events)[0];
const legacy=old.settlementItems(tickets,events);
const cases=[['06-pending',r.tickets,'相殺中・1770円支払の差額タスク1件。'],['07-completed',groups.completeOffsetGroup(r.tickets,events,g,'2026-10-09'),'相殺済み・アーカイブ、1770円支払済み。取消不可。'],['08-cancelled',groups.cancelOffsetGroup(r.tickets,events,g,'2026-10-09T00:00:00Z'),'取消履歴を保持、元の2275円受取と4045円支払を復元。'],['09-legacy-v108',old.applyOffset(tickets,events,{...request,source:legacy[0],targets:[legacy[1]]},'offset-qa-v1-history-legacy','2026-10-08T00:00:00Z').tickets,'配信108形式の旧履歴。残額1770円を新グループで管理。']];
const catalog=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));catalog.cases=catalog.cases.filter(c=>Number(c.file.slice(0,2))<6);
for(const [name,data,expectation]of cases){fs.writeFileSync(path.join(dir,name+'.snapshot.json'),JSON.stringify({...snapshot,records:{...snapshot.records,'oshi-memo-tickets':JSON.stringify(data)}},null,2)+'\n');catalog.cases.push({file:name+'.snapshot.json',expectation,events:events.length,tickets:data.length});}
fs.writeFileSync(path.join(dir,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');console.log('4 lifecycle fixtures prepared; no external writes');
