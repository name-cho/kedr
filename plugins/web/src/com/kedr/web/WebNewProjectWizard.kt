package com.kedr.web

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

class WebNewProjectWizard : LanguageGeneratorNewProjectWizard {
  override val name: String = "Web"
  override val icon: Icon = AllIcons.FileTypes.Html
  override val ordinal: Int = 120

  override fun createStep(parent: NewProjectWizardStep): NewProjectWizardStep = Step(parent)

  private class Step(parent: NewProjectWizardStep) :
    AbstractNewProjectWizardStep(parent),
    NewProjectWizardBaseData by parent.baseData!! {

    override fun setupProject(project: Project) {
      val directory = Path.of(contentEntryPath)
      Files.createDirectories(directory.resolve("styles"))
      Files.createDirectories(directory.resolve("scripts"))

      Files.writeString(directory.resolve("index.html"), INDEX_HTML)
      Files.writeString(directory.resolve("styles/main.css"), MAIN_CSS)
      Files.writeString(directory.resolve("scripts/main.js"), MAIN_JS)
      Files.writeString(directory.resolve("README.md"), README)
      Files.writeString(directory.resolve(".gitignore"), GITIGNORE)

      val moduleType = ModuleTypeManager.getInstance().findByID(GeneralModuleType.TYPE_ID)
      val builder = moduleType.createModuleBuilder()
      setupProjectFromBuilder(project, builder)
    }
  }
}

private val INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Web Project</title>
  <link rel="stylesheet" href="styles/main.css">
  <script src="scripts/main.js" defer></script>
</head>
<body>
  <main class="page">
    <h1>It works</h1>
    <p>Edit <code>index.html</code>, <code>styles/main.css</code> and <code>scripts/main.js</code>.</p>
    <p>Open Tools | Web Preview to see the page and reload it on save.</p>
    <button id="counter" type="button">Clicked 0 times</button>
  </main>
</body>
</html>
"""

private val MAIN_CSS = """:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f4f5f7;
  color: #1f2328;
}

.page {
  padding: 2rem 3rem;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgb(0 0 0 / 12%);
  text-align: center;
}

button {
  font: inherit;
  padding: 0.5rem 1rem;
  border: 1px solid #1f6feb;
  border-radius: 8px;
  background: #1f6feb;
  color: #ffffff;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  body {
    background: #16181d;
    color: #e6e6e6;
  }

  .page {
    background: #1f2329;
  }
}
"""

private val MAIN_JS = """const button = document.getElementById('counter')
let clicks = 0

button.addEventListener('click', () => {
  clicks += 1
  button.textContent = `Clicked ${'$'}{clicks} times`
})
"""

private val README = """# Web project

A static page with HTML, CSS and JavaScript. Open `index.html` in Tools | Web Preview
to see the result. The preview reloads the page when you save a file.
"""

private val GITIGNORE = """.idea/
build/
node_modules/
"""
