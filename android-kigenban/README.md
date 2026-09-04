# 期限番 - Google Play Android版

Google Play向けの Trusted Web Activity (TWA) ラッパーです。既存のWeb版「期限番」をAndroidアプリとして全画面起動し、Web側の機能・Supabase認証・Web Push通知を維持する構成です。

## 現在の設定

- アプリ名: 期限番
- Application ID: `jp.kigenban.app`（初回Play公開前なら変更可能）
- Web URL: `https://sakamoto7581-cyber.github.io/sales-management-app/kigenban/`
- minSdk: 23
- targetSdk / compileSdk: 36 (Android 16)
- Android Browser Helper: 2.7.2

## Google Play公開前に必要なこと

1. Google Play Consoleでアプリを作成する。
2. アップロード鍵でAABを署名する。
3. Play Consoleの「アプリの署名鍵証明書」のSHA-256を取得する。
4. `https://sakamoto7581-cyber.github.io/.well-known/assetlinks.json` に、そのSHA-256と `jp.kigenban.app` を登録する。
5. 署名済みAABをPlay Consoleへアップロードする。

### 重要: GitHub Pagesの現在の構成

現在のWeb版はプロジェクトサイト `/sales-management-app/kigenban/` にあります。TWAの検証ファイル `/.well-known/assetlinks.json` はドメイン直下に必要なため、`sakamoto7581-cyber.github.io` というユーザーサイト用リポジトリ、または独自ドメインが必要です。これはPlay版をブラウザバーなしの完全なTWAとして動かすための必須項目です。

## ビルド

Android Studioでこのフォルダを開き、Release > Generate Signed Bundle / APK > Android App Bundle を選択してください。
