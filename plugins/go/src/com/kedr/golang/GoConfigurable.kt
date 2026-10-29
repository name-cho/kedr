package com.kedr.golang

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.ui.panel.ComponentPanelBuilder
import com.intellij.ui.components.JBTextField
import com.kedr.golang.GoBundle
import javax.swing.JComponent

class GoConfigurable : SearchableConfigurable, Configurable.NoScroll {
  private val settings = GoSettings.getInstance()
  private val path = JBTextField(settings.goExecutable() ?: "")

  override fun getId(): String = "com.kedr.go.settings"
  override fun getDisplayName(): String = GoBundle.message("go.settings.display.name")

  override fun createComponent(): JComponent = ComponentPanelBuilder.createPanel()
    .addLabeledComponent(GoBundle.message("go.settings.executable.label"), path, 0)
    .withMoveTrailingText(GoBundle.message("go.settings.executable.placeholder"))
    .createPanel()

  override fun isModified(): Boolean = path.text != (settings.goExecutable() ?: "")
  override fun apply() {
    settings.loadState(GoSettings.State(path.text.trim()))
  }
}
