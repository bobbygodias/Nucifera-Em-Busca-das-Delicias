/* Nucífera — Bobby Dias Developer.
 * Developer ID: 36e3b89c-2939-5565-a551-83d310ac8c6f
 */
package com.bobbydias.nucifera;

import android.app.Activity;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.widget.FrameLayout;
import java.io.IOException;

// Uses Android's media API inside the app, never an external player or network URL.
final class BundledVideoPlayer {
    interface Listener { void onResult(String kind, String event); }
    private final Activity activity;
    private final FrameLayout root;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout layer;
    private SurfaceView surface;
    private MediaPlayer player;
    private boolean requested, queued, prepared, allowed;
    private String activeClip, assetPath, resultKind;
    private final Runnable prepareTimeout = () -> {
        if (requested && !prepared && player != null) notifyResult("error");
    };
    private final Runnable startAfterCue = () -> {
        queued = false;
        if (allowed && requested && player == null) open();
    };

    BundledVideoPlayer(Activity activity, FrameLayout root, Listener listener) {
        this.activity = activity;
        this.root = root;
        this.listener = listener;
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> fit());
    }

    void play(String clip) {
        String path;
        switch (clip) {
            case "story": path = "assets/opening-story.mp4"; break;
            case "baixa": path = "assets/ending-low.mp4"; break;
            case "media": path = "assets/ending-medium.mp4"; break;
            case "alta": path = "assets/ending-high.mp4"; break;
            default: return;
        }
        if (requested && !clip.equals(activeClip)) close();
        activeClip = clip;
        assetPath = path;
        resultKind = "story".equals(clip) ? "story" : "ending";
        requested = true;
        if (player != null) { startIfReady(); return; }
        if (!queued) {
            queued = true;
            // Let the game's click sound finish before the story soundtrack starts.
            handler.postDelayed(startAfterCue, "story".equals(clip) ? 240 : 0);
        }
    }

    private void open() {
        layer = new FrameLayout(activity);
        layer.setBackgroundColor(Color.BLACK);
        layer.setClickable(true);
        surface = new SurfaceView(activity);
        layer.addView(surface, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        player = new MediaPlayer();
        final MediaPlayer current = player;
        current.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build());
        current.setVolume(.915f, .915f);
        current.setScreenOnWhilePlaying(true);
        current.setOnPreparedListener(mp -> {
            if (mp != player) return;
            prepared = true;
            handler.removeCallbacks(prepareTimeout);
            fit();
            startIfReady();
        });
        current.setOnVideoSizeChangedListener((mp, w, h) -> { if (mp == player) fit(); });
        current.setOnCompletionListener(mp -> {
            if (mp != player) return;
            notifyResult("ended");
        });
        current.setOnErrorListener((mp, what, extra) -> {
            if (mp != player) return true;
            Log.e("NuciferaStory", "Video playback failed: " + what + "/" + extra);
            notifyResult("error");
            return true;
        });
        surface.getHolder().addCallback(new SurfaceHolder.Callback() {
            @Override public void surfaceCreated(SurfaceHolder holder) {
                if (current != player) return;
                current.setDisplay(holder);
                startIfReady();
            }
            @Override public void surfaceChanged(SurfaceHolder holder, int format, int w, int h) {
                if (current == player) startIfReady();
            }
            @Override public void surfaceDestroyed(SurfaceHolder holder) {
                if (current != player) return;
                pausePlayback();
                current.setDisplay(null);
            }
        });
        root.addView(layer, new FrameLayout.LayoutParams(-1, -1));
        try (AssetFileDescriptor video = activity.getAssets().openFd(assetPath)) {
            // API-21 compatible overload; descriptor offsets keep playback inside this APK asset.
            current.setDataSource(video.getFileDescriptor(), video.getStartOffset(), video.getLength());
            current.prepareAsync();
            handler.postDelayed(prepareTimeout, 20000);
        } catch (IOException | RuntimeException error) {
            Log.e("NuciferaStory", "Could not open bundled story", error);
            notifyResult("error");
        }
    }

    private void fit() {
        if (player == null || !prepared || surface == null || layer == null) return;
        int width = player.getVideoWidth(), height = player.getVideoHeight();
        int availableWidth = root.getWidth() - root.getPaddingLeft() - root.getPaddingRight();
        int availableHeight = root.getHeight() - root.getPaddingTop() - root.getPaddingBottom();
        if (width <= 0 || height <= 0 || availableWidth <= 0 || availableHeight <= 0) return;
        float scale = Math.min((float) availableWidth / width, (float) availableHeight / height);
        int fittedWidth = Math.max(1, Math.round(width * scale));
        int fittedHeight = Math.max(1, Math.round(height * scale));
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) surface.getLayoutParams();
        if (params.width != fittedWidth || params.height != fittedHeight) {
            surface.setLayoutParams(new FrameLayout.LayoutParams(fittedWidth, fittedHeight, Gravity.CENTER));
        }
    }

    private void startIfReady() {
        if (!allowed || !requested || !prepared || player == null || surface == null) return;
        if (!surface.getHolder().getSurface().isValid()) return;
        if (!player.isPlaying()) player.start();
    }

    private void pausePlayback() {
        if (player != null && prepared && player.isPlaying()) player.pause();
    }
    void pause() { allowed = false; pausePlayback(); }
    void resume() {
        allowed = true;
        if (requested && player == null && !queued) open();
        else startIfReady();
    }
    void close() {
        handler.removeCallbacks(startAfterCue);
        handler.removeCallbacks(prepareTimeout);
        requested = false;
        queued = false;
        prepared = false;
        MediaPlayer old = player;
        player = null;
        if (old != null) old.release();
        if (layer != null) root.removeView(layer);
        layer = null;
        surface = null;
    }
    private void notifyResult(String event) {
        String kind = resultKind;
        close();
        listener.onResult(kind, event);
    }
}
