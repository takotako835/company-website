# 07. Render へのデプロイ手順

このサイトを Render の **Web Service** として公開する手順です。
専門知識がなくても進められるよう、画面の操作を1つずつ書いています。

- 費用: **有料プラン(Starter・$7/月)** を使います。お問い合わせフォームのメール送信に
  サーバーが必要なためです(無料プランは15分で停止し、次の訪問者が約1分待たされます)
- 所要時間: 初回のみ約30分。2回目以降の更新は数分で自動反映されます
- リポジトリには `render.yaml`(設定ファイル)が入っているため、Render 側での設定入力はほとんど不要です

> **なぜサーバーが必要なのか**
> お問い合わせフォームは Resend というサービスでメールを送ります。
> その API キーは秘密の値で、ブラウザ側に置くと誰にでも見えてしまいます。
> そのため、サーバー側でキーを預かって送信する必要があります。

---

## 事前に必要なもの

| 必要なもの | 用途 | 取得先 |
|---|---|---|
| GitHub アカウント | サイトのソースコードを置く場所 | https://github.com/signup |
| Render アカウント | サイトを公開するサービス | https://render.com |
| Resend アカウント | お問い合わせフォームのメール送信 | https://resend.com |

> Render は「GitHub に置いたコードを読み取って公開する」仕組みです。
> そのため **先に GitHub へコードを置く(STEP 1)** 必要があります。

---

## STEP 1. GitHub にリポジトリを作り、コードを置く

### 1-1. GitHub でリポジトリを作る

1. https://github.com/new を開く
2. 以下を入力する
   - **Repository name**: `company-website`(任意の名前で構いません)
   - **Public / Private**: どちらでも動きます。社外に見せたくない場合は **Private** を選ぶ
   - **Add a README file 等のチェックは、すべて外したまま**にする(すでに手元にファイルがあるため)
3. 「Create repository」を押す
4. 次の画面に表示される URL(`https://github.com/ユーザー名/company-website.git`)を控える

### 1-2. 手元のコードを GitHub に送る

プロジェクトのフォルダで、PowerShell を開いて以下を順に実行します。
`ユーザー名` の部分は、自分の GitHub アカウント名に置き換えてください。

```powershell
# プロジェクトフォルダに移動
cd "$env:USERPROFILE\OneDrive\デスクトップ\Dev\company-website"

# 1-1 で控えた URL を登録する(初回のみ)
git remote add origin https://github.com/ユーザー名/company-website.git

# GitHub へ送信する
git push -u origin main
```

初回は GitHub へのログインを求められます。ブラウザが開いたら、画面の指示に従って許可してください。

> **すでに `origin` が登録済みです** というエラーが出た場合は、
> `git remote set-url origin https://github.com/ユーザー名/company-website.git` を実行してから、もう一度 push します。

GitHub のページを再読み込みして、ファイル一覧が表示されれば成功です。

---

## STEP 2. Render でサイトを作る(Blueprint を使う)

`render.yaml` に設定が書いてあるため、**Blueprint** という機能を使うのが最も簡単で確実です。

1. https://dashboard.render.com にログインする
2. 画面右上の **「+ New」** を押し、**「Blueprint」** を選ぶ
3. **「Connect GitHub」**(または「Configure account」)を押し、Render に GitHub への接続を許可する
   - 「All repositories」または STEP 1 で作ったリポジトリだけを選択して許可する
4. リポジトリの一覧から `company-website` を選び、**「Connect」** を押す
5. Render が `render.yaml` を自動で読み取り、`maido-crafts-website` というサービスが1件表示される
   - **Blueprint Name**: そのままで構いません
   - 表示された内容(Web Service / Starter / Build Command / Start Command)を確認する
6. **「Apply」**(または「Create New Resources」)を押す

これでビルドとデプロイが始まります。**3〜5分ほど**で完了します。

### 進行状況の見かた

- 左メニューの **Dashboard** → `maido-crafts-website` を開く
- **Logs** タブでビルドの進行が見られます
- ステータスが緑色の **「Live」** になれば公開完了です
- 画面上部に表示される `https://〇〇.onrender.com` がサイトのURLです

---

## STEP 3. 公開URLを設定に反映する(重要)

Render の URL は、サービス名が他の人と重複していると `maido-crafts-website-a1b2.onrender.com` のように
**末尾に文字が追加される**ことがあります。その場合、検索エンジン向けの情報(canonical・sitemap)が
実際のURLとずれてしまうため、設定を合わせます。

1. STEP 2 で表示された実際のURL(例: `https://maido-crafts-website-a1b2.onrender.com`)を控える
2. Render のサービス画面で、左メニューの **「Environment」** を開く
3. `SITE_URL` の値を、控えた実際のURL に書き換える(**末尾のスラッシュは付けない**)
4. **「Save, rebuild, and deploy」** を押す

再デプロイが終われば完了です。

> 表示されたURLが `render.yaml` に書いてある `https://maido-crafts-website.onrender.com` と
> 同じであれば、この STEP 3 は不要です。

---

## STEP 4. 公開できたか確認する

以下をブラウザで開いて確認してください。

| 確認するURL | 期待する結果 |
|---|---|
| `https://〇〇.onrender.com/` | トップページが表示される |
| `https://〇〇.onrender.com/services/` | サービスページが表示される |
| `https://〇〇.onrender.com/sonzai-shinai-page` | 「ページが見つかりません」(404ページ)が表示される |
| `https://〇〇.onrender.com/robots.txt` | `Sitemap: https://〇〇.onrender.com/sitemap-index.xml` と表示される |
| `https://〇〇.onrender.com/sitemap-index.xml` | XMLが表示される |

スマートフォンでも開いて、レイアウトが崩れていないか確認してください。

---

## STEP 5. お問い合わせフォームを有効にする

サイトには LINE 導線に加えて、`/contact/` に**お問い合わせフォーム**があります。
送信されると **Resend** というサービス経由でメールが届きます
(vietnam-guidebook と同じ仕組みです)。

**下の3つの設定がすべて揃うまで、フォームは表示されず LINE のご案内が出ます。**
壊れたフォームを公開してしまわないようにするためです。

### 5-1. Resend でドメインを認証する

差出人を自社ドメインにするため、ドメインの認証が必要です。
(認証しないと、迷惑メールに振り分けられて届きません)

1. https://resend.com にログインする
2. 左メニュー **「Domains」** → **「Add Domain」**
3. `ywc-maido.com` を入力して追加する
4. 表示された **DNS レコード**(SPF・DKIM など)を控える
5. ドメインを管理している会社(お名前.com 等)の管理画面で、控えたレコードを登録する
6. Resend の画面に戻り、状態が **「Verified」** になるのを待つ(反映まで数分〜数時間)

> すでに vietnam-guidebook で同じドメインを認証済みなら、この手順は不要です。
> Domains の一覧に出ていれば、そのまま使えます。

### 5-2. API キーを作る

1. Resend の左メニュー **「API Keys」** → **「Create API Key」**
2. 名前は `company-website` など分かるものにする
3. 権限は **「Sending access」** で十分です
4. 表示された `re_...` で始まるキーを控える
   - **この画面を閉じると二度と表示されません。** 必ずこの場で控えてください
   - **★このキーは秘密です。** メールやチャットに貼らず、リポジトリにも書かないでください

### 5-3. Render に3つの設定を入れる

1. Render Dashboard → `maido-crafts-website` → 左メニュー **「Environment」**
2. **「Add Environment Variable」** で、以下の3つを追加する

   | Key | Value | 説明 |
   |---|---|---|
   | `RESEND_API_KEY` | 5-2 で控えた `re_...` | ★秘密の値 |
   | `MAIL_FROM` | `maido&crafts strategy <no-reply@ywc-maido.com>` | 差出人。`@` の後ろは 5-1 で認証したドメイン |
   | `CONTACT_TO` | `support@ywc-maido.com` | お問い合わせの届け先 |

3. **「Save, rebuild, and deploy」** を押す

### 5-4. 動作確認(必ず実施してください)

1. 再デプロイ後、`https://〇〇.onrender.com/contact/` を開く
2. フォームが表示されていることを確認する
3. **実際にテスト送信してみる**(自分宛に届くので問題ありません)
4. 「お問い合わせを受け付けました」のページに移ることを確認する
5. **`CONTACT_TO` に指定したアドレスにメールが届くこと**を確認する
6. **届いたメールにそのまま返信すると、問い合わせた人に届く**ことを確認する
   (差出人は自社ドメイン、返信先は問い合わせ者のアドレスになっています)

フォームが表示されない場合は、3つの環境変数がすべて入っているかを確認してください。
1つでも欠けていると、フォームは出ません。

### 5-5. 迷惑メール対策

フォームには次の対策を入れてあります。追加の設定は不要です。

- **honeypot**: 人には見えないダミー項目。自動投稿はここに入力するため見分けられます
- **連投の制限**: 同じ相手からは10分間に5件まで
- **他サイトからの投稿の拒否**: このサイト以外からの送信は受け付けません

---

## STEP 6. 独自ドメインを設定する(任意・ドメイン確定後)

`ywc-maido-okini.com` などの独自ドメインを使う場合の手順です。

1. Render のサービス画面 → 左メニュー **「Settings」** → **「Custom Domains」**
2. **「Add Custom Domain」** を押し、使いたいドメイン(例: `www.example.com`)を入力する
3. Render が表示する **DNS レコード**(CNAME または A レコード)を控える
4. ドメインを管理している会社(お名前.com・ムームードメイン・Cloudflare など)の管理画面で、
   控えたレコードを登録する
5. Render の画面に戻り、**「Verify」** を押す(反映まで最大数時間かかることがあります)
6. 検証が通ると、**SSL証明書(https化)は Render が自動で発行します**
7. 最後に **STEP 3 と同じ手順で `SITE_URL` を独自ドメインのURLに変更**し、再デプロイする

---

## サイトを更新するには

**GitHub の `main` ブランチに push するだけで、自動的に再デプロイされます。**

```powershell
cd "$env:USERPROFILE\OneDrive\デスクトップ\Dev\company-website"

git add .
git commit -m "feat: お知らせを追加"
git push
```

Render の Dashboard を見ると、数分後に新しいデプロイが「Live」になります。

### お知らせ記事だけを追加したい場合

`src/content/news/` に Markdown ファイルを1つ追加して push するだけです。
書き方は [README.md](../README.md) を参照してください。

---

## 注意点・よくあるつまずき

### プランについて

- `render.yaml` では **Starter($7/月)** を指定しています
- **無料プランに変更しないでください。** 15分アクセスがないとサーバーが停止し、
  次の訪問者が約1分待たされます。コーポレートサイトでは致命的です
- サイトの表示が重くなってきたら、Render の画面で上位プランに変更できます
  (`render.yaml` の `plan` も合わせて書き換えてください)

### ビルドが失敗する(Deploy failed と出る)

#### 最初に確認: サービスの Build Command が最新になっているか

`render.yaml` を修正しても、**すでに作成済みのサービスに反映されていない**ことがあります。
とくに、最初の Blueprint 同期が失敗した状態で作られたサービスで起こります。

1. Render Dashboard → `maido-crafts-website` を開く
2. 左メニューの **「Settings」** → **「Build & Deploy」** の **Build Command** を見る
3. 次の値になっているか確認する

   ```
   rm -rf node_modules package-lock.json && npm install --no-audit --no-fund && npm run build
   ```

4. `npm ci && npm run build` など**古い値のままだったら、その場で書き換えて保存**する
   (この画面で直接編集できます)
5. あわせて **Start Command** が `node ./dist/server/entry.mjs`、
   **Branch** が `main` になっているかも確認する

#### それでも失敗する場合

1. サービス画面の **Logs** タブを開き、赤いエラーメッセージを探す
2. よくある原因:

| エラーの内容 | 原因と対処 |
|---|---|
| `Cannot find package '@tailwindcss/vite'` などパッケージが見つからない | **Render は `NODE_ENV=production` を設定するため、`npm ci` / `npm install` が devDependencies を除外します。** ビルドに必要なパッケージは `package.json` の `dependencies` 側に置いてください(対応済み) |
| `Cannot find native binding` / `Cannot find module '@rolldown/binding-...'` | npm の既知バグ(npm/cli#4828)。**`npm ci` を使わない**ことに加え、**`node_modules` を毎回削除する**必要があります(対応済み。下記参照)。ログに `up to date in 1s` と出ていたら、Render のキャッシュが使われて再インストールされていないサインです |
| Node のバージョン関連 | `render.yaml` の `NODE_VERSION` を確認する |

3. 手元で確認するときは、**Render と同じ条件**にすると再現できます

```powershell
$env:NODE_ENV = "production"
Remove-Item -Recurse -Force node_modules, dist, package-lock.json -ErrorAction SilentlyContinue
npm install
npm run build
Remove-Item Env:\NODE_ENV     # 確認が終わったら必ず戻す
npm install                   # ロックファイルを作り直しておく
```

> ここで成功すれば、Render でも同じ結果になります。
> 単に `npm run build` だけで確認すると、devDependencies が入ったままなので**この不具合を見逃します**。

### なぜ `npm ci` ではなく `npm install` なのか(技術メモ)

`render.yaml` のビルドコマンドは、あえて次のようにしています。

```
rm -rf node_modules package-lock.json && npm install --no-audit --no-fund && npm run build
```

通常 CI では `npm ci` を使うのが定石ですが、このプロジェクトでは使えません。理由は2つあります。

**理由1: `npm ci` がネイティブバイナリを入れられない**

- Astro が内部で使う `vite` は `rolldown` に依存し、`rolldown` は OS ごとに異なる
  **ネイティブバイナリ**(`@rolldown/binding-linux-x64-gnu` など)を必要とします
- npm には、この種の「OS別のオプション依存」を `npm ci` で正しく入れられないバグがあります
  ([npm/cli#4828](https://github.com/npm/cli/issues/4828))。npm 10・npm 11 のどちらでも再現します
- さらに、Windows で作った `package-lock.json` を Linux の Render で使うと、この問題が顕在化します

**理由2: Render は `node_modules` をキャッシュする**

- Render はビルドを速くするため、`node_modules` を次回のビルドに引き継ぎます
- 一度でも壊れた `node_modules` が作られると、次のビルドで `npm install` を実行しても
  **「up to date」と判断されて何も直りません**
- そのため `node_modules` ごと削除して、毎回まっさらな状態から入れ直しています

Render と同じ Node 22.11.0 / npm 10.9.0 / `NODE_ENV=production` の環境で、
「壊れた `node_modules` が残っている状態からでもビルドが成功する」ことを確認済みです。

> ビルド時間は毎回20秒ほど増えますが、確実さを優先しています。

> `package-lock.json` はリポジトリに残してあります(手元の開発でバージョンを固定するため)。
> ビルド時にだけ外している、という位置づけです。
> 副作用として、Render 側では依存パッケージが `package.json` の範囲内で最新に解決されます。
> 特定バージョンで固定したい場合は `package.json` の `^` を外してください。

### 「ブループリントの同期に失敗しました」というメールが届いた

`render.yaml` の書き方に問題があると、このメールが届きます。
**メールには詳しい原因が書かれていません。** 実際のエラー内容は Render の画面で確認します。

#### まず、本当のエラーメッセージを見る

1. https://dashboard.render.com にログインする
2. 左メニューの **「Blueprints」** を開く
3. 対象の Blueprint(`company-website` など)をクリックする
4. 赤い帯や **「Sync failed」** の表示をクリックすると、**何行目の何が問題か**が表示されます

#### よくある原因

| 原因 | 対処 |
|---|---|
| 静的サイト(`runtime: static`)に `region` や `plan` を書いている | 静的サイトはグローバルCDN配信のため、この2つは**指定できません**。現在は Web Service なので、どちらも指定できます |
| `branch: main` と書いてあるが、GitHub 側に `main` ブランチがない | GitHub のリポジトリ画面でブランチ名を確認する。`master` になっている場合は下記のコマンドで `main` に統一する |
| `render.yaml` がサブフォルダにある | リポジトリの**一番上の階層**に置く。サブフォルダにあると検出されません |
| インデントに全角スペースやタブが混じっている | 半角スペース2つでそろえる |

GitHub 側のブランチ名が `master` になっていた場合:

```powershell
cd "$env:USERPROFILE\OneDrive\デスクトップ\Dev\company-website"
git branch -m master main          # ローカルを main に変更(すでに main なら不要)
git push -u origin main            # main を GitHub に送る
git push origin --delete master    # 古い master を削除(任意)
```

そのあと GitHub のリポジトリ画面 → **Settings** → **General** → **Default branch** を `main` に変更してください。

#### 修正したあとの再実行

`render.yaml` を直したら、GitHub に push すれば Render が自動で再同期します。

```powershell
git add render.yaml
git commit -m "fix: Render Blueprint の設定を修正"
git push
```

それでも直らない場合は、Blueprints 画面で該当の Blueprint を一度削除し、STEP 2 からやり直すのが確実です。
急ぐ場合は、次の「Blueprint を使わず、手動で設定する場合」に進んでも同じサイトが公開できます。

### Blueprint を使わず、手動で設定する場合

どうしても Blueprint がうまくいかないときは、手動でも作成できます。

1. Render で **「+ New」** → **「Web Service」**
2. リポジトリを選ぶ
3. 以下を入力する

   | 項目 | 入力する値 |
   |---|---|
   | Name | `maido-crafts-website` |
   | Language / Runtime | `Node` |
   | Branch | `main` |
   | Region | `Singapore` |
   | Instance Type | `Starter`(★Free は選ばない) |
   | Build Command | `rm -rf node_modules package-lock.json && npm install --no-audit --no-fund && npm run build` |
   | Start Command | `node ./dist/server/entry.mjs` |
   | Health Check Path | `/healthz` |

4. **「Advanced」** を開き、環境変数を追加する
   - `NODE_VERSION` = `22.11.0`
   - `NODE_ENV` = `production`
   - `SITE_URL` = 公開後のURL(いったん空欄で作成し、STEP 3 で設定してもよい)
   - `RESEND_API_KEY` / `MAIL_FROM` / `CONTACT_TO` = STEP 5 で設定してもよい
5. 「Create Web Service」を押す

> 手動で作成した場合、`render.yaml` の内容は使われません。
> セキュリティヘッダはアプリ側(`src/middleware.ts`)で付けているため、Render 側の設定は不要です。

---

## リリース前の最終チェック

公開して問題ないか、`docs/06_seo-performance.md` §6 のチェックリストも確認してください。

- [ ] STEP 4 の全URLが正しく表示される
- [ ] `SITE_URL` が実際の公開URLと一致している
- [ ] お問い合わせフォームからテスト送信し、**メールが実際に届いた**(STEP 5-4)
- [ ] 届いたメールに**そのまま返信できる**ことを確認した(返信先が問い合わせ者になっている)
- [ ] Resend でドメインが **Verified** になっている
- [ ] OGP画像(`public/ogp.png`)が仮版のままでよいか確認した
- [ ] お知らせ記事の公開日が正しい
- [ ] Google Search Console にサイトを登録し、sitemap を送信した
