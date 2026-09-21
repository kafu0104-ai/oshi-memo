/**
 * チケット申込の状態
 */
export type TicketApplicationStatus =
  | "notApplied"
  | "applied"
  | "won"
  | "lost";

/**
 * 手数料の計算単位
 *
 * perTicket:
 * チケット1枚ごとにかかる
 *
 * perApplication:
 * 申込1件ごとにかかる
 */
export type TicketFeeUnit =
  | "perTicket"
  | "perApplication";

/**
 * チケット形式
 */
export type TicketFormat =
  | "paper"
  | "digital"
  | "other";

/**
 * 精算の方向
 *
 * receive:
 * 相手から自分へ支払ってもらう
 *
 * pay:
 * 自分から相手へ支払う
 */
export type TicketSettlementDirection =
  | "receive"
  | "pay";

/**
 * 分配方法
 */
export type TicketDistributionMethod =
  | "digital"
  | "handOver"
  | "other";

/**
 * 席種
 *
 * 例：
 * SS席 18,000円
 * S席  15,000円
 * 指定席 12,000円
 */
export interface TicketSeatType {
  id: string;

  /**
   * 席種名
   */
  name: string;

  /**
   * チケット1枚あたりの価格
   */
  price: number;
}

/**
 * 手数料
 *
 * 名称は自由入力
 *
 * 例：
 * システム利用料
 * 発券手数料
 * 先行サービス料
 */
export interface TicketFee {
  id: string;

  /**
   * 手数料名
   */
  name: string;

  /**
   * 金額
   */
  amount: number;

  /**
   * 1枚ごとか、1申込ごとか
   */
  unit: TicketFeeUnit;
}

/**
 * 同行者との精算情報
 */
export interface TicketSettlement {
  id: string;

  /**
   * Companion.ts の同行者ID
   */
  companionId: string;

  /**
   * receive:
   * 相手 → 自分
   *
   * pay:
   * 自分 → 相手
   */
  direction: TicketSettlementDirection;

  /**
   * 精算金額
   */
  amount: number;

  /**
   * 精算済みか
   */
  isSettled: boolean;

  /**
   * YYYY-MM-DD
   */
  settledDate?: string;
}

/**
 * チケット代金の支払い情報
 */
export interface TicketPayment {
  /**
   * 支払期限
   * YYYY-MM-DD
   */
  deadlineDate?: string;

  /**
   * HH:mm
   */
  deadlineTime?: string;

  /**
   * 誰がチケット代を支払うか
   *
   * "self" = 自分
   * その他 = Companion.ts の同行者ID
   */
  payerId?: string;

  /**
   * 支払済みか
   */
  isPaid: boolean;

  /**
   * YYYY-MM-DD
   */
  paidDate?: string;

  /**
   * 同行者との精算
   */
  settlements: TicketSettlement[];
}

/**
 * 発券情報
 */
export interface TicketIssuance {
  /**
   * 発券開始
   */
  availableFromDate?: string;
  availableFromTime?: string;

  /**
   * 発券期限
   */
  deadlineDate?: string;
  deadlineTime?: string;

  /**
   * 紙 / デジタル / その他
   */
  format?: TicketFormat;

  /**
   * 発券済みか
   */
  isIssued: boolean;

  /**
   * YYYY-MM-DD
   */
  issuedDate?: string;
}

/**
 * 同行者への分配情報
 */
export interface TicketDistribution {
  id: string;

  /**
   * Companion.ts の同行者ID
   */
  companionId: string;

  /**
   * 分配方法
   */
  method?: TicketDistributionMethod;

  /**
   * 分配予定日
   * YYYY-MM-DD
   */
  plannedDate?: string;

  /**
   * 分配済みか
   */
  isDistributed: boolean;

  /**
   * 実際に分配した日
   * YYYY-MM-DD
   */
  distributedDate?: string;
}

/**
 * 発券後の実際の座席
 *
 * 席種（S席など）とは別。
 *
 * 例：
 * 1階 12列 23番
 */
export interface TicketSeatAssignment {
  id: string;

  /**
   * "self" = 自分
   * その他 = Companion.ts の同行者ID
   */
  holderId: string;

  /**
   * 実際の座席表記
   */
  seatLabel: string;
}

/**
 * 当選後の管理情報
 *
 * 支払い
 * 精算
 * 発券
 * 分配
 * 実座席
 */
export interface TicketFulfillment {
  payment: TicketPayment;

  issuance: TicketIssuance;

  distributions: TicketDistribution[];

  seatAssignments: TicketSeatAssignment[];
}

/**
 * 1つの申込内容
 *
 * 同じ先行・受付の中でも、
 * 複数の公演回へ申し込める。
 */
export interface TicketApplication {
  id: string;

  /**
   * Event.performances の公演回ID
   *
   * 例：
   * Event側の
   * 「2026/10/17 夜公演」
   * を参照する。
   *
   * 公演回を使用しないイベントでは
   * 未設定でもよい。
   */
  performanceId?: string;

  /**
   * TicketReception.seatTypes のID
   */
  seatTypeId?: string;

  /**
   * 申込枚数
   */
  quantity: number;

  /**
   * 希望順位
   *
   * 1 = 第1希望
   * 2 = 第2希望
   *
   * 希望順位がない場合は未設定
   */
  preferenceRank?: number;

  /**
   * 同行者
   *
   * Companion.ts のIDを格納。
   * 複数同行者対応。
   *
   * 自分自身は含めない。
   */
  companionIds: string[];

  /**
   * 受付番号・申込番号など
   *
   * パスワードや決済情報は保存しない。
   */
  applicationNumber?: string;

  /**
   * 申込・当落状態
   */
  status: TicketApplicationStatus;

  /**
   * 当選後の情報
   *
   * won の場合に使用する。
   */
  fulfillment?: TicketFulfillment;

  /**
   * この申込についての自由メモ
   */
  memo?: string;
}

/**
 * 先行・受付
 *
 * FC先行
 * シリアル先行
 * 一次先行
 * 一般販売
 * 先着販売
 * などをすべて扱う。
 */
export interface TicketReception {
  id: string;

  /**
   * 先行・受付名
   *
   * 自由入力
   */
  name: string;

  /**
   * 申込開始日時
   *
   * 不明・不要なら未入力
   */
  applicationStartDate?: string;
  applicationStartTime?: string;

  /**
   * 申込締切日時
   */
  applicationDeadlineDate?: string;
  applicationDeadlineTime?: string;

  /**
   * 当落発表日時
   *
   * 先着販売など、
   * 当落が存在しない場合は未入力
   */
  resultDate?: string;
  resultTime?: string;

  /**
   * この受付で選べる席種
   */
  seatTypes: TicketSeatType[];

  /**
   * この受付にかかる手数料
   */
  fees: TicketFee[];

  /**
   * この受付で行った申込
   *
   * 各申込は performanceId により
   * Event側の公演回を参照できる。
   */
  applications: TicketApplication[];

  /**
   * 受付についての自由メモ
   */
  memo?: string;
}

/**
 * イベントに紐づくチケット管理データ
 *
 * 1イベントにつき1つのTicketを持ち、
 * その中に複数の先行・受付を登録する。
 */
export interface Ticket {
  id: string;

  /**
   * Event.ts のイベントID
   */
  eventId: string;

  /**
   * 先行・受付一覧
   */
  receptions: TicketReception[];
}