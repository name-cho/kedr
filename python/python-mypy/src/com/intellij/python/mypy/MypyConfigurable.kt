// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComponentValidator
import com.intellij.openapi.ui.ValidationInfo
import com.intellij.openapi.util.io.FileUtilRt
import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.components.JBTextField
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent

class MypyConfigurable(private val project: Project) :
  SearchableConfigurable, Configurable.NoMargin, Configurable.NoScroll {

  private val configuration = MypyConfiguration.getInstance(project)
  private val pathField = JBTextField("", 40)

  override fun getId(): String = "com.intellij.python.mypy"
  override fun getDisplayName(): String = "mypy"

  override fun createComponent(): JComponent {
    pathField.text = configuration.executablePath.orEmpty()
    val help = JBLabel("Path to the mypy executable. Leave empty to detect from the interpreter / PATH.")
    return FormBuilder.createFormBuilder()
      .addLabeledComponent("mypy executable:", pathField)
      .addComponent(help)
      .addComponentFillVertically(com.intellij.util.ui.UIUtil.BORDER_STYLE_EMPTY, 0)
      .panel
  }

  override fun isModified(): Boolean = pathField.text.trim() != configuration.executablePath.orEmpty()

  override fun apply() {
    configuration.executablePath = pathField.text.trim().ifEmpty { null }
  }

  override fun reset() {
    pathField.text = configuration.executablePath.orEmpty()
  }
}