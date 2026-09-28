export interface ProductSales {
 releaseDate?:string; releaseMonth?:string;
 saleMethod?:'normal'|'preorder'; preorderStart?:string; preorderEnd?:string;
 shippingPlan?:string; saleEnded?:boolean;
}
export function salesError(s:ProductSales):string {
 return s.saleMethod==='preorder'&&s.preorderStart&&s.preorderEnd&&s.preorderEnd<s.preorderStart?'受注締切日は受付開始日以降にしてください。':'';
}
export function salesLabel(s:ProductSales,today=new Date()):string {
 if(s.saleEnded)return '販売終了';
 const day=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 if(s.saleMethod==='preorder'){
  if(s.preorderStart&&s.preorderStart>day)return '受注開始前';
  if(s.preorderEnd&&s.preorderEnd<day)return '受注受付終了';
  return '受注販売';
 }
 if(s.releaseDate?s.releaseDate>day:s.releaseMonth&&s.releaseMonth>day.slice(0,7))return '販売前';
 return '';
}
export function salesMonth(s:ProductSales):string {return s.releaseMonth||s.releaseDate?.slice(0,7)||'';}
