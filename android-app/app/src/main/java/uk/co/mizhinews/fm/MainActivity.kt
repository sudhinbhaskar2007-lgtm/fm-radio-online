package uk.co.mizhinews.fm

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.bluetooth.BluetoothManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Shader
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.TextureView
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.RawResourceDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : ComponentActivity() {

    private lateinit var prefs: Prefs
    private lateinit var playButton: View
    private lateinit var playIcon: ImageView
    private lateinit var spinner: ProgressBar
    private lateinit var status: TextView
    private lateinit var songTitle: TextView
    private lateinit var songArtist: TextView
    private lateinit var airPill: TextView
    private lateinit var upNext: TextView
    private lateinit var bars: LinearLayout
    private lateinit var ring1: View
    private lateinit var ring2: View
    private lateinit var eyeVideo: TextureView

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null
    private var eyePlayer: ExoPlayer? = null
    private var autoPlayedThisLaunch = false

    private val handler = Handler(Looper.getMainLooper())
    private var apiSong: String? = null
    private var apiArtist: String? = null
    private var apiOnline = true

    private val animators = mutableListOf<ValueAnimator>()
    private var animating: Boolean? = null

    private val askPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    private var carDialogRefresh: (() -> Unit)? = null
    private val askBluetoothThenPick =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) showCarPicker() else toast(getString(R.string.bt_needed))
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)

        playButton = findViewById(R.id.playButton)
        playIcon = findViewById(R.id.playIcon)
        spinner = findViewById(R.id.spinner)
        status = findViewById(R.id.status)
        songTitle = findViewById(R.id.songTitle)
        songArtist = findViewById(R.id.songArtist)
        airPill = findViewById(R.id.airPill)
        upNext = findViewById(R.id.upNext)
        bars = findViewById(R.id.bars)
        ring1 = findViewById(R.id.ring1)
        ring2 = findViewById(R.id.ring2)
        eyeVideo = findViewById(R.id.eyeVideo)

        findViewById<View>(R.id.eyeClip).clipToOutline = true
        findViewById<View>(R.id.thumb).clipToOutline = true

        // "MIZHI FM" in the pink-to-orange logo gradient
        val brand = findViewById<TextView>(R.id.brand)
        brand.post {
            brand.paint.shader = LinearGradient(
                0f, 0f, brand.width.toFloat(), 0f,
                Color.parseColor("#E0359F"), Color.parseColor("#FF9A1F"), Shader.TileMode.CLAMP
            )
            brand.invalidate()
        }

        buildBars()

        playButton.setOnClickListener { togglePlay() }
        findViewById<View>(R.id.tabRadio).setOnClickListener {
            findViewById<ScrollView>(R.id.scroll).smoothScrollTo(0, 0)
        }
        findViewById<View>(R.id.tabCar).setOnClickListener { showCarSettings() }
        findViewById<View>(R.id.tabShare).setOnClickListener {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, getString(R.string.share_text))
            startActivity(Intent.createChooser(send, getString(R.string.tab_share)))
        }
        findViewById<View>(R.id.tabMail).setOnClickListener {
            try {
                startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:mizhinews@gmail.com"))
                    .putExtra(Intent.EXTRA_SUBJECT, "Mizhi FM"))
            } catch (e: Exception) {
                toast("mizhinews@gmail.com")
            }
        }

        askFirstRunPermissions(force = false)
    }

    override fun onStart() {
        super.onStart()
        startEyeVideo()
        val token = SessionToken(this, ComponentName(this, PlaybackService::class.java))
        val future = MediaController.Builder(this, token).buildAsync()
        controllerFuture = future
        future.addListener({
            val c = try { future.get() } catch (e: Exception) { null } ?: return@addListener
            controller = c
            c.addListener(playerListener)
            updateUi()
            if (prefs.autoOpen && !autoPlayedThisLaunch && !c.isPlaying) {
                autoPlayedThisLaunch = true
                startRadio(c)
            }
        }, ContextCompat.getMainExecutor(this))
        handler.post(pollNowPlaying)
    }

    override fun onStop() {
        handler.removeCallbacks(pollNowPlaying)
        eyePlayer?.release()
        eyePlayer = null
        eyeVideo.alpha = 0f
        controller?.removeListener(playerListener)
        controllerFuture?.let { MediaController.releaseFuture(it) }
        controller = null
        controllerFuture = null
        setAnimating(false)
        super.onStop()
    }

    // ---- Blinking eye logo ----

    private fun startEyeVideo() {
        if (eyePlayer != null) return
        eyeVideo.alpha = 0f
        val p = ExoPlayer.Builder(this).build()
        p.setVideoTextureView(eyeVideo)
        p.volume = 0f
        p.repeatMode = Player.REPEAT_MODE_ALL
        p.setMediaItem(MediaItem.fromUri(RawResourceDataSource.buildRawResourceUri(R.raw.eye_blink)))
        p.addListener(object : Player.Listener {
            override fun onRenderedFirstFrame() {
                eyeVideo.animate().alpha(1f).setDuration(300).start()
            }
        })
        p.prepare()
        p.play()
        eyePlayer = p
    }

    // ---- Animations ----

    private fun buildBars() {
        val d = resources.displayMetrics.density
        repeat(14) {
            val v = View(this)
            v.background = GradientDrawable().apply {
                setColor(Color.parseColor("#FF6A3D"))
                cornerRadius = 2 * d
            }
            val lp = LinearLayout.LayoutParams((14 * d).toInt(), (6 * d).toInt())
            lp.marginStart = (2.5f * d).toInt()
            lp.marginEnd = (2.5f * d).toInt()
            bars.addView(v, lp)
        }
    }

    private fun setAnimating(on: Boolean) {
        if (animating == on) return
        animating = on
        animators.forEach { it.cancel() }
        animators.clear()
        if (on) {
            listOf(ring1 to 0L, ring2 to 1300L).forEach { (ring, delay) ->
                val a = ObjectAnimator.ofPropertyValuesHolder(
                    ring,
                    PropertyValuesHolder.ofFloat(View.SCALE_X, 0.78f, 1.06f),
                    PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.78f, 1.06f),
                    PropertyValuesHolder.ofFloat(View.ALPHA, 1f, 0f)
                )
                a.duration = 2600
                a.startDelay = delay
                a.repeatCount = ValueAnimator.INFINITE
                a.start()
                animators += a
            }
            for (i in 0 until bars.childCount) {
                val bar = bars.getChildAt(i)
                val a = ObjectAnimator.ofPropertyValuesHolder(
                    bar,
                    PropertyValuesHolder.ofFloat(View.ALPHA, 0.35f, 1f),
                    PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.7f, 1.6f)
                )
                a.duration = 600
                a.startDelay = i * 70L
                a.repeatCount = ValueAnimator.INFINITE
                a.repeatMode = ValueAnimator.REVERSE
                a.start()
                animators += a
            }
        } else {
            listOf(ring1 to 0.86f, ring2 to 0.98f).forEach { (ring, s) ->
                ring.scaleX = s; ring.scaleY = s; ring.alpha = 0.55f
            }
            for (i in 0 until bars.childCount) {
                bars.getChildAt(i).apply { alpha = 0.6f; scaleY = 1f }
            }
        }
    }

    // ---- Playback ----

    private val playerListener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = updateUi()
        override fun onPlayerError(error: PlaybackException) {
            status.text = getString(R.string.offline)
        }
    }

    private fun togglePlay() {
        val c = controller ?: return
        if (c.playWhenReady && c.playbackState != Player.STATE_IDLE) c.stop() else startRadio(c)
    }

    private fun startRadio(c: MediaController) {
        c.setMediaItem(Radio.stationItem(this))
        c.prepare()
        c.play()
    }

    private fun updateUi() {
        val c = controller
        val active = c != null && c.playWhenReady && c.playbackState != Player.STATE_IDLE
        val buffering = active && c!!.playbackState == Player.STATE_BUFFERING
        playIcon.setImageResource(if (active) R.drawable.ic_pause_brand else R.drawable.ic_play_brand)
        playIcon.visibility = if (buffering) View.INVISIBLE else View.VISIBLE
        spinner.visibility = if (buffering) View.VISIBLE else View.GONE
        playButton.contentDescription = getString(if (active) R.string.stop else R.string.play)
        setAnimating(c?.isPlaying == true)

        status.text = when {
            buffering -> getString(R.string.connecting)
            c?.playerError != null && !active -> getString(R.string.offline)
            else -> ""
        }
        airPill.text = getString(if (apiOnline) R.string.live_now else R.string.off_air)

        // Song name: from the station's now-playing data, or from the stream itself.
        var title = apiSong
        var artist = apiArtist
        if (title.isNullOrBlank() && c != null) {
            val raw = c.mediaMetadata.title?.toString()?.trim().orEmpty()
            if (raw.isNotEmpty() && raw != "Mizhi FM") {
                val parts = raw.split(" - ", limit = 2)
                if (parts.size == 2) { artist = parts[0]; title = parts[1] } else title = raw
            }
        }
        if (title.isNullOrBlank()) {
            songTitle.text = getString(if (active) R.string.app_name else R.string.tap_play)
            songArtist.text = getString(R.string.tagline)
        } else {
            songTitle.text = title
            songArtist.text = if (artist.isNullOrBlank()) "with Mizhi FM" else "$artist · Mizhi FM"
        }
    }

    /** Asks the radio server what is playing now and next, every 20 seconds while the app is open. */
    private val pollNowPlaying = object : Runnable {
        override fun run() {
            thread(isDaemon = true) {
                try {
                    val conn = URL(Radio.NOW_PLAYING_URL).openConnection() as HttpURLConnection
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    val text = conn.inputStream.bufferedReader().use { it.readText() }
                    conn.disconnect()
                    val j = JSONObject(text)
                    val now = j.optJSONObject("now_playing")?.optJSONObject("song")
                    val next = j.optJSONObject("playing_next")?.optJSONObject("song")
                    val online = j.optBoolean("is_online", true)
                    val nextText = next?.let {
                        val t = it.optString("title")
                        val a = it.optString("artist")
                        if (a.isNotBlank() && t.isNotBlank()) "$t · $a" else t.ifBlank { it.optString("text") }
                    }
                    handler.post {
                        apiSong = now?.optString("title")?.takeIf { it.isNotBlank() } ?: now?.optString("text")
                        apiArtist = now?.optString("artist")
                        apiOnline = online
                        upNext.text = if (!nextText.isNullOrBlank()) getString(R.string.up_next, nextText)
                        else getString(R.string.always_on)
                        updateUi()
                    }
                } catch (e: Exception) {
                    // Keep whatever we showed last.
                }
            }
            handler.postDelayed(this, 20_000)
        }
    }

    // ---- Car settings ----

    @SuppressLint("UseSwitchCompatOrMaterialCode")
    private fun showCarSettings() {
        val view = layoutInflater.inflate(R.layout.dialog_car, null)
        val autoCar = view.findViewById<Switch>(R.id.autoCar)
        val autoOpen = view.findViewById<Switch>(R.id.autoOpen)
        val carName = view.findViewById<TextView>(R.id.carName)
        val refresh = {
            autoCar.isChecked = prefs.autoCar
            carName.text = getString(R.string.car_set, prefs.carName ?: getString(R.string.any_car))
        }
        refresh()
        autoCar.setOnCheckedChangeListener { _, on ->
            prefs.autoCar = on
            if (on && !hasBluetoothPermission()) askFirstRunPermissions(force = true)
        }
        autoOpen.isChecked = prefs.autoOpen
        autoOpen.setOnCheckedChangeListener { _, on -> prefs.autoOpen = on }
        view.findViewById<View>(R.id.pickCar).setOnClickListener {
            if (hasBluetoothPermission()) showCarPicker()
            else askBluetoothThenPick.launch(Manifest.permission.BLUETOOTH_CONNECT)
        }
        val dialog = AlertDialog.Builder(this).setView(view).create()
        view.findViewById<View>(R.id.carDone).setOnClickListener { dialog.dismiss() }
        dialog.setOnDismissListener { carDialogRefresh = null }
        carDialogRefresh = refresh
        dialog.show()
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    }

    private fun hasBluetoothPermission(): Boolean =
        Build.VERSION.SDK_INT < 31 ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED

    private fun askFirstRunPermissions(force: Boolean) {
        if (prefs.askedPermissions && !force) return
        prefs.askedPermissions = true
        val wanted = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= 31) wanted += Manifest.permission.BLUETOOTH_CONNECT
        if (Build.VERSION.SDK_INT >= 33) wanted += Manifest.permission.POST_NOTIFICATIONS
        val missing = wanted.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) askPermissions.launch(missing.toTypedArray())
    }

    @SuppressLint("MissingPermission")
    private fun showCarPicker() {
        val adapter = getSystemService(BluetoothManager::class.java)?.adapter
        val devices = try {
            adapter?.bondedDevices?.toList().orEmpty()
        } catch (e: SecurityException) {
            emptyList()
        }.sortedByDescending { CarConnectReceiver.looksLikeCar(it) }

        if (devices.isEmpty()) {
            toast(getString(R.string.no_paired))
            return
        }
        val names = devices.map { d -> (try { d.name } catch (e: SecurityException) { null } ?: d.address) }
        val labels = (listOf(getString(R.string.any_car)) + names).toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.pick_car)
            .setItems(labels) { _, which ->
                if (which == 0) {
                    prefs.carAddress = null
                    prefs.carName = null
                } else {
                    prefs.carAddress = devices[which - 1].address
                    prefs.carName = names[which - 1]
                }
                prefs.autoCar = true
                carDialogRefresh?.invoke()
            }
            .show()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
