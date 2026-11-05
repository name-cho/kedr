package com.kedr.web.preview

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.VirtualFile

class OpenWebPreviewAction : DumbAwareAction() {
  override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

  override fun update(event: AnActionEvent) {
    event.presentation.isEnabledAndVisible = previewable(event) != null
  }

  override fun actionPerformed(event: AnActionEvent) {
    val file = previewable(event) ?: return
    val project = event.project ?: return
    WebPreviewService.getInstance(project).open(file)
  }

  private fun previewable(event: AnActionEvent): VirtualFile? {
    val file = event.getData(CommonDataKeys.VIRTUAL_FILE) ?: return null
    if (file.isDirectory) return null
    val extension = file.extension ?: return null
    return if (extension.lowercase() in PAGES) file else null
  }

  private companion object {
    val PAGES = setOf("html", "htm", "xhtml")
  }
}
