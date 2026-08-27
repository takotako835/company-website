# 07. Render へのデプロイ手順

このサイトを Render の **Static Site(静的サイト)** として公開する手順です。
専門知識がなくても進められるよう、画面の操作を1つずつ書いています。

- 費用: **無料プラン(Free)で運用できます**。クレジットカードの登録も不要です
- 所要時間: 初回のみ約20分。2回目以降の更新は数分で自動反映されます
- リポジトリには `render.yaml`(設定ファイル)が入っているため、Render 側での設定入力はほとんど不要です

---

## 事前に必要なもの

| 必要なもの | 用途 | 取得先 |
|---|---|---|
| GitHub アカウント | サイトのソースコードを置く場所 | https://github.com/signup |
| Render アカウント | サイトを公開するサービス | https://render.com |

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
5. Render が `render.yaml` を自動で読み取り、`maido-crafts-website` という静的サイトが1件表示される
   - **Blueprint Name**: そのままで構いません
   - 表示された内容(Static Site / Build Command / Publish Directory)を確認する
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

## STEP 5. 独自ドメインを設定する(任意・ドメイン確定後)

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

### 無料プランの制限

- 静的サイトの無料プランは **月100GBの転送量**まで。コーポレートサイトの規模なら十分です
- 無料プランでも**スリープ(初回アクセスが遅くなる現象)は起きません**。
  スリープするのは Web Service(サーバー)の無料プランで、静的サイトは対象外です

### ビルドが失敗する(Deploy failed と出る)

1. サービス画面の **Logs** タブを開き、赤いエラーメッセージを探す
2. よくある原因:
   - `package-lock.json` が GitHub に上がっていない → `git add package-lock.json` して push
   - Node のバージョン違い → `render.yaml` の `NODE_VERSION` を確認する
3. 手元で `npm run build` が成功するかを先に確認すると、原因を切り分けやすくなります

### Blueprint が見つからない・エラーになる

`render.yaml` がリポジトリの**一番上の階層**にあるか確認してください。
サブフォルダの中にあると Render は検出できません。

### Blueprint を使わず、手動で設定する場合

どうしても Blueprint がうまくいかないときは、手動でも作成できます。

1. Render で **「+ New」** → **「Static Site」**
2. リポジトリを選ぶ
3. 以下を入力する

   | 項目 | 入力する値 |
   |---|---|
   | Name | `maido-crafts-website` |
   | Branch | `main` |
   | Build Command | `npm ci && npm run build` |
   | Publish Directory | `dist` |

4. **「Advanced」** を開き、環境変数を2つ追加する
   - `NODE_VERSION` = `22.11.0`
   - `SITE_URL` = 公開後のURL(いったん空欄で作成し、STEP 3 で設定してもよい)
5. 「Create Static Site」を押す

---

## リリース前の最終チェック

公開して問題ないか、`docs/06_seo-performance.md` §6 のチェックリストも確認してください。

- [ ] STEP 4 の全URLが正しく表示される
- [ ] `SITE_URL` が実際の公開URLと一致している
- [ ] OGP画像(`public/ogp.png`)が仮版のままでよいか確認した
- [ ] お知らせ記事の公開日が正しい
- [ ] Google Search Console にサイトを登録し、sitemap を送信した
