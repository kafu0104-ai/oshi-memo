# 支払いタスクの相殺機能（2026-10-08）

## 対象と操作

ユーザー確認済みの方針として、相殺するのは同行者との精算（TicketSettlement）だけです。チケット購入そのものの支払い（TicketPayment）は従来の通常支払いを維持します。

既存の支払いタスク詳細に「通常支払い」「相殺のみ」「相殺＋差額精算」を追加しました。受け取り一覧からも「支払い・相殺の記録と履歴」で同じ画面に入れます。新しい独立メニューや支払い管理システムは追加していません。

同じ同行者ID・反対方向・未精算の項目を全登録イベントから検索し、イベント全体／個別明細を選択できます。元金額、対象合計、相殺額、差額、支払者・受取者を表示し、確認後に保存します。精算方法を切り替えても選択と日付は保持します。

相殺のみでは金銭授受日を作らず、残額は元のタスクに表示します。差額精算は相殺日と別の日付で記録できます。差額0円では金銭授受日は不要です。

## データと整合性

- 既存の `TicketSettlement.amount` は元金額として保持。最初の相殺時に自動算出額を確定し、`offsetAmount` と `cashAmount` を別々に記録します。
- 未精算残額＝元金額－相殺累計－金銭授受累計。すべて安全な円整数で計算し、不正値・負残額・合計のオーバーフローを拒否します。
- 相殺履歴は相殺元の `Ticket.offsetHistory` に保存。相殺ID、同行者ID、日時、全イベント・支払いID、金額、方向、明細ごとの配賦、精算状態を保持します。
- 相殺後に通常支払いや別の相殺で残額を精算した場合も、元の履歴の精算状態と差額精算日を更新します。処理時点の明細金額は改変しません。
- 全関連残額と履歴を既存の `oshi-memo-tickets` へ単一の `localStorage.setItem` で保存し、片側だけの更新を防ぎます。
- 同一ブラウザ・同一オリジンの書き込みを Web Locks で直列化。確定時に最新データと表示時の状態を再照合し、連打・別タブ・途中変更を検知します。
- 通常編集や削除による相殺履歴・残額の破壊は保存時にも拒否します。相殺のある精算の金額変更、精算取消、チケット・イベント削除は制限し、残額の記録はタスク詳細へ案内します。
- 期限、通常の購入側支払い、タグを保持します。新たな重複ToDoは作成しません。
- 既存のバックアップ・手動クラウド同期はチケットデータを丸ごと扱うため、新項目と履歴も一緒に保存・復元されます。復元操作も同じロックを使います。

## 変更ファイル

新規:

- `app/src/types/SettlementOffset.ts`: 相殺参照・明細・履歴の型
- `app/src/services/settlementOffsets.ts`: 候補抽出、整数計算、配賦、再検証、現金精算、履歴更新、保存保護
- `app/src/services/personalDataLock.ts`: 同一ブラウザ内の排他制御
- `app/src/pages/Home/SettlementTaskForm.tsx`: 選択・計算・確認・完了・履歴UI
- `app/tests/settlement-offsets.test.cjs`: 相殺の回帰テスト29件
- `docs/settlement-offsets.md`: この実装記録

更新:

- `app/src/types/Ticket.ts`: 互換性を保つ任意項目を追加
- `app/src/services/storage.ts`: 保存の直列化・単一保存トランザクション・上書き防止
- `app/src/services/ticketTasks.ts`: 残額・相殺完了日と受け取り集約
- `app/src/pages/Home/TicketTaskPage.tsx`: 既存詳細への組み込み
- `app/src/pages/Home/ReceiptTasksPage.tsx`: 相殺への導線と誤った受領取消の防止
- `app/src/pages/Home/TicketTodos.tsx`: ホーム・一覧で残額を表示
- `app/src/pages/Ticket/TicketPayments.tsx`: 相殺済み金額の保護・詳細への導線
- `app/src/index.css`: 既存配色に合わせたスマートフォン向け表示
- `app/src/pages/Settings/PersonalSyncPage.tsx`: 復元操作の排他制御
- `app/src/components/event/EventForm.tsx`
- `app/src/pages/Event/EventDetailPage.tsx`
- `app/src/pages/Event/EventPage.tsx`
- `app/src/pages/Ticket/DeleteReception.tsx`
- `app/src/pages/Ticket/NewTicketPage.tsx`
- `app/src/pages/Ticket/ReceptionForm.tsx`
- `app/src/pages/Ticket/TicketEditPage.tsx`
- `app/src/pages/Ticket/TicketPage.tsx`: 以上の既存フォームで非同期保存の完了・失敗を待つよう変更
- `app/tests/event-ticket-registration.test.cjs`: 非同期保存に合わせた回帰テスト
- `app/tests/ticket-reception.test.cjs`: 実際の依存モジュールを読み込むようテスト環境を修正

作業開始時から存在した券種・取込関連の変更は維持しています。

## 検証結果

- TypeScript・Viteの本番ビルド成功。
- 相殺の追加テスト29件すべて成功。通常支払い、2イベント、3イベント以上、同イベント内明細、一部相殺、対象超過、差額ゼロ、差額精算、残額の再精算、ToDo、異なる同行者・同方向・精算済みの除外、日付、整数、二重選択・二重確定、競合、容量不足、再読込相当、バックアップ復元、履歴表示・更新、通常編集からの破壊防止を確認。
- CJS回帰テスト全156件: 153件成功、3件失敗。失敗は既存の `entry-summary.test.cjs`（当落・参加日時の表示）。変更前のHEADを `/tmp/oshi-offset-baseline-20261008` に展開して同じ3件の失敗を再現済み。対象コンポーネントは今回変更していません。
- 390px幅のローカルブラウザで、イベント一括／個別選択、方法切り替え、確認画面、相殺のみ保存、再読み込み後の残額、別イベントとの追加相殺＋別日の差額精算を確認。未完了ToDoが0件になり、両側の精算が完了することを確認。横方向のはみ出しなし（clientWidth=scrollWidth=390）。架空データを専用ポート5198で使用し、既存ローカルデータを上書きしていません。

## 未対応・制約

- 複数端末のリアルタイム同期・サーバー上での精算トランザクションは未追加です。従来の手動スナップショット同期を使用します。排他保証は同一オリジン・同一ブラウザのタブ間です。異なる端末でオフラインに並行して記録する運用をリアルタイムには防げません。
- Web Locks非対応ブラウザでは安全のため相殺確定を拒否します。通常支払いは維持します。
- 相殺の取消・訂正は今回の指定外のため未実装です。履歴を保つため相殺済みデータの直接変更・削除は制限します。
- 上記の既存表示テスト3件の失敗は未修正です。

## 公開

本人限定テストサイトへ公開成功: https://oshi-memo-test.yuu0629.chatgpt.site

公開用ソースコミット: `2a4436471bf78752466b2b22fb001a97397c7618`。既存の本人限定アクセスを維持しています。Workerの追加テスト6件も成功（相殺29件と合わせて35件成功）。ローカルQA用のページは成果物に含めず、検証後に削除しました。

## 2026-10-08 購入支払い画面からの入口修正

購入自体の支払い画面にも「相殺するイベントを選ぶ」を追加。既存の同行者精算を選ぶと相殺候補のイベント一覧を表示する。未登録の場合は既存と同じチケット1枚分・手数料込みの金額を明示して登録できる。購入の支払い状態・期限は変更しない。

変更: `PaymentOffsetEntry.tsx`（新規）、`paymentSettlementEntry.ts`（新規）、`TicketTaskPage.tsx`、`SettlementTaskForm.tsx`、`index.css`、`settlement-offsets.test.cjs`。

検証: ビルド成功。相殺関連32件すべて成功（入口の表示、対象イベントの表示、精算登録時の購入状態保持、重複防止、変更時の拒否を追加）。
