# DATA

## 0. 命名規則

### ID

すべてのデータは一意のIDを持つ。

他データを参照する場合は「○○Id」の形式を使用する。

例

- eventId
- purchaserId
- productId
- categoryId

---

### 日時

日時は以下の命名を使用する。

- createdAt
- updatedAt

---

### 並び順

表示順は `sortOrder` を使用する。

数値が小さいものほど先頭に表示する。

---

### 真偽値

真偽値は状態を表す名前を使用する。

例

- purchased
- soldOut
- enabled

---

## 1. データ構造

```
Event
│
├── Purchaser
│     └── Purchase
│
├── Product
│     └── Purchase
│
└── BonusSetting

Master
├── Work
├── Group
├── Character
└── Category

AppSetting
```

---

## 2. Event

### 概要

イベントはOshiMemoにおける最上位データである。

商品・購入者・購入履歴・特典設定はすべてイベントに紐付く。

---

### Fields

| Field | Type | Required | Default | Description |
|------|------|:--------:|:-------:|-------------|
| id | string | ✔ | 自動生成 | イベントID |
| name | string | ✔ | - | イベント名 |
| date | string | | - | 開催日 |
| memo | string | | "" | イベントメモ |
| createdAt | datetime | ✔ | 自動生成 | 作成日時 |
| updatedAt | datetime | ✔ | 自動更新 | 更新日時 |

---

## 3. Purchaser

### 概要

イベントへ参加する購入者。

購入履歴・特典は購入者単位で管理する。

---

### Fields

| Field | Type | Required | Default | Description |
|------|------|:--------:|:-------:|-------------|
| id | string | ✔ | 自動生成 | 購入者ID |
| eventId | string | ✔ | - | 所属イベントID |
| name | string | ✔ | - | 購入者名 |
| themeColor | string | | - | テーマカラー |
| sortOrder | number | ✔ | 0 | 表示順 |
| createdAt | datetime | ✔ | 自動生成 | 作成日時 |
| updatedAt | datetime | ✔ | 自動更新 | 更新日時 |

---

## 4. Product

### 概要

イベントで販売される商品。

商品情報はイベント内で共通となり、すべての購入者が同じ商品を参照する。

---

### Fields

| Field | Type | Required | Default | Description |
|------|------|:--------:|:-------:|-------------|
| id | string | ✔ | 自動生成 | 商品ID |
| eventId | string | ✔ | - | 所属イベントID |
| number | string | | - | 商品番号 |
| name | string | ✔ | - | 商品名 |
| price | number | ✔ | 0 | 商品価格 |
| categoryId | string | | - | カテゴリーID |
| characterIds | string[] | | [] | キャラクターID一覧 |
| groupIds | string[] | | [] | グループID一覧 |
| image | string | | - | 商品画像 |
| releaseDate | string | | - | 発売日 |
| memo | string | | "" | メモ |
| sortOrder | number | ✔ | 0 | 表示順 |
| createdAt | datetime | ✔ | 自動生成 | 作成日時 |
| updatedAt | datetime | ✔ | 自動更新 | 更新日時 |

