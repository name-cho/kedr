package com.kedr.golang

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.NlsContexts
import com.intellij.openapi.util.NlsSafe
import org.jetbrains.annotations.Nls

object GoLanguage : com.intellij.lang.Language("Go") {
  init {
    // The language has no meaningful PSI parser; the editor experience is
    // provided by the gopls language server plus the TextMate Go grammar.
  }
}

class GoFileType : LanguageFileType(GoLanguage) {
  companion object {
    @JvmField
    val INSTANCE = GoFileType()
  }

  override fun getName(): String = "Go"
  override fun getDescription(): @NlsContexts.Description String = "Go source file"
  override fun getDefaultExtension(): String = "go"
  override fun getIcon(): javax.swing.Icon = AllIcons.Providers.Go
}

object AllIcons {
  object Providers {
    @JvmField
    val Go: javax.swing.Icon = com.intellij.util.ui.EmptyIcon.ICON_16
  }
}