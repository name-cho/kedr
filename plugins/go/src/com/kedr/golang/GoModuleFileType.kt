package com.kedr.golang

import com.intellij.icons.AllIcons
import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.fileTypes.PlainTextLanguage
import javax.swing.Icon

class GoModuleFileType private constructor() : LanguageFileType(PlainTextLanguage.INSTANCE, true) {
  companion object {
    @JvmField
    val INSTANCE = GoModuleFileType()
  }

  override fun getName(): String = "Go Module"
  override fun getDescription(): String = "Go module file"
  override fun getDefaultExtension(): String = "mod"
  override fun getIcon(): Icon = AllIcons.Language.GO
}
