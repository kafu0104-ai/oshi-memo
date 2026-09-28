export type DmStage = 'initial'|'address'|'sent'|'received'|'thanks';
export const dmStages:Record<DmStage,string>={initial:'初回の確認',address:'梱包・発送の了承と住所提示',sent:'発送の連絡',received:'受け取りの連絡',thanks:'相手の受け取りへの返信・お礼'};
export interface ExchangeTemplateFields {
  bundle?:boolean; handToday?:boolean; handArea?:string; handUntil?:string; laterMail?:boolean;
  dmStage?:DmStage; greeting?:string; photo?:boolean; considerate?:boolean;
  addressMode?:'none'|'image'|'text'; samePacking?:boolean; thankAddress?:boolean;
  schedule?:'near'|'same'|'none'; shippingDate?:string; sentDate?:string;
  sentVia?:string; tracking?:string; receivedDate?:string; partnerReceived?:boolean;
  treasure?:boolean; thankPacking?:boolean;

  shop:string; product:string; offer:string; seek:string; priority:string; delivery:string;
  nearby?:boolean; location?:string; partner:string; follow:boolean; packing:string; shipping:string; address:string; note:string;
}
export type ExchangeTemplateKind = 'post'|'approach'|'reply'|'dm';
export function createExchangeText(f:ExchangeTemplateFields, kind:ExchangeTemplateKind):string {
  const clean=(s:string)=>s.trim();
  const title=[f.shop,f.product].map(clean).filter(Boolean).join(' ');
  const nearby=f.nearby
    ? [f.location?.trim() ? `現在、${f.location.trim()}におります。` : '',
       kind==='post'?'お近くで手渡し交換が可能な方がいらっしゃいましたら、お声がけいただけますと幸いです。':'お近くでの手渡し交換は可能でしょうか。ご都合のよい場所をお知らせいただけますと幸いです。'].filter(Boolean).join('\n')
    : '';
  const goods=`【譲】${clean(f.offer)}\n【求】${clean(f.seek)}`;
  const conditions=[
    f.bundle&&'まとめての交換を優先しております。',
    f.handToday&&f.location?.trim()&&`現在、${f.location.trim()}におります。`,
    f.handToday&&`本日${f.handUntil?.trim() ? f.handUntil.trim()+'まで' : ''}、${f.handArea?.trim() ? f.handArea.trim()+'にて' : ''}手渡し交換可能です。`,
    f.laterMail&&(f.handToday?'後日、郵送での交換も可能です。':'後日、郵送での交換が可能です。')
  ].filter(Boolean).join('\n');
  if(kind==='post') return [`【交換】${title ? ' ' + title : ''}`,goods,conditions,clean(f.note),'検索からでもお気軽にお声がけください。よろしくお願いいたします。'].filter(Boolean).join('\n\n');
  const greeting=f.partner.trim()?`${f.partner.trim()}様`:'';
  if(kind==='approach') return [greeting,'はじめまして。募集を拝見し、お声がけいたしました。',
    title,
    `当方は「${clean(f.offer)}」を所持しております。「${clean(f.seek)}」との交換は可能でしょうか。`,
    clean(f.delivery),nearby,clean(f.note),
    'ご検討いただけますと幸いです。よろしくお願いいたします。'].filter(Boolean).join('\n\n');
  if(kind==='reply') return [greeting,`はじめまして。${clean(f.greeting||'')}検索よりお声がけいただきありがとうございます。`,
    `ぜひ${clean(f.offer)}と${clean(f.seek)}の交換をお願いいたします。`,clean(f.delivery),nearby,
    f.follow?'お取引のためフォローさせていただいてもよろしいでしょうか。フォロー後、DMにて詳細をご相談させていただけますと幸いです。':'',
    'よろしくお願いいたします。'].filter(Boolean).join('\n\n');
  const hello=[greeting,clean(f.greeting||'')].filter(Boolean).join('\n');
  const closing='引き続きどうぞよろしくお願いいたします。';
  const finish='この度はお取引ありがとうございました。\nまたご縁がございましたらどうぞよろしくお願いいたします。';
  const address=f.addressMode==='image'?'また当方の住所も画像にて失礼いたします。ご確認のほどよろしくお願いいたします。':
    f.addressMode==='text'&&clean(f.address)?`【送付先】\n${clean(f.address)}`:'';
  const schedule=f.schedule==='same'?'同日発送を希望しております。ご対応可能なお日にちをご提示いただけますと幸いです。':
    f.schedule==='near'?'同日発送の希望はありませんが、近いお日にちで発送できればと思っております。ご対応可能なお日にちをご提示いただけますと幸いです。':'';
  const date=clean(f.shippingDate||'')?`当方は${clean(f.shippingDate||'')}に発送可能です。`:'';
  const stage=f.dmStage||'initial';
  const join=(parts:(string|false|undefined)[])=>parts.filter(Boolean).join('\n\n');
  if(stage==='address') return join([hello,'お世話になっております。','お忙しいところご返信いただきましてありがとうございます。',
    f.samePacking?'同様の梱包にさせていただきますね。':clean(f.packing)&&`【梱包方法】\n${clean(f.packing)}`,
    f.schedule==='near'?'発送時期につきましてもありがとうございます。近いお日にちで対応させていただきます。':schedule,date,
    f.thankAddress&&'送付先のご提示ありがとうございます。最後まで大切にお預かりさせていただきます。',address,closing]);
  if(stage==='sent') return join([hello,'お世話になっております。',
    `${clean(f.sentDate||'本日')}、${clean(f.sentVia||'郵便窓口')}より発送手続きいたしましたので、お品物到着まで今しばらくお待ちください。`,
    clean(f.tracking||'')&&`追跡番号：${clean(f.tracking||'')}`,closing]);
  if(stage==='received') return join([hello,'お世話になっております。',
    [`${clean(f.receivedDate||'本日')}、お品物を受け取りました！`,f.treasure&&'大切にいたします。',f.thankPacking&&'丁寧な梱包ありがとうございました。'].filter(Boolean).join('\n'),
    f.partnerReceived?finish:'当方のお品物が届くまで今しばらくお待ちいただければと存じます。',
    !f.partnerReceived&&closing]);
  if(stage==='thanks') return join([hello,'お品物、無事に届いたとのこと安心いたしました。',finish]);
  return join([hello,f.considerate&&'お忙しいと存じますので、お手すきの際にご確認いただけますと幸いです。',
    `この度は${title}の${clean(f.offer)}と${clean(f.seek)}の交換にご快諾いただきましてありがとうございます。`,
    f.photo&&'念のため写真を添付しますので、お品物のご確認をお願いいたします。',
    clean(f.delivery)&&`【受け渡し】\n${clean(f.delivery)}`,nearby,
    (clean(f.packing)||clean(f.shipping))&&`【梱包・発送方法】\n${[clean(f.packing),clean(f.shipping)].filter(Boolean).join('\n')}\n他の方法のご希望等ございましたら、ご提示いただけますと幸いです。`,
    (schedule||date)&&`【発送日】\n${[schedule,date].filter(Boolean).join('\n')}`,address,closing]);
}
