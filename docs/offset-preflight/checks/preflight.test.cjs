const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),manifest=require('../manifest.json'),candidate=manifest.candidate_path;
const ts=require(path.join(candidate,'node_modules/typescript'));
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const api=require(path.join(candidate,'src/services/settlementOffsets.ts'));
const groups=require(path.join(candidate,'src/services/offsetGroups.ts'));
const snapshot=require(path.join(candidate,'src/services/personalSnapshot.ts'));
const fixtures=path.resolve(__dirname,'../fixtures');
function load(name){const raw=JSON.parse(fs.readFileSync(path.join(fixtures,name+'.snapshot.json'),'utf8'));snapshot.validateSnapshot(raw);return {raw,events:JSON.parse(raw.records['oshi-memo-events']),tickets:JSON.parse(raw.records['oshi-memo-tickets'])};}
function apply(f,id='offset-qa-v1-history-primary'){const [source,target]=api.settlementItems(f.tickets,f.events);return api.applyOffset(f.tickets,f.events,{source,targets:[target],offsetDate:'2026-10-08',settleRemainder:false},id,'2026-10-08T00:00:00Z');}
function memory(records={}){const m=new Map(Object.entries(records));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),get length(){return m.size},key:i=>[...m.keys()][i]??null};}
for(const [file,amount,direction] of [['01-primary-before',1770,'pay'],['02-receive-balance',1770,'receive'],['03-zero-balance',0,undefined]])test(file+' prepared fixture has correct balance',()=>{const f=load(file),r=apply(f);assert.equal(r.history.remainingAmount,amount);assert.equal(r.history.remainingDirection,direction);assert.equal(groups.offsetGroups(r.tickets,f.events)[0].completed,amount===0);});
test('candidate boundaries and same-event unrelated settlement are isolated',()=>{const f=load('04-candidate-boundaries'),items=api.settlementItems(f.tickets,f.events),source=items[0],candidates=api.offsetCandidates(source,items);assert.deepEqual(candidates.map(i=>i.settlementId).sort(),['offset-qa-v1-settlement-bungo','offset-qa-v1-settlement-bungo-extra','offset-qa-v1-settlement-third'].sort());const r=api.applyOffset(f.tickets,f.events,{source,targets:candidates.filter(i=>!i.settlementId.endsWith('extra')),offsetDate:'2026-10-08',settleRemainder:false},'offset-qa-v1-history-multi','2026-10-08T00:00:00Z');assert.equal(r.history.remainingAmount,2770);const g=groups.offsetGroups(r.tickets,f.events)[0];const done=groups.completeOffsetGroup(r.tickets,f.events,g,'2026-10-09');assert.equal(api.settlementItems(done,f.events).find(i=>i.settlementId.endsWith('extra')).remaining,800);});
test('direction mismatch fixture warns without changing data',()=>{const f=load('05-direction-review'),before=JSON.stringify(f.tickets);assert.equal(api.settlementItems(f.tickets,f.events)[0].directionWarning,true);assert.equal(JSON.stringify(f.tickets),before);});
test('v108 legacy pending and completed histories remain readable',()=>{const old=require(path.join(root,'.sites-deploy/src/services/settlementOffsets.ts'));const f=load('01-primary-before'),items=old.settlementItems(f.tickets,f.events);for(const settleRemainder of [false,true]){const r=old.applyOffset(f.tickets,f.events,{source:items[0],targets:[items[1]],offsetDate:'2026-10-08',cashDate:'2026-10-09',settleRemainder},'offset-qa-v1-legacy','2026-10-08T00:00:00Z');const g=groups.offsetGroups(r.tickets,f.events)[0];assert.equal(g.completed,settleRemainder);assert.equal(g.remaining,settleRemainder?0:1770);}});
test('existing SQL RPC round-trip preserves pending, completed and cancelled offset histories',async()=>{
 const {PGlite}=await import(process.env.PGLITE_MODULE);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select '00000000-0000-4000-8000-000000000001'::uuid$$;insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/202609250003_personal_sync.sql'),'utf8'));await db.exec('set role authenticated');
 let revision=0;const f=load('01-primary-before'),r=apply(f),g=groups.offsetGroups(r.tickets,f.events)[0];
 const datasets=[r.tickets,groups.completeOffsetGroup(r.tickets,f.events,g,'2026-10-09'),groups.cancelOffsetGroup(r.tickets,f.events,g,'2026-10-09T00:00:00Z')];
 for(const tickets of datasets){
  const payload={...f.raw,records:{...f.raw.records,'oshi-memo-tickets':JSON.stringify(tickets)}};
  await db.query('select save_personal_snapshot($1::jsonb,$2)',[JSON.stringify(payload),revision]);revision++;
  const remote=(await db.query('select payload,revision from personal_snapshots')).rows[0];assert.equal(remote.revision,revision);assert.deepEqual(remote.payload,payload);
  const storage=memory();snapshot.restoreSnapshot(remote.payload,storage);const restored=JSON.parse(storage.getItem('oshi-memo-tickets'));
  assert.deepEqual(restored,JSON.parse(JSON.stringify(tickets)));assert.deepEqual(JSON.parse(JSON.stringify(groups.offsetGroups(restored,f.events))),JSON.parse(JSON.stringify(groups.offsetGroups(tickets,f.events))));
  const current=groups.offsetGroups(restored,f.events)[0];if(!current.completed&&!current.cancelled){assert.equal(groups.offsetGroups(groups.completeOffsetGroup(restored,f.events,current,'2026-10-09'),f.events)[0].completed,true);assert.equal(groups.offsetGroups(groups.cancelOffsetGroup(restored,f.events,current,'2026-10-09T00:00:00Z'),f.events)[0].cancelled,true);}
 }
 await assert.rejects(db.query('select save_personal_snapshot($1::jsonb,$2)',[JSON.stringify(f.raw),revision-1]),/SYNC_CONFLICT/);
 }finally{await db.close();}
});
test('release overlay excludes unrelated UI fixes and does not change integration code',()=>{
 for(const rel of manifest.verified_unchanged)assert.deepEqual(fs.readFileSync(path.join(candidate,rel)),fs.readFileSync(path.join(root,'.sites-deploy',rel)),rel);
 for(const rel of ['src/index.css','src/components/event/EntryPeriods.tsx','src/components/event/GenreSummary.tsx'])assert.deepEqual(fs.readFileSync(path.join(candidate,rel)),fs.readFileSync(path.join(root,'.sites-deploy',rel)),rel);
});
