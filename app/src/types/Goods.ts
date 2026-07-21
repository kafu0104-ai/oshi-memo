export const GOODS_STATUS = [
  "未購入",
  "保留",
  "購入済み",
  "売切れ",
  "再入荷待ち",
  "事後通販待ち",
  "見送り",
] as const;

export type GoodsStatus = (typeof GOODS_STATUS)[number];

export interface Goods {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  purchaserId?: string;
  status: GoodsStatus;
  memo?: string;
}