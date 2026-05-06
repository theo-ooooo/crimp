package com.crimp.capturealbum

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CrimpCaptureAlbumModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "CrimpCaptureAlbum"

  @ReactMethod
  fun saveToAlbum(uri: String, mime: String, promise: Promise) {
    val isVideo = mime.startsWith("video/")
    val collection = if (isVideo) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      } else {
        MediaStore.Video.Media.EXTERNAL_CONTENT_URI
      }
    } else {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      } else {
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI
      }
    }

    val resolver = reactContext.contentResolver
    var destinationUri: Uri? = null

    try {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, buildDisplayName(mime))
        put(MediaStore.MediaColumns.MIME_TYPE, mime)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val directory = if (isVideo) Environment.DIRECTORY_MOVIES else Environment.DIRECTORY_PICTURES
          put(MediaStore.MediaColumns.RELATIVE_PATH, "$directory/Crimp")
          put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
      }

      destinationUri = resolver.insert(collection, values)
        ?: throw IllegalStateException("MediaStore insert returned null")

      openSource(uri).use { input ->
        resolver.openOutputStream(destinationUri)?.use { output ->
          input.copyTo(output)
        } ?: throw IllegalStateException("MediaStore output stream is unavailable")
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val publishedValues = ContentValues().apply {
          put(MediaStore.MediaColumns.IS_PENDING, 0)
        }
        resolver.update(destinationUri, publishedValues, null, null)
      }

      promise.resolve(destinationUri.toString())
    } catch (error: SecurityException) {
      destinationUri?.let { resolver.delete(it, null, null) }
      promise.reject("permission-denied", "Album save permission denied", error)
    } catch (error: Exception) {
      destinationUri?.let { resolver.delete(it, null, null) }
      promise.reject("save-failed", error.message ?: "Album save failed", error)
    }
  }

  private fun openSource(uri: String): InputStream {
    val parsed = Uri.parse(uri)
    if (parsed.scheme == "file" || parsed.scheme == null) {
      val path = if (parsed.scheme == "file") parsed.path else uri
      return FileInputStream(File(path ?: uri))
    }
    return reactContext.contentResolver.openInputStream(parsed)
      ?: throw IllegalArgumentException("Cannot open source uri")
  }

  private fun buildDisplayName(mime: String): String {
    val extension = when (mime) {
      "image/heic" -> "heic"
      "video/quicktime" -> "mov"
      "video/mp4" -> "mp4"
      else -> "jpg"
    }
    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US).format(Date())
    return "crimp_$timestamp.$extension"
  }
}
