# JavaScriptから呼ぶメソッドを残す（難読化を有効にした場合に備える）
-keepclassmembers class jp.hibitolog.app.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
