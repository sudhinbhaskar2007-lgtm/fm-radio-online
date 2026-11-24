package uk.co.mizhinews.fm

import android.content.ComponentName
import android.content.Context
import androidx.core.content.ContextCompat
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken

/** Starts the radio from outside the app screen (for example when the car connects). */
object RadioStarter {
    fun play(context: Context, done: () -> Unit = {}) {
        val app = context.applicationContext
        val token = SessionToken(app, ComponentName(app, PlaybackService::class.java))
        val future = MediaController.Builder(app, token).buildAsync()
        future.addListener({
            try {
                val controller = future.get()
                if (!controller.isPlaying) {
                    if (controller.mediaItemCount == 0) {
                        controller.setMediaItem(Radio.stationItem(app))
                    }
                    controller.prepare()
                    controller.play()
                }
                controller.release()
            } catch (e: Exception) {
                // Nothing we can do from the background; the user can press play.
            } finally {
                done()
            }
        }, ContextCompat.getMainExecutor(app))
    }
}
