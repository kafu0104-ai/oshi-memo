import { useState } from 'react';
import { copyText } from '../../services/copyText';
import { createExchangeText, dmStages, type ExchangeTemplateFields, type ExchangeTemplateKind } from '../../services/exchangeTemplates';
const initial:ExchangeTemplateFields={bundle:false,handToday:false,handArea:'',handUntil:'',laterMail:false,dmStage:'initial',greeting:'こんばんは。',photo:true,considerate:true,addressMode:'none',samePacking:true,thankAddress:true,schedule:'near',shippingDate:'',sentDate:'本日',sentVia:'郵便窓口',tracking:'',receivedDate:'本日',partnerReceived:false,treasure:true,thankPacking:true,nearby:false,location:'',shop:'',product:'',offer:'',seek:'',priority:'',delivery:'',partner:'',follow:true,packing:'',shipping:'',address:'',note:''};
export default function ExchangeComposer(){
  const [fields,setFields]=useState(initial);
  const [kind,setKind]=useState<ExchangeTemplateKind>('post');
  const [result,setResult]=useState(''),[message,setMessage]=useState('');
  function field(key:keyof ExchangeTemplateFields,label:string,placeholder='',required=false,multiline=false){
    const props={value:String(fields[key]??''),onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setFields(f=>({...f,[key]:e.target.value})),placeholder,required};
    return <label className="form-field">{label}{multiline?<textarea {...props} rows={3}/>:<input {...props}/>}</label>;
  }
  const stage=fields.dmStage||'initial';
  const needsGoods=kind!=='dm'||stage==='initial';
  const check=(key:keyof ExchangeTemplateFields,label:string)=><label className="ticket-check"><input type="checkbox" checked={!!fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.checked}))}/>{label}</label>;
  function select(key:keyof ExchangeTemplateFields,label:string,options:Record<string,string>){
    return <label className="form-field">{label}<select value={String(fields[key]??'')} onChange={e=>{setFields(f=>({...f,[key]:e.target.value}));setResult('');setMessage('');}}>{Object.entries(options).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
  }
  return <section className="shopping-panel exchange-editor">
    <h2>交換の文章を作る</h2>
    <div className="exchange-template-tabs" aria-label="文章の用途">{([['post','募集文'],['approach','お声がけ'],['reply','返信'],['dm','DM']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={kind===id} onClick={()=>{setKind(id);setResult('');setMessage('');}}>{label}</button>)}</div>
    <form className="exchange-editor" onSubmit={e=>{e.preventDefault();if(needsGoods&&(!fields.product.trim()||!fields.offer.trim()||!fields.seek.trim())){setMessage('商品名と、譲る・求めるキャラクターを入力してください。');return;}setResult(createExchangeText(fields,kind));setMessage('文章を作成しました。内容を確認・編集してコピーできます。');}}>
      {kind==='dm'&&select('dmStage','DMの段階',dmStages)}
      {needsGoods&&<>{field('shop','購入場所・イベント','例：ちいかわパーク／グラショ2026 池袋')}
      {field('product','商品名（必須）','例：トレーディング缶バッジ',true)}
      {field('offer','交換に出すキャラクター（必須）','例：A賞：ナギ\nC賞：ナギ',true,true)}
      {field('seek','探しているキャラクター（必須）','例：同種：那月',true,true)}</>}
      {kind==='post'&&<><section className="exchange-section"><h3>交換条件</h3>
        {check('bundle','まとめて交換優先')}
        {check('handToday','本日手渡し可能')}
        {fields.handToday&&<>{field('handArea','交換できる場所・エリア','例：池袋、グラショ付近')}{field('handUntil','何時まで（任意）','例：14時')}{field('location','今いる場所（任意）','例：グラショ付近のカフェ')}</>}
        {check('laterMail','後日郵送可能')}
      </section>{field('note','募集文への補足','例：画像の数字は所持数です。',false,true)}</>}
      {needsGoods&&kind!=='post'&&<>{field('delivery','受け渡し方法','例：本日池袋で手渡し可能。後日郵送も可能。',false,true)}
      <label className="ticket-check"><input type="checkbox" checked={!!fields.nearby} onChange={e=>setFields(f=>({...f,nearby:e.target.checked}))}/>近くでの手渡し交換を相談する</label>
      {fields.nearby&&field('location','今いる場所（任意）','例：池袋駅東口付近')}
      </>}
      {kind!=='post'&&select('greeting','挨拶',{'':'なし','おはようございます。':'おはようございます','こんにちは。':'こんにちは','こんばんは。':'こんばんは'})}
      {kind!=='post'&&field('partner','相手のお名前（任意）','ニックネーム')}
      {kind==='approach'&&field('note','お声がけへの補足','例：お品物の写真を添付いたします。',false,true)}
      {kind==='reply'&&<label className="ticket-check"><input type="checkbox" checked={fields.follow} onChange={e=>setFields(f=>({...f,follow:e.target.checked}))}/>フォロー外の方へ、フォローとDMの相談を添える</label>}
      {kind==='dm'&&<>
        {stage==='initial'&&<>{check('considerate','お手すきの際に確認をお願いする一文を添える')}{check('photo','品物の写真を添える旨を記載')}</>}
        {stage==='address'&&check('samePacking','相手と同じ梱包にする')}
        {(stage==='initial'||(stage==='address'&&!fields.samePacking))&&field('packing','梱包方法','例：購入時の状態から防水OPP、プチプチ1重、封筒',false,true)}
        {stage==='initial'&&field('shipping','発送方法','例：普通郵便定形外での発送を予定しております。')}
        {(stage==='initial'||stage==='address')&&<>
          {select('schedule','発送日の希望',{near:'近い日程',same:'同日発送',none:'指定なし'})}
          {field('shippingDate','発送可能日（任意）','例：10月1日')}
          {stage==='address'&&check('thankAddress','相手の住所提示へのお礼を添える')}
          {select('addressMode','自分の住所の提示方法',{none:'今回は提示しない',image:'画像を添付する',text:'文章で記載する'})}
          {fields.addressMode==='text'&&field('address','送付先（住所・氏名）','郵便番号、住所、宛名',true,true)}
          {fields.addressMode==='image'&&<p className="shopping-note">文章を送る際に、ご自身で住所の画像を添付してください。</p>}
          <p className="shopping-note">住所は選んだDM文だけに含めます。入力内容はこの画面を離れると消えます。</p>
        </>}
        {stage==='sent'&&<>{field('sentDate','発送日','本日')}{field('sentVia','発送場所・方法','郵便窓口／ポスト投函など')}{field('tracking','追跡番号（任意）')}</>}
        {stage==='received'&&<>{field('receivedDate','受け取った日','本日')}{check('treasure','「大切にいたします」を添える')}{check('thankPacking','丁寧な梱包へのお礼を添える')}{check('partnerReceived','相手も受け取り済み')}</>}
      </>}
      <button type="submit">文章を作成</button>
    </form>
    <p role="status">{message}</p>
    {result&&<><label className="form-field">作成した文章（編集できます）<textarea rows={14} value={result} onChange={e=>setResult(e.target.value)}/></label><p className="shopping-note">{result.length}文字</p><button type="button" onClick={async()=>setMessage(await copyText(result)?'コピーしました。':'コピーできませんでした。文章を長押ししてコピーしてください。')}>文章をコピー</button></>}
  </section>;
}
