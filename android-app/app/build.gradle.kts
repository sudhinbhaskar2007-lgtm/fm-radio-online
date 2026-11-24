plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "uk.co.mizhinews.fm"
    compileSdk = 35

    defaultConfig {
        applicationId = "uk.co.mizhinews.fm"
        minSdk = 23
        targetSdk = 35
        versionCode = (System.getenv("VERSION_CODE") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("VERSION_CODE") ?: "1")
    }

    // Release signing: only used when the GitHub secrets are set (see android-app/README.md).
    val ksPath = System.getenv("MIZHI_KEYSTORE")
    signingConfigs {
        // Fixed test key (public on purpose) so each new test build installs over the last one.
        // NOT used for the Play Store.
        getByName("debug") {
            storeFile = rootProject.file("test-signing/mizhi-test.keystore")
            storePassword = "mizhitest"
            keyAlias = "mizhitest"
            keyPassword = "mizhitest"
        }
        if (ksPath != null && file(ksPath).exists()) {
            create("release") {
                storeFile = file(ksPath)
                storePassword = System.getenv("MIZHI_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("MIZHI_KEY_ALIAS") ?: "mizhi"
                keyPassword = System.getenv("MIZHI_KEY_PASSWORD") ?: System.getenv("MIZHI_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val media3 = "1.5.1"
    implementation("androidx.media3:media3-exoplayer:$media3")
    implementation("androidx.media3:media3-session:$media3")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
}
