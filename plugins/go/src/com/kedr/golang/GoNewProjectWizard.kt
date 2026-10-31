package com.kedr.golang

import com.intellij.icons.AllIcons
import com.intellij.ide.wizard.AbstractNewProjectWizardStep
import com.intellij.ide.wizard.NewProjectWizardBaseData
import com.intellij.ide.wizard.NewProjectWizardBaseData.Companion.baseData
import com.intellij.ide.wizard.NewProjectWizardStep
import com.intellij.ide.wizard.language.LanguageGeneratorNewProjectWizard
import com.intellij.ide.wizard.setupProjectFromBuilder
import com.intellij.openapi.module.GeneralModuleType
import com.intellij.openapi.module.ModuleTypeManager
import com.intellij.openapi.project.Project
import java.nio.file.Files
import java.nio.file.Path
import javax.swing.Icon

/**
 * Adds Go to the language tray of the New Project wizard.
 *
 * The generated project contains a minimal `go.mod` and `main.go`; the module
 * itself is a regular general-purpose module, so `gopls` can pick the project
 * up as soon as the files are indexed.
 */
class GoNewProjectWizard : LanguageGeneratorNewProjectWizard {
  override val name: String = "Go"
  override val icon: Icon = AllIcons.Nodes.Module
  override val ordinal: Int = 100

  override fun createStep(parent: NewProjectWizardStep): NewProjectWizardStep = Step(parent)

  private class Step(parent: NewProjectWizardStep) :
    AbstractNewProjectWizardStep(parent),
    NewProjectWizardBaseData by parent.baseData!! {

    override fun setupProject(project: Project) {
      val directory = Path.of(contentEntryPath)
      Files.createDirectories(directory)

      val moduleName = name
        .replace(Regex("[^A-Za-z0-9_.\\-]"), "-")
        .ifBlank { "goapp" }

      Files.writeString(directory.resolve("go.mod"), "module $moduleName\n\ngo 1.21\n")
      Files.writeString(directory.resolve("main.go"), """
        package main

        import "fmt"

        func main() {
        	fmt.Println("Hello, Go!")
        }
      """.trimIndent() + "\n")

      val moduleType = ModuleTypeManager.getInstance().findByID(GeneralModuleType.TYPE_ID)
      val builder = moduleType.createModuleBuilder()
      setupProjectFromBuilder(project, builder)
    }
  }
}
