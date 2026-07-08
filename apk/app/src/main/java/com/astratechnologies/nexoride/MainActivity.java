package com.astratechnologies.nexoride;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String BASE_URL = "https://ride.nexoofficial.in/app/?v=apk7a";
    private static final String HOST = "ride.nexoofficial.in";
    private static final int REQ_PERMISSIONS = 7001;
    private static final int REQ_FILE_CHOOSER = 7002;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private PermissionRequest webPermissionRequest;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        root.addView(webView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.addView(progressBar, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 8));
        setContentView(root);

        configureWebView();
        requestNeededPermissions(false);

        Uri deep = getIntent() != null ? getIntent().getData() : null;
        String startUrl = urlFromDeepLink(deep);
        webView.loadUrl(startUrl != null ? startUrl : BASE_URL);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(true);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        String ua = s.getUserAgentString();
        if (ua == null) ua = "";
        if (!ua.contains("NEXO-Ride-Android")) s.setUserAgentString(ua + " NEXO-Ride-Android/7A");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }

        webView.addJavascriptInterface(new NativeBridge(this), "NexoRideNative");
        webView.setWebViewClient(new NexoWebViewClient());
        webView.setWebChromeClient(new NexoChromeClient());
    }

    private class NexoWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            progressBar.setVisibility(View.VISIBLE);
            super.onPageStarted(view, url, favicon);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            super.onPageFinished(view, url);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrl(Uri.parse(url));
        }
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) return false;
        String url = uri.toString();
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);

        if ("nexoride".equals(scheme)) {
            String deepUrl = urlFromDeepLink(uri);
            if (deepUrl != null) webView.loadUrl(deepUrl);
            return true;
        }

        if (HOST.equals(host) && uri.getPath() != null && uri.getPath().contains("/api/auth/google/start")) {
            Uri external = ensureQueryParam(uri, "app", "1");
            openExternal(external.toString());
            return true;
        }

        if (host.contains("accounts.google.com") || host.contains("oauth2.googleapis.com") || host.contains("googleusercontent.com")) {
            openExternal(url);
            return true;
        }

        if (("http".equals(scheme) || "https".equals(scheme)) && HOST.equals(host)) return false;

        if ("tel".equals(scheme) || "mailto".equals(scheme) || url.contains("google.com/maps") || url.contains("mappls.com")) {
            openExternal(url);
            return true;
        }

        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            openExternal(url);
            return true;
        }

        return false;
    }

    private Uri ensureQueryParam(Uri uri, String key, String value) {
        if (uri.getQueryParameter(key) != null) return uri;
        Uri.Builder b = uri.buildUpon();
        b.appendQueryParameter(key, value);
        return b.build();
    }

    private String urlFromDeepLink(Uri uri) {
        if (uri == null) return null;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"nexoride".equals(scheme)) return null;
        Uri.Builder b = Uri.parse(BASE_URL).buildUpon();
        for (String name : uri.getQueryParameterNames()) {
            String val = uri.getQueryParameter(name);
            if (val != null) b.appendQueryParameter(name, val);
        }
        b.appendQueryParameter("native_return", "1");
        return b.build().toString();
    }

    private void openExternal(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(i);
        } catch (ActivityNotFoundException ex) {
            Toast.makeText(this, "No app found to open this link", Toast.LENGTH_SHORT).show();
        }
    }

    private class NexoChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            geoOrigin = origin;
            geoCallback = callback;
            if (hasLocationPermission()) {
                callback.invoke(origin, true, false);
            } else {
                requestNeededPermissions(true);
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            webPermissionRequest = request;
            runOnUiThread(() -> {
                if (hasCameraPermission() && hasLocationPermission()) {
                    try { request.grant(request.getResources()); } catch (Exception ignored) {}
                } else {
                    requestNeededPermissions(true);
                }
            });
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (MainActivity.this.filePathCallback != null) MainActivity.this.filePathCallback.onReceiveValue(null);
            MainActivity.this.filePathCallback = filePathCallback;

            Intent contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
            contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
            contentIntent.setType("*/*");
            contentIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
            contentIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

            Intent cameraIntent = null;
            if (hasCameraPermission()) {
                try {
                    File photoFile = createImageFile();
                    cameraPhotoUri = FileProvider.getUriForFile(MainActivity.this, "com.astratechnologies.nexoride.fileprovider", photoFile);
                    cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                    cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } catch (Exception ignored) { cameraIntent = null; }
            }

            Intent chooser = new Intent(Intent.ACTION_CHOOSER);
            chooser.putExtra(Intent.EXTRA_INTENT, contentIntent);
            chooser.putExtra(Intent.EXTRA_TITLE, "KYC Document / Photo select করুন");
            if (cameraIntent != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});

            try {
                startActivityForResult(chooser, REQ_FILE_CHOOSER);
            } catch (ActivityNotFoundException e) {
                MainActivity.this.filePathCallback = null;
                Toast.makeText(MainActivity.this, "File chooser not available", Toast.LENGTH_SHORT).show();
                return false;
            }
            return true;
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile("NEXO_KYC_" + timeStamp + "_", ".jpg", storageDir);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            Uri[] results = null;
            if (resultCode == RESULT_OK) {
                if (data == null || data.getData() == null) {
                    if (cameraPhotoUri != null) results = new Uri[]{cameraPhotoUri};
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            if (filePathCallback != null) filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            cameraPhotoUri = null;
        }
    }

    private boolean hasLocationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasCameraPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestNeededPermissions(boolean force) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        List<String> perms = new ArrayList<>();
        if (!hasLocationPermission()) {
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!hasCameraPermission()) perms.add(Manifest.permission.CAMERA);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_MEDIA_IMAGES);
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_MEDIA_VIDEO);
        } else if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        if (!perms.isEmpty()) requestPermissions(perms.toArray(new String[0]), REQ_PERMISSIONS);
        else if (force) Toast.makeText(this, "All permissions already allowed", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_PERMISSIONS) return;
        boolean loc = hasLocationPermission();
        if (geoCallback != null && geoOrigin != null) {
            geoCallback.invoke(geoOrigin, loc, false);
            geoCallback = null;
            geoOrigin = null;
        }
        if (webPermissionRequest != null && hasCameraPermission()) {
            try { webPermissionRequest.grant(webPermissionRequest.getResources()); } catch (Exception ignored) {}
            webPermissionRequest = null;
        }
        Toast.makeText(this, loc ? "Location permission ready" : "Location permission not allowed", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String deepUrl = urlFromDeepLink(intent != null ? intent.getData() : null);
        if (deepUrl != null && webView != null) webView.loadUrl(deepUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public class NativeBridge {
        private final Context context;
        NativeBridge(Context ctx) { context = ctx; }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                i.setData(Uri.parse("package:" + getPackageName()));
                startActivity(i);
            });
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            runOnUiThread(() -> requestNeededPermissions(true));
        }

        @JavascriptInterface
        public String isNativeApp() { return "true"; }

        @JavascriptInterface
        public String version() { return "2.0.7A"; }
    }
}
