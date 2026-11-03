package org.jetbrains.plugins.textmate.language.syntax.lexer

import com.intellij.icons.AllIcons
import com.intellij.ide.wizard.language.LanguageGeneratorNewProjectWizard
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.fileTypes.PlainTextLanguage
import com.intellij.testFramework.junit5.TestApplication
import com.kedr.golang.GoFileType
import com.kedr.golang.GoLanguage
import com.kedr.golang.GoModuleFileType
import com.kedr.golang.GoNewProjectWizard
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertSame
import kotlin.test.assertTrue

@TestApplication
internal class GoIconsTest {
  @Test
  fun goFilesUseThePlatformGoIcon() {
    assertSame(AllIcons.Language.GO, GoFileType.INSTANCE.icon)
    assertEquals(16, GoFileType.INSTANCE.icon.iconWidth)
    assertEquals(16, GoFileType.INSTANCE.icon.iconHeight)
  }

  @Test
  fun newProjectWizardShowsTheGoIcon() {
    val wizard = LanguageGeneratorNewProjectWizard.EP_NAME.extensionList.first { it.name == "Go" }
    assertIs<GoNewProjectWizard>(wizard)
    assertSame(AllIcons.Language.GO, wizard.icon)
  }

  @Test
  fun moduleFilesAreRecognisedByName() {
    val fileTypes = FileTypeManager.getInstance()
    for (name in listOf("go.mod", "go.sum", "go.work", "go.work.sum")) {
      assertEquals(GoModuleFileType.INSTANCE, fileTypes.getFileTypeByFileName(name), name)
    }
    assertSame(AllIcons.Language.GO, GoModuleFileType.INSTANCE.icon)
  }

  @Test
  fun moduleFilesDoNotTakeOverTheGoLanguage() {
    assertEquals(GoFileType.INSTANCE, FileTypeManager.getInstance().getFileTypeByFileName("main.go"))
    assertSame(GoLanguage, GoFileType.INSTANCE.language)
    assertSame(PlainTextLanguage.INSTANCE, GoModuleFileType.INSTANCE.language)
    assertTrue(GoModuleFileType.INSTANCE.isSecondary)
    assertSame(GoFileType.INSTANCE, GoLanguage.associatedFileType)
  }
}
