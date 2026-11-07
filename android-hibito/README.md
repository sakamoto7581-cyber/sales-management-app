# ひびとlog - Google Play Android版

Web版 `hibito/hibito.html` をアプリに同梱し、WebViewで開くAndroidアプリです。
記録は端末の中（アプリの保存領域）だけに残り、サーバーやWebサイトの公開は必要ありません。オフラインでも動きます。

## 現在の設定

- アプリ名：ひびとlog
- Application ID：`jp.hibitolog.app`（Playで一度公開すると変更できません。変えるなら初回アップロード前に）
- minSdk 26（Android 8.0以上）／ targetSdk・compileSdk 36（Android 16）
- バージョン：自動。GitHub Actions の実行番号が versionCode になり、versionName は `1.0.<実行番号>`（手元のビルドは 1）。実行ごとに必ず増えるので、Playに上げるたびに手で上げる必要はない
- 権限：インターネット（見出し用のWebフォントのみ）、カメラ（QR読み取りのみ・任意）

## Web版との連携

- ビルド時に `../hibito/hibito.html` と `../hibito/assets/` をアプリへコピーします。Web版を直せば、次のビルドからアプリにも反映されます。
- `https://appassets.androidplatform.net/assets/hibito.html` として読み込むので、保存領域（localStorage）はアプリ専用です。
- Android版だけの動き：
  - 戻るボタンでアプリ内の前の画面に戻る
  - データの書き出しは保存先を選ぶ画面になる
  - 電話・メールは端末の標準アプリで開く
  - テーマの色に合わせて画面上下の背景色が変わる

## ビルド

GitHub Actions の「Build Hibito Android」が、`android-hibito/` か `hibito/` を変更してプッシュするたびに動きます。
完了した実行の Artifacts から次の2つを取れます。

- `hibito-debug-apk`：手元の端末に入れて試す用
  - アプリ名「ひびとlog 試用」、ID `jp.hibitolog.app.debug`。Play版とは別アプリとして入る
  - いつも同じ鍵（`app/debug.keystore`）で署名するので、新しい試用版を上書きで入れられ、記録も残る
  - `debug.keystore` は試用版専用で、Android標準のデバッグ鍵と同じく秘密ではない。Play用の鍵とは別物
- `hibito-release-aab`：Play Console にアップロードする用

### 署名（Playにアップロードするために必要）

アップロード鍵を GitHub の Secrets に登録すると、署名済みのAABが作られます（未登録なら署名なし）。

1. 鍵を作る（1回だけ。鍵とパスワードは失くさないよう、安全な場所に保管する）
   `keytool -genkeypair -v -keystore hibito-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias hibito`
2. Base64にする：`base64 -w0 hibito-upload.jks`（macOSは `base64 -i hibito-upload.jks`）
3. リポジトリの Settings → Secrets and variables → Actions に4つ登録する
   - `HIBITO_KEYSTORE_BASE64`：2の出力
   - `HIBITO_KEYSTORE_PASSWORD`：鍵ストアのパスワード
   - `HIBITO_KEY_ALIAS`：`hibito`
   - `HIBITO_KEY_PASSWORD`：鍵のパスワード
4. Actions の「Build Hibito Android」を Run workflow で実行する

Android Studio で `android-hibito` を開き、Build → Generate Signed App Bundle で作ることもできます。

## Google Play公開までの手順

1. Play Console のデベロッパーアカウントを作る（登録料が必要）
2. 「アプリを作成」→ アプリ名「ひびとlog」、無料
3. ストアの掲載情報：
   - アイコン：`store/icon-512.png`
   - フィーチャーグラフィック：`store/feature-graphic-1024x500.png`
   - スクリーンショット：アプリを端末で開いて撮る（2枚以上）
4. プライバシーポリシーのURL：`hibito/privacy.html` を公開したURL
   （例：GitHub Pagesなら `https://sakamoto7581-cyber.github.io/sales-management-app/hibito/privacy.html`）
5. データセーフティ：「データを収集しない・共有しない」（記録は端末内のみ。Webフォント読み込みは収集に当たらない想定）
6. 署名済みAABを「内部テスト」にアップロードし、自分の端末で確認してから製品版へ
   - 新規の個人アカウントは、製品版の前にクローズドテストが必要な場合があります（Play Consoleの表示に従う）

## 試作版としての注意

- チャットは端末内だけで、相手には届きません（画面にも明記しています）
- カメラでのQR読み取りは、WebViewが BarcodeDetector に対応している端末だけで使えます。使えない端末では貼り付けで取り込めます
