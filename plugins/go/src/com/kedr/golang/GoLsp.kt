package com.kedr.golang

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ModuleRootManager
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClientDescriptor
import com.intellij.platform.lsp.api.LspIntegrationProvider
import com.intellij.platform.lsp.api.customization.LspCustomization
import com.intellij.platform.lsp.api.customization.LspSemanticTokensSupport
import com.intellij.psi.PsiFile

class GoLspIntegrationProvider : LspIntegrationProvider {
  override fun fileOpened(project: Project,
                          file: VirtualFile,
                          clientStarter: LspIntegrationProvider.LspClientStarter) {
    if (GoFileType.INSTANCE != file.fileType) return
    clientStarter.ensureClientStarted(GoLspClientDescriptor(project))
  }
}

class GoLspClientDescriptor(project: Project) :
  LspClientDescriptor(project, "Go", *contentRoots(project)) {

  override fun isSupportedFile(file: VirtualFile): Boolean = GoFileType.INSTANCE == file.fileType

  override fun createCommandLine(): GeneralCommandLine =
    GeneralCommandLine("gopls").withParameters("serve")

  override val lspCustomization: LspCustomization
    get() = object : LspCustomization() {
      override val semanticTokensCustomizer = object : LspSemanticTokensSupport() {
        override fun shouldAskServerForSemanticTokens(psiFile: PsiFile): Boolean = true
      }
    }
}

private fun contentRoots(project: Project): Array<VirtualFile> {
  val roots = LinkedHashSet<VirtualFile>()
  for (module in ModuleManager.getInstance(project).modules) {
    for (root in ModuleRootManager.getInstance(module).contentRoots) {
      roots.add(root)
    }
  }
  return roots.toTypedArray()
}