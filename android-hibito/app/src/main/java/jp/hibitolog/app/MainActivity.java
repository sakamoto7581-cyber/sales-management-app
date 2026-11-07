package jp.hibitolog.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.SystemBarStyle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * ひびとlog のAndroid版。
 * アプリに同梱したWeb版（hibito.html）をWebViewで開く。記録はこの端末の中（WebViewの保存領域）だけに残る。
 */
public class MainActivity extends ComponentActivity {

    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + ASSET_HOST + "/assets/hibito.html";

    private FrameLayout root;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingCameraRequest;
    private String pendingSaveText;
    private OnBackPressedCallback backCallback;

    /** 写真・JSONファイルを選ぶ */
    private final ActivityResultLauncher<Intent> pickFiles = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback == null) return;
                Uri[] uris = null;
                Intent data = result.getData();
                if (result.getResultCode() == RESULT_OK && data != null) {
                    ClipData clip = data.getClipData();
                    if (clip != null && clip.getItemCount() > 0) {
                        uris = new Uri[clip.getItemCount()];
                        for (int i = 0; i < clip.getItemCount(); i++) uris[i] = clip.getItemAt(i).getUri();
                    } else if (data.getData() != null) {
                        uris = new Uri[]{data.getData()};
                    }
                }
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
            });

    /** データの書き出し：保存先をえらんでJSONを書く */
    private final ActivityResultLauncher<String> createJson = registerForActivityResult(
            new ActivityResultContracts.CreateDocument("application/json"), uri -> {
                String text = pendingSaveText;
                pendingSaveText = null;
                if (uri == null || text == null) return;
                boolean ok = false;
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os != null) {
                        os.write(text.getBytes(StandardCharsets.UTF_8));
                        ok = true;
                    }
                } catch (Exception ignored) {
                    ok = false;
                }
                notifySaved(ok);
            });

    /** QR読み取り用のカメラ許可 */
    private final ActivityResultLauncher<String> cameraPermission = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(), granted -> {
                PermissionRequest req = pendingCameraRequest;
                pendingCameraRequest = null;
                if (req == null) return;
                if (granted) req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                else req.deny();
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this,
                SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
                SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT));
        super.onCreate(savedInstanceState);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#FFFBF6"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FFFBF6"));
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // 画面の端（ステータスバー・ナビゲーションバー・キーボード）にかからないよう余白を取る
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });

        setupWebView();

        backCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) {
                    web.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        };
        getOnBackPressedDispatcher().addCallback(this, backCallback);

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL);
        }
    }

    private void setupWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            // デザイン上ダークモードは使わない
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(s, false);
        }

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (ASSET_HOST.equals(uri.getHost())) return false;
                // 電話・メール・外部リンクは端末の標準アプリにまかせる
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                boolean image = false;
                String[] types = params.getAcceptTypes();
                if (types != null) {
                    for (String t : types) {
                        if (t != null && t.startsWith("image/")) image = true;
                    }
                }
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(image ? "image/*" : "*/*");
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    pickFiles.launch(intent);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean fromApp = request.getOrigin() != null && ASSET_HOST.equals(request.getOrigin().getHost());
                    boolean video = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                    if (!fromApp || !video) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        if (pendingCameraRequest != null) pendingCameraRequest.deny();
                        pendingCameraRequest = request;
                        cameraPermission.launch(Manifest.permission.CAMERA);
                    }
                });
            }
        });

        web.addJavascriptInterface(new Bridge(), "HibitoAndroid");
    }

    private void notifySaved(boolean ok) {
        if (web != null) web.evaluateJavascript("window.hibitoSaved&&window.hibitoSaved(" + ok + ")", null);
    }

    /** Web版から呼ばれる窓口 */
    public class Bridge {
        @JavascriptInterface
        public void saveTextFile(String name, String text) {
            runOnUiThread(() -> {
                pendingSaveText = text;
                try {
                    createJson.launch(name);
                } catch (ActivityNotFoundException e) {
                    pendingSaveText = null;
                    notifySaved(false);
                }
            });
        }

        @JavascriptInterface
        public void setThemeColor(String hex) {
            runOnUiThread(() -> {
                try {
                    int c = Color.parseColor(hex.trim());
                    root.setBackgroundColor(c);
                    web.setBackgroundColor(c);
                } catch (Exception ignored) {
                }
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (backCallback != null) backCallback.setEnabled(true);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }
}
