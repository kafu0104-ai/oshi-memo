/** Every ticket writer and backup restore uses the same cross-tab lock. */
export function withPersonalDataLock<T>(operation: () => T, requireLock = false): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('oshi-memo-personal-data', { mode: 'exclusive' }, operation);
  }
  if (requireLock) return Promise.reject(new Error('このブラウザでは安全な相殺保存に対応していません。Safari・Chromeなどの最新版で開いてください。'));
  // Legacy normal-payment environments keep working; netting fails closed.
  return Promise.resolve().then(operation);
}
