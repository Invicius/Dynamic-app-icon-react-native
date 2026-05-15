package com.dynamicappiconpoc

import android.app.Activity
import android.app.Application
import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ReactNativeDynamicAppIconModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ReactNativeDynamicAppIcon"

  @ReactMethod
  fun changeIcon(iconName: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No foreground activity")
      return
    }

    val targetSuffix = normalizeAndroidSuffix(iconName)
    val pm = reactApplicationContext.packageManager
    val packageName = reactApplicationContext.packageName

    if (currentEnabledSuffix(pm, packageName) == targetSuffix) {
      promise.resolve(null)
      return
    }

    for (suffix in ICON_SUFFIXES) {
      val component = ComponentName(packageName, "$packageName.MainActivity$suffix")
      val enabled = suffix == targetSuffix
      pm.setComponentEnabledSetting(
        component,
        if (enabled) {
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        },
        PackageManager.DONT_KILL_APP,
      )
    }

    promise.resolve(null)
    val host = activity
    Handler(Looper.getMainLooper()).post {
      scheduleRestartAfterDestroy(host)
      host.finish()
    }
  }

  @ReactMethod
  fun getIcon(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val packageName = reactApplicationContext.packageName
      val suffix = currentEnabledSuffix(pm, packageName) ?: DEFAULT_SUFFIX
      promise.resolve(suffix)
    } catch (e: Exception) {
      promise.reject("GET_ICON_ERROR", e.message, e)
    }
  }

  private fun scheduleRestartAfterDestroy(activity: Activity) {
    val app = activity.application
    val callback =
      object : Application.ActivityLifecycleCallbacks {
        override fun onActivityDestroyed(destroyed: Activity) {
          if (destroyed === activity) {
            app.unregisterActivityLifecycleCallbacks(this)
            Process.killProcess(Process.myPid())
          }
        }

        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}

        override fun onActivityStarted(activity: Activity) {}

        override fun onActivityResumed(activity: Activity) {}

        override fun onActivityPaused(activity: Activity) {}

        override fun onActivityStopped(activity: Activity) {}

        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
      }
    app.registerActivityLifecycleCallbacks(callback)
  }

  private fun currentEnabledSuffix(pm: PackageManager, packageName: String): String? {
    for (suffix in ICON_SUFFIXES) {
      val component = ComponentName(packageName, "$packageName.MainActivity$suffix")
      val state = pm.getComponentEnabledSetting(component)
      if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
        return suffix
      }
    }
    return null
  }

  private fun normalizeAndroidSuffix(iconName: String): String {
    val trimmed = iconName.trim()
    if (trimmed.isEmpty() || trimmed.equals(DEFAULT_SUFFIX, ignoreCase = true)) {
      return DEFAULT_SUFFIX
    }
    if (trimmed.equals(SOL_SUFFIX, ignoreCase = true)) {
      return SOL_SUFFIX
    }
    if (trimmed.equals(LEAO_SUFFIX, ignoreCase = true)) {
      return LEAO_SUFFIX
    }
    return DEFAULT_SUFFIX
  }

  companion object {
    private const val DEFAULT_SUFFIX = "Default"
    private const val SOL_SUFFIX = "Sol"
    private const val LEAO_SUFFIX = "Leao"
    private val ICON_SUFFIXES = listOf(DEFAULT_SUFFIX, SOL_SUFFIX, LEAO_SUFFIX)
  }
}
