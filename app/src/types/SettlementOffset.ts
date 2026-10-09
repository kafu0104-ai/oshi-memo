import type { TicketSettlement, TicketSettlementDirection } from './Ticket';

export interface SettlementRef {
  ticketId: string;
  receptionId: string;
  applicationId: string;
  settlementId: string;
}
export interface OffsetAllocation extends SettlementRef {
  beforeSettlement?: TicketSettlement;
  afterSettlement?: TicketSettlement;
  eventId: string;
  eventName: string;
  label: string;
  direction: TicketSettlementDirection;
  before: number;
  offset: number;
  cash: number;
  remaining: number;
}
export interface SettlementOffset {
  id: string;
  offsetDate: string;
  companionId: string;
  source: SettlementRef;
  sourceAmount: number;
  targetAmount: number;
  offsetAmount: number;
  remainingAmount: number;
  remainingDirection?: TicketSettlementDirection;
  cashDate?: string;
  status: 'offset' | 'pending' | 'settled' | 'cancelled';
  cancelledAt?: string;
  completedDate?: string;
  createdAt: string;
  allocations: OffsetAllocation[];
}
