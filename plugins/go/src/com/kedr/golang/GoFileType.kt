package com.kedr.golang

import com.intellij.icons.AllIcons
import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

object GoLanguage : Language("Go")

class GoFileType : LanguageFileType(GoLanguage) {
  companion object {
    @JvmField
    val INSTANCE = GoFileType()
  }

  override fun getName(): String = "Go"
  override fun getDescription(): String = "Go source file"
  override fun getDefaultExtension(): String = "go"
  override fun getIcon(): Icon = AllIcons.Language.GO
}
