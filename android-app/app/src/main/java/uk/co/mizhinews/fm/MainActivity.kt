package uk.co.mizhinews.fm

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.bluetooth.BluetoothManager
import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.ImageButton
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture

class MainActivity : ComponentActivity() {

    private lateinit var prefs: Prefs
    private lateinit var playButton: ImageButton
    private lateinit var status: TextView
    private lateinit var nowPlaying: TextView
    private lateinit var autoCar: Switch
    private lateinit var autoOpen: Switch
    private lateinit var carName: TextView

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null
    private var autoPlayedThisLaunch = false

    private val askPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refreshCarText() }

    private val askBluetoothThenPick =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) showCarPicker() else toast(getString(R.string.bt_needed))
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)

        playButton = findViewById(R.id.playButton)
        status = findViewById(R.id.status)
        nowPlaying = findViewById(R.id.nowPlaying)
        autoCar = findViewById(R.id.autoCar)
        autoOpen = findViewById(R.id.autoOpen)
        carName = findViewById(R.id.carName)

        playButton.setOnClickListener { togglePlay() }

        autoCar.isChecked = prefs.autoCar
        autoCar.setOnCheckedChangeListener { _, on ->
            prefs.autoCar = on
            if (on && !hasBluetoothPermission()) askFirstRunPermissions(force = true)
        }
        autoOpen.isChecked = prefs.autoOpen
        autoOpen.setOnCheckedChangeListener { _, on -> prefs.autoOpen = on }

        findViewById<Button>(R.id.pickCar).setOnClickListener {
            if (hasBluetoothPermission()) showCarPicker()
            else askBluetoothThenPick.launch(Manifest.permission.BLUETOOTH_CONNECT)
        }

        refreshCarText()
        askFirstRunPermissions(force = false)
    }

    override fun onStart() {
        super.onStart()
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
    }

    override fun onStop() {
        controller?.removeListener(playerListener)
        controllerFuture?.let { MediaController.releaseFuture(it) }
        controller = null
        controllerFuture = null
        super.onStop()
    }

    private val playerListener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = updateUi()
        override fun onPlayerError(error: PlaybackException) {
            status.text = getString(R.string.offline)
        }
    }

    private fun togglePlay() {
        val c = controller ?: return
        if (c.playWhenReady && c.playbackState != Player.STATE_IDLE) {
            c.stop()
        } else {
            startRadio(c)
        }
    }

    private fun startRadio(c: MediaController) {
        c.setMediaItem(Radio.stationItem(this))
        c.prepare()
        c.play()
    }

    private fun updateUi() {
        val c = controller ?: return
        val active = c.playWhenReady && c.playbackState != Player.STATE_IDLE
        playButton.setImageResource(if (active) R.drawable.ic_stop else R.drawable.ic_play)
        playButton.contentDescription = getString(if (active) R.string.stop else R.string.play)
        status.text = when {
            c.isPlaying -> "● " + getString(R.string.live)
            active && c.playbackState == Player.STATE_BUFFERING -> getString(R.string.connecting)
            c.playerError != null -> getString(R.string.offline)
            else -> ""
        }
        nowPlaying.text = songText(c.mediaMetadata) ?: getString(R.string.tagline)
    }

    /** The radio sends the current song as "Artist - Title". Show it when it is not just the station name. */
    private fun songText(m: MediaMetadata): String? {
        val title = m.title?.toString()?.trim().orEmpty()
        if (title.isEmpty() || title == "Mizhi FM") return null
        return title
    }

    // ---- Car settings ----

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
        val names = devices.map { d ->
            (try { d.name } catch (e: SecurityException) { null } ?: d.address)
        }
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
                autoCar.isChecked = true
                refreshCarText()
            }
            .show()
    }

    private fun refreshCarText() {
        carName.text = getString(R.string.car_set, prefs.carName ?: getString(R.string.any_car))
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
