const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/exchangeTemplates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const fields={shop:'グラショ2026 池袋',product:'缶バッジ',offer:'音也 2点',seek:'トキヤ 2点',priority:'まとめて優先',delivery:'本日手渡し、後日郵送',partner:'相手',follow:true,packing:'緩衝材2重',shipping:'普通郵便',addressMode:'text',address:'秘密の住所',note:'画像参照'};
test('募集文は条件を含み住所・DM情報を出さない',()=>{
 const text=api.createExchangeText(fields,'post');
 for(const key of ['shop','product','offer','seek','note'])assert.ok(text.includes(fields[key]));
 for(const key of ['address','packing','shipping'])assert.ok(!text.includes(fields[key]));
});
test('返信はフォロー相談を切り替え、住所を含めない',()=>{
 assert.match(api.createExchangeText(fields,'reply'),/フォロー/);
 assert.doesNotMatch(api.createExchangeText({...fields,follow:false},'reply'),/フォロー/);
 assert.ok(!api.createExchangeText(fields,'reply').includes(fields.address));
});
test('DMのみ梱包・発送・住所を含み、空欄の見出しは出さない',()=>{
 const text=api.createExchangeText(fields,'dm');
 for(const key of ['packing','shipping','address'])assert.ok(text.includes(fields[key]));
 assert.doesNotMatch(api.createExchangeText({...fields,address:'',packing:'',shipping:''},'dm'),/【送付先】|【梱包方法】|【発送方法・予定】/);
});
test('お声がけ文は交換を依頼する文面で住所を含めない',()=>{
 const text=api.createExchangeText(fields,'approach');
 assert.match(text,/交換は可能でしょうか/);
 assert.ok(text.includes(fields.offer)&&text.includes(fields.seek));
 assert.ok(!text.includes(fields.address));
 assert.doesNotMatch(text,/応じていただき/);
});
test('手渡し相談は全用途で場所と確認文を添え、オフなら場所を含めない',()=>{
 for(const kind of ['approach','reply','dm']){
  const text=api.createExchangeText({...fields,nearby:true,location:'池袋駅東口付近'},kind);
  assert.match(text,/現在、池袋駅東口付近におります/);
  assert.match(text,/手渡し交換/);
  assert.ok(!api.createExchangeText({...fields,nearby:false,location:'池袋駅東口付近'},kind).includes('池袋駅東口付近'));
 }
 assert.match(api.createExchangeText({...fields,nearby:true,location:''},'reply'),/手渡し交換は可能でしょうか/);
 assert.doesNotMatch(api.createExchangeText({...fields,nearby:true,location:''},'reply'),/現在、におります/);
});
test('住所は画像・非提示では出さず、発送やお礼にも混ざらない',()=>{
 for(const addressMode of ['image','none']){
  const text=api.createExchangeText({...fields,dmStage:'address',addressMode},'dm');
  assert.ok(!text.includes(fields.address));
  assert.equal(text.includes('画像にて'),addressMode==='image');
 }
 for(const dmStage of ['sent','received','thanks']){
  const text=api.createExchangeText({...fields,dmStage},'dm');
  assert.ok(!text.includes(fields.address));
  assert.ok(!text.includes(fields.product));
 }
});
test('受け取り状況で結びを切り替える',()=>{
 assert.match(api.createExchangeText({...fields,dmStage:'received',partnerReceived:false},'dm'),/届くまで今しばらく/);
 const done=api.createExchangeText({...fields,dmStage:'received',partnerReceived:true},'dm');
 assert.match(done,/またご縁が/);
 assert.doesNotMatch(done,/届くまで/);
});
test('初回の写真・発送希望と発送完了の入力を反映する',()=>{
 const first=api.createExchangeText({...fields,photo:true,schedule:'same',shippingDate:'10月1日'},'dm');
 assert.match(first,/写真を添付/);assert.match(first,/同日発送を希望/);assert.match(first,/10月1日/);
 const sent=api.createExchangeText({...fields,dmStage:'sent',sentDate:'9月28日',sentVia:'ポスト投函',tracking:'123456'},'dm');
 assert.match(sent,/9月28日/);assert.match(sent,/ポスト投函/);assert.match(sent,/123456/);
});

test('募集文はチェックした交換条件だけを表示する',()=>{
 const f={...fields,bundle:true,handToday:true,handArea:'池袋',handUntil:'14時',location:'カフェ',laterMail:true};
 const text=api.createExchangeText(f,'post');
 for(const part of ['まとめての交換を優先','現在、カフェにおります','本日14時まで、池袋にて手渡し交換可能','後日、郵送での交換も可能'])assert.ok(text.includes(part));
 const off=api.createExchangeText({...f,bundle:false,handToday:false,laterMail:false},'post');
 for(const part of ['カフェ','14時','手渡し','郵送','まとめて'])assert.ok(!off.includes(part));
 assert.match(api.createExchangeText({...f,handUntil:'',handArea:''},'post'),/本日、手渡し交換可能です/);
 assert.match(api.createExchangeText({...f,handToday:false},'post'),/郵送での交換も可能/);
});

test('郵送希望と後日郵送可能を別の文面にする',()=>{
 assert.match(api.createExchangeText({...fields,mailPreferred:true},'post'),/郵送での交換を希望/);
 assert.doesNotMatch(api.createExchangeText({...fields,mailPreferred:true,laterMail:true},'post'),/後日/);
});
