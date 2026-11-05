package com.kedr.web.preview

import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path

object WebPreviewTargets {
  private val CONTENT_TYPES = mapOf(
    "html" to "text/html; charset=utf-8",
    "htm" to "text/html; charset=utf-8",
    "css" to "text/css; charset=utf-8",
    "scss" to "text/css; charset=utf-8",
    "less" to "text/css; charset=utf-8",
    "js" to "text/javascript; charset=utf-8",
    "mjs" to "text/javascript; charset=utf-8",
    "cjs" to "text/javascript; charset=utf-8",
    "jsx" to "text/javascript; charset=utf-8",
    "ts" to "text/javascript; charset=utf-8",
    "tsx" to "text/javascript; charset=utf-8",
    "json" to "application/json; charset=utf-8",
    "map" to "application/json; charset=utf-8",
    "xml" to "text/xml; charset=utf-8",
    "txt" to "text/plain; charset=utf-8",
    "md" to "text/plain; charset=utf-8",
    "svg" to "image/svg+xml",
    "png" to "image/png",
    "jpg" to "image/jpeg",
    "jpeg" to "image/jpeg",
    "gif" to "image/gif",
    "webp" to "image/webp",
    "ico" to "image/x-icon",
    "woff" to "font/woff",
    "woff2" to "font/woff2",
    "ttf" to "font/ttf",
    "otf" to "font/otf",
    "wasm" to "application/wasm",
  )

  fun contentType(fileName: String): String =
    CONTENT_TYPES[fileName.substringAfterLast('.', "").lowercase()] ?: "application/octet-stream"

  fun resolve(root: Path, requestPath: String): Path? {
    val base = root.toAbsolutePath().normalize()
    var target = base.resolve(decode(requestPath)).normalize()
    if (Files.isDirectory(target)) {
      target = target.resolve("index.html")
    }
    return if (target.startsWith(base) && Files.isRegularFile(target)) target else null
  }

  fun encodePath(relativePath: String): String =
    relativePath.split('/').joinToString("/") { segment ->
      URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20")
    }

  private fun decode(requestPath: String): String {
    val relative = requestPath.substringBefore('?').substringBefore('#').trimStart('/')
    return try {
      URLDecoder.decode(relative, StandardCharsets.UTF_8)
    }
    catch (e: IllegalArgumentException) {
      relative
    }
  }
}
