# 友人との買い物メモ共有：接続手順

Supabaseプロジェクト作成・初回SQL・LINE用の追加SQL・アプリの接続情報の設定は完了。2026-09-25、MacのEdgeでLINEログイン後に「ログイン中」の共有画面へ戻ることをユーザーの操作とスクリーンショットで確認済み。利用するプロバイダーは `custom:line-oauth`（OAuth2手動設定）。外部公開と実際の2人での共同保存はまだ未確認。

## 1. 保存先を作る

1. https://supabase.com/dashboard でアカウントを作成する。
2. 新しいプロジェクト（例：oshi-memo）を作る。データベースのパスワードは手元に保管する。
3. SQL Editor で `supabase/migrations/202609250001_shared_shopping.sql` の全文を一度実行する。
4. Project URL と publishable key を確認する。管理者用の secret key / service_role key はアプリに設定しない。
5. `app/.env.example` を `app/.env.local` としてコピーし、上記の2つを設定する。
6. 開発サーバーを再起動する。

## 2. LINEログインを設定する

1. 初回SQLの後に `supabase/migrations/202609250002_line_join_requests.sql` をSQL Editorの新しいクエリで実行する。既存の共有メモは保持する。
2. LINE DevelopersでLINEログインのウェブアプリ用チャネルを作成する。
3. Supabase AuthenticationでCustom OAuth Providerを追加する。識別子は `custom:line-oauth`（入力欄に `custom:` が付いている場合は `line-oauth` のみ入力）、表示名は `LINE`、Manual configuration（OAuth2）を選択する。旧 `custom:line` のOIDC設定では、実接続時にLINEのHS256署名の検証で失敗したため使用しない。
4. Issuer URLは `https://access.line.me`、Authorization URLは `https://access.line.me/oauth2/v2.1/authorize`、Token URLは `https://api.line.me/oauth2/v2.1/token`、Userinfo URLは `https://api.line.me/oauth2/v2.1/userinfo`。JWKS URIは入力しない。Client IDにチャネルID、Client Secretにチャネルシークレットを直接入力する。シークレットはフロントエンドやリポジトリに保存しない。
5. Scopesは `openid, profile`、Allow users without emailはONにする。
6. Supabaseに表示されるCallback URLをコピーし、LINE Developersの「LINEログイン設定」→「コールバックURL」に保存する。
7. Supabase Authentication → URL Configuration → Redirect URLsに `http://localhost:5173/auth/callback` を追加する。公開後は公開URLの `/auth/callback` も追加し、Site URLを公開URLにする。別ポートでテストする場合はそのポートも一致させる。
8. アプリの「友人との共有」からLINEログインを試す。招待からログインした場合は参加申請画面へ戻る。

開発中のLINEチャネルでは利用者が制限される。友人への提供前にLINE側の公開状態・利用可能なユーザーを確認する。

公式資料：
- https://supabase.com/docs/guides/auth/custom-oauth-providers
- https://supabase.com/docs/guides/auth/redirect-urls
- https://developers.line.biz/ja/docs/line-login/getting-started/

### メールログイン（任意の予備手段）

Authentication の Email プロバイダーを有効にする。Magic Link のメールテンプレートに以下を設定する。

```html
<h2>推しメモのログイン確認コード</h2>
<p>アプリに以下のコードを入力してください。</p>
<p>{{ .Token }}</p>
```

本アプリはメールリンクではなく、入力する確認コード（OTP）でログインする。別のスマホでも同じメールアドレスでログインできる。

Supabase の標準メール送信には送信先・回数の制限がある。友人へのログインメールを送るため、Authentication の SMTP Settings で独自のメール送信サービスを設定する。開発中のテストと一般の友人への配布は区別する。

公式資料：
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/database/postgres/row-level-security

## 3. 友人が開けるURLを用意する

現在の `localhost` は自分の端末のみ、`192.168...` は同じWi-Fi内のみで利用できる。外出先・友人宅から使うにはアプリをHTTPSで公開する。

既存のViteアプリをホスティングする際は、ルートディレクトリを `app`、ビルドを `npm run build`、公開先を `dist` にする。環境変数は `.env.example` と同じ2項目を設定し、`/shared/...` への直接アクセスを `index.html` に戻すSPAリライトを設定する。ホスティング先の決定・接続・公開は別途必要。

## 4. 使い方

1. 「買い物メモ」または「設定・管理」から「友人との共有」を開き、LINEでログイン。
2. 個人用イベントを選び、表示名を入力し「共有用の買い物メモを作成」。
3. 初期状態では商品一覧と特典設定だけ取り込む。チェックを入れた場合は購入者・注文のメモ等も共有される。チケットやイベントの個人メモは送信しない。
4. 管理者が招待の目印となる名前と権限（閲覧のみ／共同編集）を指定し、招待リンクを作る。
5. そのリンクを手動で友人へ送る。アプリから招待メールは送信しない。
6. 友人がLINEでログインし、名前を入力して参加申請する。管理者がLINE等で本人を確認して承認すると、共有メモを開ける。申請名は自己申告のため本人確認の証拠にはならない。
7. 共有画面で数量・購入状況・共有メモを編集し「変更を保存」。他の人の画面は約10秒ごとに更新する。

個人用の元データとは別の共有コピーであり、元の買い物メモに対する編集は同期されない。共同作業は「共有中」の画面を使う。

## 5. 権限と同時編集

- 未ログイン・未参加の人は、URLやIDを知っていてもデータを取得できない。
- 招待リンクは7日間・承認1回限り。管理者が取消可能。リンクだけでは閲覧できず、参加申請後の管理者承認が必要。
- 共同編集者は共有メモ全体の数量・購入状態・メモ・購入者を編集できる。自分の分だけに限定する権限は未実装。
- 閲覧者は保存不可。管理者のみ招待・共有解除が可能。
- 共有解除は今後の読み込み・保存を止める。既に相手が閲覧した内容を回収するものではない。
- 保存は版番号付き。先に別の人が保存していたらエラーになり、自分の未保存入力は保持する。自動上書き・自動マージはしない。
- オフライン編集の自動再送はしない。通信失敗時には画面内の入力を保持する。保存前に画面を離れると入力は失われる。
- ローカルのチケット・精算・個人メモはクラウドへ移さない。
- 共有画面では商品の手動追加・編集も可能。商品データ一括取り込み・特典振り分けの編集は現在個人用画面のみ。共有画面は注文の共同管理が初期対象。

## 公開前の接続テスト（必須・未実施）

LINE認証はMacのEdge・localhostで確認済み。公開URLでのLINE認証・2アカウント間の同期・スマホからの接続は未確認。

1. 管理者A／編集者B／閲覧者C／未参加Dのアカウントを用意。
2. Aが作ったルームをDと未ログインから取得できないこと。
3. Bの保存がAへ反映され、Cの保存がサーバー側で拒否されること。
4. 同じ版を開いたA/Bが順に保存すると2番目はCONFLICTになること。
5. 承認前のアクセス、期限切れ、取消済み、使用済みの招待が拒否されること。
6. 解除したBが読み書きできないこと。
7. ネット切断で成功表示が出ず、入力が保持されること。
8. 公開URLの招待リンクをスマホから直接開けること。

## 開発側の確認結果

ローカルのPostgreSQL互換テスト環境（PGlite）で、SQL移行・未参加者の拒否・閲覧者の書込拒否・招待メール一致・期限切れ／使用済み／取消済み招待の拒否・版番号の競合・共有解除後の拒否を検証済み。追加SQLについても、メールなしのユーザー作成・承認前アクセス拒否・本人による自己承認の拒否・承認後の権限・リンク取消を検証済み。LINEの戻り先制限とコード交換の重複防止も検証済み。実際のSupabase AuthとLINEの接続は、2026-09-25にMacのEdge・localhostで成功を確認済み。OIDC自動設定では `unexpected signature algorithm "HS256"` で失敗し、OAuth2手動設定への切り替えで解消した。

再実行例（appフォルダから）：

```sh
node --test tests/shared-shopping.test.cjs tests/shopping.test.cjs tests/line-auth.test.cjs
# @electric-sql/pgliteをテスト環境へインストールした場合
PGLITE_MODULE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node --test tests/sharing-access.test.mjs tests/line-sharing-access.test.mjs
```
