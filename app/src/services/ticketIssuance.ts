import type { TicketApplication, TicketIssuance } from '../types/Ticket';
export function issuanceError(value: TicketIssuance): string {
  if ((value.availableFromTime && !value.availableFromDate) || (value.deadlineTime && !value.deadlineDate)) return '発券の時刻を設定する場合は日付も入力してください。';
  if (value.availableFromDate && value.deadlineDate && `${value.availableFromDate}T${value.availableFromTime || '00:00'}` > `${value.deadlineDate}T${value.deadlineTime || '23:59'}`) return '発券期限は発券開始以降に設定してください。';
  return '';
}
export function issuanceIsDue(application: TicketApplication, now = new Date()): boolean {
  const issuance = application.fulfillment?.issuance;
  if (application.status !== 'won' || !issuance || issuance.isIssued || issuanceError(issuance)) return false;
  if (!issuance.availableFromDate && !issuance.deadlineDate) return false;
  if (!issuance.availableFromDate) return true;
  const start = new Date(`${issuance.availableFromDate}T${issuance.availableFromTime || '00:00'}:00`);
  return Number.isFinite(start.getTime()) && start <= now;
}
