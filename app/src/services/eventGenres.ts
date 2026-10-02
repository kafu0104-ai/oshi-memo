import type { Event } from "../types/Event";
import type { OshiIconName } from "../components/common/OshiIcon";
export const genreIcons: Record<string, OshiIconName> = {
  "goods-sale": "only-shop", live: "live-concert", stage: "stage-genre", movie: "movie-genre",
  talk: "message", exhibition: "exhibition-genre", "collaboration-food": "cafe", "online-sale": "online-sale-genre",
};
export const mainGenre = (event?: Event | null) => event?.mainGenreId ?? event?.tagIds?.find(id => id in genreIcons) ?? "";
export type GenreField = { key: string; label: string; type?: string; options?: string[] };
export const genreFields: Record<string, GenreField[]> = {
  "goods-sale": [{key:"openingTime",label:"営業開始時刻",type:"time"},{key:"closingTime",label:"営業終了時刻",type:"time"},{key:"lastAdmission",label:"最終入場",type:"time"},{key:"entryMethod",label:"入場方法",options:["自由入場","整理券","予約","抽選"]}],
  live: [{key:"performers",label:"出演者"}],
  stage: [{key:"performers",label:"出演者・キャスト"}],
  movie: [{key:"screen",label:"スクリーン"},{key:"screeningFormat",label:"上映形式",options:["通常","IMAX","4DX","その他"]}],
  talk: [{key:"performers",label:"出演者"},{key:"meetingTime",label:"集合・受付開始",type:"time"}],
  exhibition: [{key:"openingTime",label:"開館時刻",type:"time"},{key:"closingTime",label:"閉館時刻",type:"time"},{key:"lastAdmission",label:"最終入場",type:"time"},{key:"closedDays",label:"休館日"}],
  "collaboration-food": [{key:"openingTime",label:"営業開始時刻",type:"time"},{key:"closingTime",label:"営業終了時刻",type:"time"},{key:"lastAdmission",label:"最終入場",type:"time"},{key:"closedDays",label:"定休日"},{key:"partySize",label:"利用人数",type:"number"},{key:"reservationNeeded",label:"予約の要否",options:["不要","必要","未確認"]}],
  "online-sale": [{key:"saleStartTime",label:"販売・受注開始時刻",type:"time"},{key:"saleEndTime",label:"販売・受注締切時刻",type:"time"},{key:"saleType",label:"販売形式",options:["通常販売","受注","抽選"]},{key:"shippingEstimate",label:"発送予定時期"}],
};
export const extraModules: Record<string, {label:string; tags:string[]; fields:GenreField[]}> = {
  reservation: {label:"予約・整理券情報",tags:["goods-sale","exhibition","collaboration-food"],fields:[{key:"status",label:"予約状況",options:["未予約","予約済み","キャンセル"]},{key:"number",label:"予約番号・整理券番号"},{key:"deposit",label:"予約金（円）",type:"number"},{key:"cancelBy",label:"キャンセル期限",type:"datetime-local"}]},
  menu: {label:"注文したいメニュー",tags:["collaboration-food"],fields:[{key:"memo",label:"メニュー・価格・数量・特典のメモ",type:"textarea"}]},
  order: {label:"注文情報",tags:["online-sale"],fields:[{key:"status",label:"注文状況",options:["未注文","注文済み","キャンセル"]},{key:"number",label:"注文番号"},{key:"shipping",label:"送料（円）",type:"number"},{key:"payment",label:"支払い状況",options:["未払い","支払済み"]},{key:"delivery",label:"配送状況",options:["発送待ち","発送済み","受取済み"]},{key:"resultAt",label:"抽選結果発表",type:"datetime-local"},{key:"result",label:"抽選結果",options:["結果待ち","当選","落選"]}]},
};
export function fieldsForTags(tags: string[]) {
  return [...new Map(tags.flatMap(tag => genreFields[tag] ?? []).map(field => [field.key,field])).values()];
}

export function initialEntryPeriods(event?: Event | null): import("../types/Event").EntryPeriod[] {
  if (event?.entryPeriods) return event.entryPeriods;
  const details = event?.genreDetails;
  return [{id:"initial-period",startDate:"",endDate:"",method:details?.entryMethod ?? "",resultDate:details?.entryResultDate ?? "",resultTime:details?.entryResultTime ?? "",entries:event?.attendanceEntries ?? [{id:"initial-entry",date:event?.attendanceDate ?? "",time:event?.attendanceTime ?? "",result:details?.entryResult === "落選" ? "落選" : details?.entryResult === "当選" ? "当選" : "結果待ち"}]}];
}
