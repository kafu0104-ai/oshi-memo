/**
 * イベント共通の時間情報
 *
 * 既存イベントとの互換性のため残す。
 * 今後、複数公演があるイベントでは
 * EventPerformance.schedule を優先して使用する。
 */
export interface EventScheduleItem {
  id: string;

  type:
    | "doorsOpen"
    | "start"
    | "expectedEnd"
    | "screeningStart"
    | "screeningEnd"
    | "talkStart"
    | "talkEnd"
    | "custom";

  label: string;

  /**
   * HH:mm
   */
  time: string;
}


/**
 * イベント内の1公演・1回分
 *
 * 例：
 * 10/17 13:00 昼公演
 * 10/17 18:00 夜公演
 *
 * 舞台のマチネ・ソワレ、
 * ライブの昼夜公演、
 * 映画の上映回などを管理する。
 */
export interface EventPerformance {
  venue?: string;
  id: string;

  /**
   * 公演日
   * YYYY-MM-DD
   */
  date: string;

  /**
   * 公演回の表示名
   *
   * 例：
   * 昼公演
   * 夜公演
   * マチネ
   * ソワレ
   * 第1部
   * 第2部
   *
   * 任意入力
   */
  name?: string;

  /**
   * この公演回の時間情報
   *
   * 例：
   * 開場 12:00
   * 開演 13:00
   * 終演予定 15:30
   */
  schedule: EventScheduleItem[];

  /**
   * 公演回についての任意メモ
   *
   * 例：
   * アフタートークあり
   * 千秋楽
   */
  memo?: string;
}


/**
 * イベント
 */
export interface AttendanceEntry {
  id: string;
  date: string;
  time: string;
  result: "結果待ち" | "当選" | "落選";
}

export interface EntryPeriod {
  ticketPrice?: number;
  ticketQuantity?: number;
  ticketPurchased?: boolean;
  ticketStatus?: "notApplied" | "applied" | "won" | "lost";
  ticketPayerId?: string;
  bookingUrl?: string;
  paymentDeadline?: string;
  queueNumber?: string;
  queueEntryTime?: string;
  queueMeetingTime?: string;
  id: string;
  name?: string;
  applicationStart?: string;
  applicationEnd?: string;
  startDate: string;
  endDate: string;
  method: string;
  resultDate: string;
  resultTime: string;
  entries: AttendanceEntry[];
}

export interface Event {
  liveFormat?: "single" | "tour";
  entryPeriods?: EntryPeriod[];
  attendanceEntries?: AttendanceEntry[];
  mainGenreId?: string;
  attendanceDate?: string;
  attendanceTime?: string;
  genreDetails?: Record<string, string>;
  extraModules?: Record<string, Record<string, string>>;

  id: string;

  /**
   * イベント名
   */
  title: string;

  /**
   * イベントタグ
   */
  tagIds?: string[];

  /**
   * イベント全体の開催期間
   *
   * YYYY-MM-DD
   */
  startDate: string;
  endDate: string;

  /**
   * イベント共通の時間情報
   *
   * 既存データとの互換性のため残す。
   *
   * performances が登録されている場合は、
   * 原則 performances 側の時間を使用する。
   */
  schedule?: EventScheduleItem[];

  /**
   * 自分が管理したい公演回
   *
   * マチソワ・複数日・複数上映回などに対応。
   *
   * 公演回を特に管理しないイベントでは
   * 未設定でもよい。
   */
  performances?: EventPerformance[];

  /**
   * 会場
   */
  venue: string;

  /**
   * 公式サイト
   */
  officialUrl?: string;

  /**
   * イベント全体についての補足
   */
  memo?: string;
}