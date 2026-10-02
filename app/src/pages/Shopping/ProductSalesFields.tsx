import { useState } from 'react';
import type { ProductSales } from '../../services/productSales';
export default function ProductSalesFields({value,onChange}:{value:ProductSales;onChange:(patch:ProductSales)=>void}){
 const [precision,setPrecision]=useState(value.releaseDate?'day':'month');
 return <details className="product-sales-fields"><summary>販売情報（任意）</summary><div className="product-sales-inputs">
 <label className="form-field">販売方法<select value={value.saleMethod||'normal'} onChange={e=>onChange({saleMethod:e.target.value as ProductSales['saleMethod']})}><option value="normal">通常販売</option><option value="reservation">予約販売</option><option value="preorder">受注販売</option></select></label>
 <label className="form-field">発売予定の入力<select value={precision} onChange={e=>{setPrecision(e.target.value);if(e.target.value==='month')onChange({releaseMonth:value.releaseDate?.slice(0,7)||value.releaseMonth||'',releaseDate:''});}}><option value="month">年月だけ</option><option value="day">日付まで</option></select></label>
 {precision==='day'?<label className="form-field">発売予定日<input type="date" value={value.releaseDate||''} onChange={e=>onChange({releaseDate:e.target.value,releaseMonth:e.target.value.slice(0,7)})}/></label>:<label className="form-field">発売予定月<input type="month" value={value.releaseMonth||''} onChange={e=>onChange({releaseMonth:e.target.value,releaseDate:''})}/></label>}
 {(value.saleMethod==='preorder'||value.saleMethod==='reservation')&&<><label className="form-field">{value.saleMethod==='reservation'?'予約':'受注'}受付開始日<input type="date" value={value.preorderStart||''} onChange={e=>onChange({preorderStart:e.target.value})}/></label><label className="form-field">{value.saleMethod==='reservation'?'予約':'受注'}締切日<input type="date" value={value.preorderEnd||''} onChange={e=>onChange({preorderEnd:e.target.value})}/></label><label className="form-field">発送予定<input maxLength={100} value={value.shippingPlan||''} placeholder="例：2027年1月下旬" onChange={e=>onChange({shippingPlan:e.target.value})}/></label></>}
 <label className="shopping-check"><input type="checkbox" checked={!!value.saleEnded} onChange={e=>onChange({saleEnded:e.target.checked})}/>販売終了</label>
 </div></details>;
}
