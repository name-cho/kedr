package com.kedr.web.preview

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.wm.ToolWindowManager
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import javax.swing.Timer

@Service(Service.Level.PROJECT)
class WebPreviewService(private val project: Project) : Disposable {
  private val listeners = CopyOnWriteArrayList<(String) -> Unit>()
  private val reloadTimer = Timer(RELOAD_DELAY) { notifyListeners() }.apply {
    isRepeats = false
    stop()
  }
  private var server: WebPreviewServer? = null
  private var root: Path? = null
  private var url: String? = null

  var target: VirtualFile? = null
    private set

  init {
    project.messageBus.connect(this).subscribe(VirtualFileManager.VFS_CHANGES, object : BulkFileListener {
      override fun after(events: List<VFileEvent>) {
        val base = root ?: return
        val touched = events.any { event -> event is VFileContentChangeEvent && isInside(base, event) }
        if (touched) {
          ApplicationManager.getApplication().invokeLater { reloadTimer.restart() }
        }
      }
    })
  }

  fun currentUrl(): String? = url

  fun subscribe(listener: (String) -> Unit) {
    listeners.add(listener)
    url?.let(listener)
  }

  fun unsubscribe(listener: (String) -> Unit) {
    listeners.remove(listener)
  }

  fun open(file: VirtualFile) {
    val base = projectBase(file)
    if (server == null || root != base) {
      server?.stop()
      server = null
      root = base
      server = startServer(base)
    }
    url = previewUrl(base, file)
    target = file
    notifyListeners()
    ToolWindowManager.getInstance(project).getToolWindow(WebPreviewToolWindowFactory.ID)?.activate(null)
  }

  override fun dispose() {
    reloadTimer.stop()
    server?.stop()
    server = null
    listeners.clear()
  }

  private fun startServer(base: Path): WebPreviewServer? {
    val candidate = try {
      WebPreviewServer(base)
    }
    catch (e: Exception) {
      return null
    }
    catch (e: LinkageError) {
      return null
    }
    return try {
      candidate.start()
      candidate
    }
    catch (e: Exception) {
      candidate.stop()
      null
    }
    catch (e: LinkageError) {
      candidate.stop()
      null
    }
  }

  private fun previewUrl(base: Path, file: VirtualFile): String {
    val fileUri = Path.of(file.path).toUri().toString()
    val current = server ?: return fileUri
    val relative = try {
      base.toAbsolutePath().normalize()
        .relativize(Path.of(file.path).toAbsolutePath().normalize())
        .toString()
        .replace('\\', '/')
    }
    catch (e: IllegalArgumentException) {
      return fileUri
    }
    if (relative.isEmpty() || relative.startsWith("..")) return fileUri
    return "${current.baseUrl}/${WebPreviewTargets.encodePath(relative)}"
  }

  private fun projectBase(file: VirtualFile): Path {
    project.basePath?.let { return Path.of(it).toAbsolutePath().normalize() }
    file.parent?.path?.let { return Path.of(it).toAbsolutePath().normalize() }
    val parent = Path.of(file.path).toAbsolutePath().normalize().parent
    return parent ?: Path.of(".").toAbsolutePath().normalize()
  }

  private fun isInside(base: Path, event: VFileEvent): Boolean {
    val file = event.file ?: return false
    return file.path.startsWith(base.toString())
  }

  private fun notifyListeners() {
    val current = url ?: return
    listeners.forEach { listener -> listener(current) }
  }

  companion object {
    private const val RELOAD_DELAY = 200

    fun getInstance(project: Project): WebPreviewService = project.service()
  }
}
