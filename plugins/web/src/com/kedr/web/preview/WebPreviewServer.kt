package com.kedr.web.preview

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.Executors

class WebPreviewServer(private val root: Path) {
  private val server: HttpServer = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
  private val executor = Executors.newSingleThreadExecutor { task ->
    Thread(task, "kedr-web-preview").apply { isDaemon = true }
  }

  val baseUrl: String
    get() = "http://127.0.0.1:${server.address.port}"

  fun start() {
    server.createContext("/") { exchange -> serve(exchange) }
    server.executor = executor
    server.start()
  }

  fun stop() {
    server.stop(0)
    executor.shutdownNow()
  }

  private fun serve(exchange: HttpExchange) {
    try {
      val method = exchange.requestMethod
      if (method != "GET" && method != "HEAD") {
        exchange.sendResponseHeaders(405, -1)
        return
      }

      val target = WebPreviewTargets.resolve(root, exchange.requestURI.path)
      if (target == null) {
        exchange.responseHeaders.add("Cache-Control", "no-store")
        exchange.sendResponseHeaders(404, -1)
        return
      }

      if (Files.size(target) > MAX_BYTES) {
        exchange.sendResponseHeaders(413, -1)
        return
      }

      val bytes = Files.readAllBytes(target)
      exchange.responseHeaders.add("Content-Type", WebPreviewTargets.contentType(target.fileName.toString()))
      exchange.responseHeaders.add("Cache-Control", "no-store")
      if (method == "HEAD") {
        exchange.sendResponseHeaders(200, -1)
        return
      }
      exchange.sendResponseHeaders(200, bytes.size.toLong())
      exchange.responseBody.use { body -> body.write(bytes) }
    }
    finally {
      exchange.close()
    }
  }

  private companion object {
    const val MAX_BYTES = 256L * 1024 * 1024
  }
}
