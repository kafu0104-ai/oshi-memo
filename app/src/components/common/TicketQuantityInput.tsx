import { useEffect, useState } from 'react';

export default function TicketQuantityInput({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const [text,setText]=useState(String(value));
  useEffect(()=>setText(String(value)),[value]);
  const adjust=(delta:number)=>{const next=Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,value+delta));setText(String(next));onChange(next);};
  return <span className="ticket-quantity-control"><button type="button" aria-label="枚数を減らす" disabled={value<=1} onClick={()=>adjust(-1)}>−</button><input type="number" inputMode="numeric" min="1" step="1" required value={text} onChange={event=>{
    const next=event.currentTarget.value;
    setText(next);
    const quantity=Number(next);
    // Keep empty/intermediate text editable; native form validation prevents saving it.
    if(next.trim() && Number.isSafeInteger(quantity) && quantity>0) onChange(quantity);
  }}/><button type="button" aria-label="枚数を増やす" disabled={value>=Number.MAX_SAFE_INTEGER} onClick={()=>adjust(1)}>＋</button></span>;
}
