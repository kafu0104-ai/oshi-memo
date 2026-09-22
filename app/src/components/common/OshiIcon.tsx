import type { CSSProperties } from "react";

type OshiIconName =
  | "shopping-memo"
  | "benefit"
  | "buyers"
  | "settlement"
  | "unpurchased"
  | "purchased"
  | "release-date"
  | "shipped"
  | "waiting-release"
  | "restock-waiting"
  | "application"
  | "lottery-result"
  | "won"
  | "lost"
  | "payment-waiting"
  | "paid"
  | "advance-payment"
  | "settlement-complete"
  | "split-bill"
  | "breakdown"
  | "search"
  | "filter"
  | "category"
  | "label"
  | "favorite"
  | "oshi"
  | "add"
  | "edit"
  | "delete"
  | "more"
  | "home"
  | "memo-list"
  | "new-memo"
  | "schedule"
  | "live-concert"
  | "event"
  | "place"
  | "announcement"
  | "notification"
  | "settings"
  | "cafe"
  | "only-shop"
  | "exchange"
  | "travel"
  | "pilgrimage"
  | "photo"
  | "free-memo"
  | "todo"
  | "complete"
  | "ranking"
  | "ticket"
  | "reception"
  | "issuance"
  | "paper-ticket"
  | "digital-ticket"
  | "distribution"
  | "seat"
  | "companion"
  | "deadline"
  | "postal"
  | "hand-over"
  | "packaging"
  | "received"
  | "message"
  | "history"
  | "external-link";

const ICON_PATHS: Record<OshiIconName, string> = {
  "shopping-memo": "/assets/icons/01_shopping-memo.svg",
  benefit: "/assets/icons/02_benefit.svg",
  buyers: "/assets/icons/03_buyers.svg",
  settlement: "/assets/icons/04_settlement.svg",
  unpurchased: "/assets/icons/05_unpurchased.svg",
  purchased: "/assets/icons/06_purchased.svg",
  "release-date": "/assets/icons/07_release-date.svg",
  shipped: "/assets/icons/08_shipped.svg",
  "waiting-release": "/assets/icons/09_waiting-release.svg",
  "restock-waiting": "/assets/icons/10_restock-waiting.svg",
  application: "/assets/icons/11_application.svg",
  "lottery-result": "/assets/icons/12_lottery-result.svg",
  won: "/assets/icons/13_won.svg",
  lost: "/assets/icons/14_lost.svg",
  "payment-waiting": "/assets/icons/15_payment-waiting.svg",
  paid: "/assets/icons/16_paid.svg",
  "advance-payment": "/assets/icons/17_advance-payment.svg",
  "settlement-complete": "/assets/icons/18_settlement-complete.svg",
  "split-bill": "/assets/icons/19_split-bill.svg",
  breakdown: "/assets/icons/20_breakdown.svg",
  search: "/assets/icons/21_search.svg",
  filter: "/assets/icons/22_filter.svg",
  category: "/assets/icons/23_category.svg",
  label: "/assets/icons/24_label.svg",
  favorite: "/assets/icons/25_favorite.svg",
  oshi: "/assets/icons/26_oshi.svg",
  add: "/assets/icons/27_add.svg",
  edit: "/assets/icons/28_edit.svg",
  delete: "/assets/icons/29_delete.svg",
  more: "/assets/icons/30_more.svg",
  home: "/assets/icons/31_home.svg",
  "memo-list": "/assets/icons/32_memo-list.svg",
  "new-memo": "/assets/icons/33_new-memo.svg",
  schedule: "/assets/icons/34_schedule.svg",
  "live-concert": "/assets/icons/35_live-concert.svg",
  event: "/assets/icons/36_event.svg",
  place: "/assets/icons/37_place.svg",
  announcement: "/assets/icons/38_announcement.svg",
  notification: "/assets/icons/39_notification.svg",
  settings: "/assets/icons/40_settings.svg",
  cafe: "/assets/icons/41_cafe.svg",
  "only-shop": "/assets/icons/42_only-shop.svg",
  exchange: "/assets/icons/43_exchange.svg",
  travel: "/assets/icons/44_travel.svg",
  pilgrimage: "/assets/icons/45_pilgrimage.svg",
  photo: "/assets/icons/46_photo.svg",
  "free-memo": "/assets/icons/47_free-memo.svg",
  todo: "/assets/icons/48_todo.svg",
  complete: "/assets/icons/49_complete.svg",
  ranking: "/assets/icons/50_ranking.svg",
  ticket: "/assets/icons/51_ticket.svg",
  reception: "/assets/icons/52_reception.svg",
  issuance: "/assets/icons/53_issuance.svg",
  "paper-ticket": "/assets/icons/54_paper-ticket.svg",
  "digital-ticket": "/assets/icons/55_digital-ticket.svg",
  distribution: "/assets/icons/56_distribution.svg",
  seat: "/assets/icons/57_seat.svg",
  companion: "/assets/icons/58_companion.svg",
  deadline: "/assets/icons/59_deadline.svg",
  postal: "/assets/icons/60_postal.svg",
  "hand-over": "/assets/icons/61_hand-over.svg",
  packaging: "/assets/icons/62_packaging.svg",
  received: "/assets/icons/63_received.svg",
  message: "/assets/icons/64_message.svg",
  history: "/assets/icons/65_history.svg",
  "external-link": "/assets/icons/66_external-link.svg",
};

interface OshiIconProps {
  name: OshiIconName;
  size?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function OshiIcon({
  name,
  size = 24,
  alt = "",
  className,
  style,
}: OshiIconProps) {
  return (
    <img
      src={ICON_PATHS[name]}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export type { OshiIconName };