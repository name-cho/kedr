package org.jetbrains.plugins.textmate.language.syntax.lexer

import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.FileTypeEditorHighlighterProviders
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory
import com.intellij.testFramework.junit5.TestApplication
import com.kedr.golang.GoFileType
import org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateEditorHighlighterProvider
import org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateSyntaxHighlighterFactory
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

@TestApplication
internal class GoHighlightingWiringTest {
  @Test
  fun goFilesUseTextMateHighlightingWithoutGopls() {
    assertEquals(GoFileType, FileTypeManager.getInstance().getFileTypeByFileName("main.go"))
    val language = Language.findLanguageByID("Go")
    assertIs<Language>(language)
    assertIs<TextMateSyntaxHighlighterFactory>(SyntaxHighlighterFactory.getLanguageFactory().forLanguage(language))
    assertIs<TextMateEditorHighlighterProvider>(FileTypeEditorHighlighterProviders.getInstance().forFileType(GoFileType))
  }
}
