import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

export default function AutoTextarea({value, rows=2, style, ...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){
  const ref=useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(()=>{
    const element=ref.current;
    if(!element)return;
    const fit=()=>{
      element.style.height='auto';
      const css=getComputedStyle(element);
      const border=parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth);
      element.style.height=`${element.scrollHeight+border}px`;
    };
    fit();
    let width=element.getBoundingClientRect().width;
    const observer=new ResizeObserver(()=>{
      const next=element.getBoundingClientRect().width;
      if(next!==width){width=next;fit();}
    });
    observer.observe(element);
    return ()=>observer.disconnect();
  },[value]);
  return <textarea {...props} ref={ref} value={value} rows={rows} style={{...style,boxSizing:'border-box',minHeight:0,maxWidth:'100%',fontSize:16,overflowY:'hidden',resize:'none'}}/>;
}
