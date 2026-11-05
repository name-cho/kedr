package com.kedr.web

import com.intellij.icons.AllIcons
import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

open class WebFileType(
  private val typeName: String,
  private val typeDescription: String,
  private val typeExtension: String,
  private val typeIcon: Icon,
) : LanguageFileType(WebLanguage) {
  override fun getName(): String = typeName
  override fun getDescription(): String = typeDescription
  override fun getDefaultExtension(): String = typeExtension
  override fun getIcon(): Icon = typeIcon
}

class CssFileType : WebFileType("CSS", "CSS stylesheet", "css", AllIcons.FileTypes.Css) {
  companion object {
    @JvmField
    val INSTANCE = CssFileType()
  }
}

class ScssFileType : WebFileType("SCSS", "SCSS stylesheet", "scss", AllIcons.FileTypes.Css) {
  companion object {
    @JvmField
    val INSTANCE = ScssFileType()
  }
}

class LessFileType : WebFileType("Less", "Less stylesheet", "less", AllIcons.FileTypes.Css) {
  companion object {
    @JvmField
    val INSTANCE = LessFileType()
  }
}

class JavaScriptFileType : WebFileType("JavaScript", "JavaScript source file", "js", AllIcons.FileTypes.JavaScript) {
  companion object {
    @JvmField
    val INSTANCE = JavaScriptFileType()
  }
}

class JsxFileType : WebFileType("JSX", "JSX source file", "jsx", AllIcons.FileTypes.JavaScript) {
  companion object {
    @JvmField
    val INSTANCE = JsxFileType()
  }
}

class TypeScriptFileType : WebFileType("TypeScript", "TypeScript source file", "ts", AllIcons.FileTypes.TypeScript) {
  companion object {
    @JvmField
    val INSTANCE = TypeScriptFileType()
  }
}

class TsxFileType : WebFileType("TSX", "TSX source file", "tsx", AllIcons.FileTypes.TypeScript) {
  companion object {
    @JvmField
    val INSTANCE = TsxFileType()
  }
}
