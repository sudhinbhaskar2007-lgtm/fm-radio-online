package uk.co.mizhinews.fm

import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper

/**
 * Starts Mizhi FM when the phone connects to the car's Bluetooth
 * (the car is switched on and the phone links up).
 */
class CarConnectReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != BluetoothDevice.ACTION_ACL_CONNECTED) return
        val prefs = Prefs(context)
        if (!prefs.autoCar) return

        val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
        }
        if (device == null || !isMyCar(device, prefs)) return

        val pending = goAsync()
        // Give the car a few seconds to set up the audio link, so the radio comes out of the car speakers.
        Handler(Looper.getMainLooper()).postDelayed({
            RadioStarter.play(context) { pending.finish() }
        }, 3000L)
    }

    private fun isMyCar(device: BluetoothDevice, prefs: Prefs): Boolean = try {
        val chosen = prefs.carAddress
        if (chosen != null) {
            device.address.equals(chosen, ignoreCase = true)
        } else {
            looksLikeCar(device)
        }
    } catch (e: SecurityException) {
        false
    }

    companion object {
        fun looksLikeCar(device: BluetoothDevice): Boolean = try {
            when (device.bluetoothClass?.deviceClass) {
                BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO,
                BluetoothClass.Device.AUDIO_VIDEO_HANDSFREE -> true
                else -> false
            }
        } catch (e: SecurityException) {
            false
        }
    }
}
