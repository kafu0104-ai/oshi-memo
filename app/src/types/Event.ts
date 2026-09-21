export interface EventScheduleItem {
  id: string;

  /**
   * 時間項目の種類
   * 例：
   * doorsOpen = 開場
   * start = 開演
   * expectedEnd = 終演予定
   * screeningStart = 上映開始
   * screeningEnd = 上映終了
   * talkStart = トーク開始
   * talkEnd = トーク終了
   * custom = ユーザーが追加した時間
   */
  type:
    | "doorsOpen"
    | "start"
    | "expectedEnd"
    | "screeningStart"
    | "screeningEnd"
    | "talkStart"
    | "talkEnd"
    | "custom";

  /**
   * 画面に表示する名前
   * custom の場合は自由入力できる
   */
  label: string;

  /**
   * HH:mm
   * 未定の場合は空文字
   */
  time: string;
}

export interface Event {
  id: string;

  /**
   * 必須項目はイベント名だけ
   */
  title: string;

  /**
   * イベントタグ
   * 例：
   * ["movie", "talk"]
   */
  tagIds?: string[];

  /**
   * 開催期間
   * 未定の場合は空文字
   */
  startDate: string;
  endDate: string;

  /**
   * 開場・開演・上映時間など
   */
  schedule?: EventScheduleItem[];

  /**
   * 会場
   */
  venue: string;

  /**
   * 任意情報
   */
  officialUrl?: string;
  memo?: string;
}