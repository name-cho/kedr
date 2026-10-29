package com.kedr.golang

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.module.Module
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClientDescriptor
import com.intellij.platform.lsp.api.LspIntegrationProvider
import com.intellij.platform.lsp.api.customization.LspClientCustomization
import com.intellij.platform.lsp.api.customization.defaultLspClientCustomization

/**
 * Serves `.go` files through the gopls language server.
 *
 * gopls is auto-detected on PATH (or GOROOT/bin); if it is missing the LSP
 * client simply stays stopped and the editor still works with TextMate
 * highlighting. Point to a custom binary in Settings | Languages & Frameworks |
 * Go via [GoConfigurable].
 */
class GoLspIntegrationProvider : LspIntegrationProvider {
  override fun fileOpened(project: com.intellij.openapi.project.Project,
                          file: VirtualFile,
                          lspClientStarter: LspIntegrationProvider.LspClientStarter) {
    val module = com.intellij.openapi.module.ModuleUtilCore.findModuleForFile(file, project) ?: return
    if (GoFileType.INSTANCE != file.fileType) return
    if (!isFileInModule(module, file)) return
    lspClientStarter.ensureClientStarted(GoLspClientDescriptor(module))
  }

  private fun isFileInModule(module: Module, file: VirtualFile): Boolean =
    com.intellij.openapi.roots.ModuleRootManager.getInstance(module)
      .contentRoots.any { file.path.startsWith(it.path) }
      && com.intellij.openapi.module.ModuleUtilCore.findModuleForFile(file, module.project) == module
}

class GoLspClientDescriptor(module: Module) :
  LspClientDescriptor(module.project, "Go", *com.intellij.openapi.roots.ModuleRootManager.getInstance(module).contentRoots) {

  override fun isSupportedFile(file: VirtualFile): Boolean = GoFileType.INSTANCE == file.fileType

  override fun createCommandLine(): GeneralCommandLine =
    GeneralCommandLine("gopls").withParameters("serve")

  override fun createInitializationOptions(): Any? = null

  override val lspClientCustomization: LspClientCustomization = defaultLspClientCustomization
}