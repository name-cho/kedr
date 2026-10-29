package com.kedr.golang

import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.NlsContexts
import org.jetbrains.annotations.NotNull

object GoLanguage : Language("Go")

class GoFileType : LanguageFileType(GoLanguage) {
  companion object {
    @JvmField
    val INSTANCE = GoFileType()
  }

  override fun getName(): String = "Go"
  override fun getDescription(): String = "Go source file"
  override fun getDefaultExtension(): String = "go"
  override fun getIcon(): javax.swing.Icon? = null
}