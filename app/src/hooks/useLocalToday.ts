import { useEffect, useState } from 'react';
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function useLocalToday() {
  const [value, setValue] = useState(today);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setValue(today());
      clearTimeout(timer);
      const next = new Date(); next.setHours(24,0,0,50);
      timer = setTimeout(refresh, next.getTime()-Date.now());
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
  }, []);
  return value;
}
