package com.kedr.golang

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.module.Module
import com.intellij.openapi.module.ModuleUtilCore
import com.intellij.openapi.roots.ModuleRootManager
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClientDescriptor
import com.intellij.platform.lsp.api.LspIntegrationProvider

/**
 * Serves `.go` files through the gopls language server.
 *
 * gopls is resolved on PATH. If it is missing, the LSP client simply stays
 * stopped and .go editing still works with TextMate highlighting.
 */
class GoLspIntegrationProvider : LspIntegrationProvider {
  override fun fileOpened(project: com.intellij.openapi.project.Project,
                          file: VirtualFile,
                          clientStarter: LspIntegrationProvider.LspClientStarter) {
    val module = ModuleUtilCore.findModuleForFile(file, project) ?: return
    if (GoFileType.INSTANCE != file.fileType) return
    if (ModuleUtilCore.findModuleForFile(file, project) != module) return
    clientStarter.ensureClientStarted(GoLspClientDescriptor(module))
  }
}

class GoLspClientDescriptor(module: Module) :
  LspClientDescriptor(module.project, "Go", *ModuleRootManager.getInstance(module).contentRoots) {

  override fun isSupportedFile(file: VirtualFile): Boolean = GoFileType.INSTANCE == file.fileType

  override fun createCommandLine(): GeneralCommandLine =
    GeneralCommandLine("gopls").withParameters("serve")
}