"""Freeze a local-only candidate from the verified v108 source. No remote writes."""
from pathlib import Path
import subprocess, hashlib, json, tarfile, io, shutil, tempfile
ROOT=Path(__file__).resolve().parents[2]; APP=ROOT/'app'; BASE=ROOT/'.sites-deploy'; OUT=Path(__file__).resolve().parent
SHA='005e8bda406e620f13b56f99b403cd696e6cab55'
assert subprocess.check_output(['git','-C',str(BASE),'rev-parse','HEAD'],text=True).strip()==SHA
report=(ROOT/'docs/offset-groups-v1-report.txt').read_text()
files=[line.removeprefix('app/') for line in report.splitlines() if line.startswith('app/')]
assert len(files)==22
changes=[]
for rel in files:
 p=APP/rel; q=OUT/'overlay'/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 b=BASE/rel
 changes.append({'file':rel,'category':'runtime' if rel.startswith('src/') else 'verification','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'baseline_sha256':hashlib.sha256(b.read_bytes()).hexdigest() if b.exists() else None})
excluded=[]
for prefix in ['src','server','tests','scripts']:
 for p in sorted((APP/prefix).rglob('*')):
  if not p.is_file() or p.name=='.DS_Store':continue
  rel=str(p.relative_to(APP));b=BASE/rel
  if rel not in files and (not b.exists() or p.read_bytes()!=b.read_bytes()):excluded.append({'file':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'reason':'以前からの表示修正' if rel.startswith('src/') else '以前の公式情報・同期検証用テスト（配信対象外）'})
unchanged=['server/sites-worker.mjs','server/officialPage.ts','src/services/officialImport.ts','src/services/officialCandidates.ts','src/services/officialDiscovery.ts','src/services/officialSelection.ts','src/components/event/OfficialImport.tsx','src/components/event/OfficialSourceSummary.tsx','src/components/event/EventForm.tsx','src/components/event/QuickEventForm.tsx','src/services/storage.ts','src/services/personalSnapshot.ts','src/services/personalDataLock.ts','src/pages/Settings/PersonalSyncPage.tsx','src/services/ticketAmounts.ts','package.json','package-lock.json','vite.config.ts']
for rel in unchanged:assert (APP/rel).read_bytes()==(BASE/rel).read_bytes(),rel
candidate=Path(tempfile.mkdtemp(prefix='oshi-offset-preflight-'))/'app';candidate.mkdir()
archive=subprocess.check_output(['git','-C',str(BASE),'archive',SHA])
with tarfile.open(fileobj=io.BytesIO(archive)) as t:
 for m in t.getmembers():
  assert not m.name.startswith('/') and '..' not in Path(m.name).parts and not m.issym() and not m.islnk(), m.name
 t.extractall(candidate)
for rel in files:
 dest=candidate/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(OUT/'overlay'/rel,dest)
# Compatibility QA is deliberately separate from the proposed release overlay.
qa=[]
for p in (APP/'tests').rglob('*'):
 if p.is_file() and (p.name.startswith('official-') or p.name in ['personal-sync-access.test.mjs','entry-summary.test.cjs']):
  dest=candidate/p.relative_to(APP);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);qa.append(str(p.relative_to(APP)))
(candidate/'node_modules').symlink_to(APP/'node_modules',target_is_directory=True)
shutil.copytree(ROOT/'supabase',candidate.parent/'supabase')
manifest={'status':'LOCAL_PREPARATION_ONLY_NOT_PUBLISHED','baseline_source':SHA,'version':108,'project_id':'appgprj_6ab9eb5e23e481919ff36104c0eaff91','version_id':'appgprj_6ab9eb5e23e481919ff36104c0eaff91~appgver_12c315b67f7881918d792b168d9b8737','deployment_id':'appgdep_6ac74113add081919cec7bf30b04f201','changes':changes,'excluded':excluded,'verified_unchanged':unchanged,'candidate_path':str(candidate),'additional_validation_only':qa}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(OUT/'candidate-path.txt').write_text(str(candidate)+'\n')
print(json.dumps({'candidate':str(candidate),'runtime_files':sum(c['category']=='runtime' for c in changes),'verification_files':sum(c['category']=='verification' for c in changes),'excluded_files':len(excluded),'unchanged_checks':len(unchanged)},ensure_ascii=False))
