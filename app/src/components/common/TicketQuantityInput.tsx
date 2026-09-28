import { useEffect, useState } from 'react';

export default function TicketQuantityInput({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const [text,setText]=useState(String(value));
  useEffect(()=>setText(String(value)),[value]);
  return <input type="number" inputMode="numeric" min="1" step="1" required value={text} onChange={event=>{
    const next=event.currentTarget.value;
    setText(next);
    const quantity=Number(next);
    // Keep empty/intermediate text editable; native form validation prevents saving it.
    if(next.trim() && Number.isSafeInteger(quantity) && quantity>0) onChange(quantity);
  }}/>;
}
