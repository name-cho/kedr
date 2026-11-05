package org.jetbrains.plugins.textmate.language.syntax.lexer

import com.intellij.icons.AllIcons
import com.intellij.ide.wizard.language.LanguageGeneratorNewProjectWizard
import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.FileTypeEditorHighlighterProviders
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory
import com.intellij.testFramework.junit5.TestApplication
import com.kedr.web.CssFileType
import com.kedr.web.JavaScriptFileType
import com.kedr.web.JsxFileType
import com.kedr.web.LessFileType
import com.kedr.web.ScssFileType
import com.kedr.web.TsxFileType
import com.kedr.web.TypeScriptFileType
import com.kedr.web.WebFileType
import com.kedr.web.WebLanguage
import com.kedr.web.WebNewProjectWizard
import com.kedr.web.preview.WebPreviewTargets
import org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateEditorHighlighterProvider
import org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateSyntaxHighlighterFactory
import org.junit.jupiter.api.Test
import java.nio.file.Files
import javax.swing.Icon
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

@TestApplication
internal class WebSupportTest {
  private data class WebType(val type: WebFileType, val extension: String, val icon: Icon)

  private val webTypes = listOf(
    WebType(CssFileType.INSTANCE, "css", AllIcons.FileTypes.Css),
    WebType(ScssFileType.INSTANCE, "scss", AllIcons.FileTypes.Css),
    WebType(LessFileType.INSTANCE, "less", AllIcons.FileTypes.Css),
    WebType(JavaScriptFileType.INSTANCE, "js", AllIcons.FileTypes.JavaScript),
    WebType(JavaScriptFileType.INSTANCE, "mjs", AllIcons.FileTypes.JavaScript),
    WebType(JavaScriptFileType.INSTANCE, "cjs", AllIcons.FileTypes.JavaScript),
    WebType(JsxFileType.INSTANCE, "jsx", AllIcons.FileTypes.JavaScript),
    WebType(TypeScriptFileType.INSTANCE, "ts", AllIcons.FileTypes.TypeScript),
    WebType(TypeScriptFileType.INSTANCE, "mts", AllIcons.FileTypes.TypeScript),
    WebType(TypeScriptFileType.INSTANCE, "cts", AllIcons.FileTypes.TypeScript),
    WebType(TsxFileType.INSTANCE, "tsx", AllIcons.FileTypes.TypeScript),
  )

  @Test
  fun webFilesUseTheWebFileTypes() {
    val fileTypes = FileTypeManager.getInstance()
    for (entry in webTypes) {
      assertEquals(entry.type, fileTypes.getFileTypeByFileName("sample.${entry.extension}"), entry.extension)
      assertSame(WebLanguage, entry.type.language, entry.extension)
    }
  }

  @Test
  fun webFileTypesShowWebIcons() {
    for (entry in webTypes) {
      assertSame(entry.icon, entry.type.icon, entry.extension)
      assertTrue(entry.type.icon.iconWidth > 0, entry.extension)
      assertFalse(entry.type.isReadOnly, entry.extension)
    }
  }

  @Test
  fun webFileTypesUseTextMateHighlighting() {
    val language = Language.findLanguageByID("Web") ?: error("Web language is not registered")
    assertIs<TextMateSyntaxHighlighterFactory>(SyntaxHighlighterFactory.getLanguageFactory().forLanguage(language))
    for (entry in webTypes) {
      assertIs<TextMateEditorHighlighterProvider>(FileTypeEditorHighlighterProviders.getInstance().forFileType(entry.type))
    }
  }

  @Test
  fun theNewProjectWizardOffersAWebProject() {
    val wizard = LanguageGeneratorNewProjectWizard.EP_NAME.extensionList.first { it.name == "Web" }
    assertIs<WebNewProjectWizard>(wizard)
    assertSame(AllIcons.FileTypes.Html, wizard.icon)
  }

  @Test
  fun thePreviewServerServesTheProjectDirectory() {
    val root = Files.createTempDirectory("kedr-web-preview")
    try {
      Files.createDirectories(root.resolve("styles"))
      Files.writeString(root.resolve("index.html"), "<!DOCTYPE html>")
      Files.writeString(root.resolve("styles/main.css"), "body {}")

      assertEquals(root.resolve("index.html"), WebPreviewTargets.resolve(root, "/"))
      assertEquals(root.resolve("index.html"), WebPreviewTargets.resolve(root, "/index.html"))
      assertEquals(root.resolve("styles/main.css"), WebPreviewTargets.resolve(root, "/styles/main.css"))
      assertEquals(root.resolve("styles/main.css"), WebPreviewTargets.resolve(root, "/" + WebPreviewTargets.encodePath("styles/main.css")))
      assertNull(WebPreviewTargets.resolve(root, "/styles/"))
      assertNull(WebPreviewTargets.resolve(root, "/missing.html"))
      assertNull(WebPreviewTargets.resolve(root, "/../outside.html"))
    }
    finally {
      root.toFile().deleteRecursively()
    }
  }

  @Test
  fun thePreviewServerKnowsTheWebContentTypes() {
    assertEquals("text/html; charset=utf-8", WebPreviewTargets.contentType("index.html"))
    assertEquals("text/css; charset=utf-8", WebPreviewTargets.contentType("main.css"))
    assertEquals("text/javascript; charset=utf-8", WebPreviewTargets.contentType("main.js"))
    assertEquals("image/svg+xml", WebPreviewTargets.contentType("logo.svg"))
    assertEquals("application/octet-stream", WebPreviewTargets.contentType("archive.bin"))
    assertEquals("index%20page.html", WebPreviewTargets.encodePath("index page.html"))
  }
}
