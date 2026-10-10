/* Nucífera — Bobby Dias Developer.
 * Developer ID: 36e3b89c-2939-5565-a551-83d310ac8c6f
 */
package com.bobbydias.nucifera;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";
    private WebView webView;
    private BundledVideoPlayer bundledVideo;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean inBackground = true;
    private boolean pageReady;
    private boolean closingDialog;
    private final AudioManager.OnAudioFocusChangeListener audioFocusListener = change -> {
        if (change == AudioManager.AUDIOFOCUS_GAIN) {
            if (!inBackground && !closingDialog) {
                if (bundledVideo != null) bundledVideo.resume();
                dispatchLifecycle("resume");
            }
        } else if (change < 0) {
            if (bundledVideo != null) bundledVideo.pause();
            dispatchLifecycle("pause");
        }
    };

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setOnAudioFocusChangeListener(audioFocusListener).build();
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(246, 241, 220));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(246, 241, 220));
        // Consume native long presses on the game, preserving nickname editing tools.
        webView.setOnLongClickListener(view -> {
            WebView.HitTestResult hit = webView.getHitTestResult();
            return hit == null || hit.getType() != WebView.HitTestResult.EDIT_TEXT_TYPE;
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        bundledVideo = new BundledVideoPlayer(this, root, (kind, event) -> {
            if (webView != null && pageReady) {
                webView.evaluateJavascript("window.dispatchEvent(new Event('nuci:" + kind + "-" + event + "'))", null);
            }
        });
        // Only the bundled trusted page is loaded. The bridge accepts no URL, file, or script.
        webView.addJavascriptInterface(new StoryBridge(), "NuciferaStory");
        // Android 15 draws behind system bars. Include keyboard/cutout insets as well.
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets edges = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
                return WindowInsets.CONSUMED;
            });
            root.requestApplyInsets();
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocal(uri)) return emptyResponse(403, "Forbidden");
                if (!"GET".equals(request.getMethod()) && !"HEAD".equals(request.getMethod())) {
                    return emptyResponse(405, "Method Not Allowed");
                }
                if (uri.getPath().endsWith(".mp4")) return videoResponse(request);
                WebResourceResponse response = assetLoader.shouldInterceptRequest(uri);
                return response == null ? emptyResponse(404, "Not Found") : response;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return navigate(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return navigate(Uri.parse(url));
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!START_URL.equals(url)) return;
                pageReady = true;
                dispatchLifecycle(inBackground ? "pause" : "resume");
            }
        });
        webView.loadUrl(START_URL);
    }

    public final class StoryBridge {
        @JavascriptInterface public void play() {
            runOnUiThread(() -> {
                if (isFinishing() || webView == null || !START_URL.equals(webView.getUrl())) return;
                // The trusted page has reached its click handler even if preloading delays onPageFinished.
                pageReady = true;
                if (inBackground || closingDialog) { dispatchLifecycle("pause"); return; }
                bundledVideo.play("story");
            });
        }
        @JavascriptInterface public void playEnding(String tier) {
            if (!"baixa".equals(tier) && !"media".equals(tier) && !"alta".equals(tier)) return;
            runOnUiThread(() -> {
                if (isFinishing() || webView == null || !START_URL.equals(webView.getUrl())) return;
                pageReady = true;
                if (inBackground || closingDialog) { dispatchLifecycle("pause"); return; }
                bundledVideo.play(tier);
            });
        }
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private boolean navigate(Uri uri) {
        if (isLocal(uri)) return false;
        if ("https".equals(uri.getScheme()) && "www.google.com".equals(uri.getHost())
            && uri.getPath() != null && uri.getPath().startsWith("/maps/")) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (ActivityNotFoundException error) {
                Toast.makeText(this, "Não foi encontrado um aplicativo para abrir o mapa.", Toast.LENGTH_LONG).show();
            }
        }
        return true;
    }

    // Seek/resume local MP4s without a web server or a network permission.
    private WebResourceResponse videoResponse(WebResourceRequest request) {
        AssetFileDescriptor descriptor = null;
        InputStream stream = null;
        try {
            String path = request.getUrl().getPath().substring("/assets/".length());
            if (path.contains("..") || path.contains("\\")) return emptyResponse(403, "Forbidden");
            descriptor = getAssets().openFd(path);
            long total = descriptor.getLength(), start = 0, end = total - 1;
            String range = null;
            for (Map.Entry<String, String> header : request.getRequestHeaders().entrySet()) {
                if ("Range".equalsIgnoreCase(header.getKey())) range = header.getValue();
            }
            boolean partial = range != null;
            if (partial) {
                if (!range.matches("bytes=\\d*-\\d*")) throw new IllegalArgumentException();
                String[] bounds = range.substring(6).split("-", -1);
                if (bounds[0].isEmpty()) {
                    long suffix = Long.parseLong(bounds[1]);
                    if (suffix <= 0) throw new IllegalArgumentException();
                    start = Math.max(0, total - suffix);
                } else {
                    start = Long.parseLong(bounds[0]);
                    if (!bounds[1].isEmpty()) end = Math.min(end, Long.parseLong(bounds[1]));
                }
                if (start > end || start >= total) throw new IllegalArgumentException();
            }
            long length = end - start + 1;
            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");
            headers.put("Content-Length", Long.toString(length));
            if (partial) headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
            if ("HEAD".equals(request.getMethod())) {
                descriptor.close();
                stream = new ByteArrayInputStream(new byte[0]);
            } else {
                stream = descriptor.createInputStream();
                long skipped = 0;
                while (skipped < start) {
                    long count = stream.skip(start - skipped);
                    if (count == 0) {
                        if (stream.read() == -1) throw new IOException("Unexpected end of asset");
                        count = 1;
                    }
                    skipped += count;
                }
                stream = new LimitedInputStream(stream, length);
            }
            return new WebResourceResponse("video/mp4", null, partial ? 206 : 200,
                partial ? "Partial Content" : "OK", headers, stream);
        } catch (IllegalArgumentException error) {
            closeQuietly(stream, descriptor);
            return emptyResponse(416, "Range Not Satisfiable");
        } catch (IOException error) {
            closeQuietly(stream, descriptor);
            return emptyResponse(404, "Not Found");
        }
    }

    private static void closeQuietly(InputStream stream, AssetFileDescriptor descriptor) {
        try { if (stream != null) stream.close(); else if (descriptor != null) descriptor.close(); }
        catch (IOException ignored) {}
    }
    private static WebResourceResponse emptyResponse(int code, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", code, reason,
            new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    private static final class LimitedInputStream extends FilterInputStream {
        private long remaining;
        LimitedInputStream(InputStream input, long count) { super(input); remaining = count; }
        @Override public int read() throws IOException {
            if (remaining <= 0) return -1;
            int value = super.read();
            if (value >= 0) remaining--;
            return value;
        }
        @Override public int read(byte[] buffer, int offset, int count) throws IOException {
            if (count == 0) return 0;
            if (remaining <= 0) return -1;
            int received = in.read(buffer, offset, (int) Math.min(remaining, count));
            if (received > 0) remaining -= received;
            return received;
        }
        @Override public long skip(long count) throws IOException {
            long skipped = in.skip(Math.min(remaining, Math.max(0, count)));
            remaining -= skipped;
            return skipped;
        }
        @Override public int available() throws IOException { return (int) Math.min(remaining, in.available()); }
    }

    private void dispatchLifecycle(String event) {
        if (webView != null && pageReady) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('nuci:" + event + "'))", null);
        }
    }
    @Override protected void onResume() {
        super.onResume();
        inBackground = false;
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= 26) audioManager.requestAudioFocus(audioFocusRequest);
            else audioManager.requestAudioFocus(audioFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
        if (webView != null) webView.onResume();
        if (!closingDialog) {
            if (bundledVideo != null) bundledVideo.resume();
            dispatchLifecycle("resume");
        }
    }
    @Override protected void onPause() {
        inBackground = true;
        if (bundledVideo != null) bundledVideo.pause();
        if (webView != null && pageReady) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('nuci:pause'))", ignored -> {
                if (inBackground && webView != null) webView.onPause();
            });
        } else if (webView != null) webView.onPause();
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= 26) audioManager.abandonAudioFocusRequest(audioFocusRequest);
            else audioManager.abandonAudioFocus(audioFocusListener);
        }
        super.onPause();
    }
    @Override public void onBackPressed() {
        if (closingDialog) return;
        closingDialog = true;
        if (bundledVideo != null) bundledVideo.pause();
        dispatchLifecycle("pause");
        new AlertDialog.Builder(this).setTitle("Sair do jogo?")
            .setMessage("Sua aventura e seu ranking pessoal ficam salvos neste aparelho.")
            .setPositiveButton("Sair", (dialog, which) -> finish())
            .setNegativeButton("Continuar", (dialog, which) -> {})
            .setOnDismissListener(dialog -> {
                closingDialog = false;
                if (!isFinishing() && !inBackground) {
                    if (bundledVideo != null) bundledVideo.resume();
                    dispatchLifecycle("resume");
                }
            }).show();
    }
    @Override protected void onDestroy() {
        if (bundledVideo != null) bundledVideo.close();
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
