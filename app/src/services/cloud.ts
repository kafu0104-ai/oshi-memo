import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key, {auth:{detectSessionInUrl:false,flowType:"pkce"}}) : null;
export function cloudError(error:unknown):string {
 const text=error && typeof error==='object' && 'message' in error ? String(error.message) : '';
 if(text.includes('CONFLICT'))return '他の人が更新しました。入力内容は残っています。最新の内容を読み直してから変更してください。';
 if(text.includes('INVALID_INVITE'))return '招待を利用できません。有効期限や取り消し状況を確認し、管理者から新しいリンクを受け取ってください。';
 if(text.includes('REQUEST_CLOSED'))return 'この参加申請はすでに処理されています。画面を更新してください。';
 if(text.includes('NO_ACCESS'))return 'この買い物メモを編集する権限がありません。';
 return '通信または保存に失敗しました。接続を確認して、もう一度お試しください。';
}
