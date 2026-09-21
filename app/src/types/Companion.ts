/**
 * 同行者
 *
 * チケット申込・精算・分配などで共通利用する。
 * イベントごとには作らず、
 * OshiMemo全体で再利用するマスターデータ。
 */
export interface Companion {
  id: string;

  /**
   * 表示名
   *
   * 例：
   * A子
   * ○○ちゃん
   * 姉
   */
  name: string;

  /**
   * 任意メモ
   *
   * 個人情報ではなく、
   * ユーザー自身が識別するための簡単なメモを想定。
   */
  memo?: string;

  /**
   * 作成日時
   * ISO形式
   */
  createdAt: string;

  /**
   * 更新日時
   * ISO形式
   */
  updatedAt: string;
}