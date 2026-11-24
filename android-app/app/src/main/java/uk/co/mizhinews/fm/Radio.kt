package uk.co.mizhinews.fm

import android.content.Context
import android.content.SharedPreferences
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata

/** Station details shared by the app screen, the car screen and the auto-play receiver. */
object Radio {
    const val STREAM_URL = "https://mizhifm.duckdns.org/listen/mizhi_fm/radio.mp3"
    const val NOW_PLAYING_URL = "https://mizhifm.duckdns.org/api/nowplaying/mizhi_fm"
    const val ROOT_ID = "mizhi_root"
    const val STATION_ID = "mizhi_fm"

    @Volatile private var artBytes: ByteArray? = null

    private fun art(context: Context): ByteArray? {
        artBytes?.let { return it }
        return try {
            context.resources.openRawResource(R.drawable.station_art).use { it.readBytes() }
                .also { artBytes = it }
        } catch (e: Exception) {
            null
        }
    }

    fun rootItem(): MediaItem = MediaItem.Builder()
        .setMediaId(ROOT_ID)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle("Mizhi FM")
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_RADIO_STATIONS)
                .build()
        )
        .build()

    fun stationItem(context: Context): MediaItem = MediaItem.Builder()
        .setMediaId(STATION_ID)
        .setUri(STREAM_URL)
        .setLiveConfiguration(MediaItem.LiveConfiguration.Builder().build())
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle("Mizhi FM")
                .setDisplayTitle("Mizhi FM")
                .setArtist("മിഴി എഫ്എം · Live")
                .setStation("Mizhi FM")
                .setIsBrowsable(false)
                .setIsPlayable(true)
                .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
                .apply { art(context)?.let { setArtworkData(it, MediaMetadata.PICTURE_TYPE_FRONT_COVER) } }
                .build()
        )
        .build()
}

/** Small wrapper around the app's saved settings. */
class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("mizhi", Context.MODE_PRIVATE)

    /** Start playing when the phone connects to the car's Bluetooth. On by default. */
    var autoCar: Boolean
        get() = sp.getBoolean("auto_car", true)
        set(v) = sp.edit().putBoolean("auto_car", v).apply()

    /** Bluetooth address of the chosen car, or null for "any car-type Bluetooth device". */
    var carAddress: String?
        get() = sp.getString("car_address", null)
        set(v) = sp.edit().putString("car_address", v).apply()

    var carName: String?
        get() = sp.getString("car_name", null)
        set(v) = sp.edit().putString("car_name", v).apply()

    /** Start playing as soon as the app is opened. */
    var autoOpen: Boolean
        get() = sp.getBoolean("auto_open", true)
        set(v) = sp.edit().putBoolean("auto_open", v).apply()

    var askedPermissions: Boolean
        get() = sp.getBoolean("asked_perms", false)
        set(v) = sp.edit().putBoolean("asked_perms", v).apply()
}
