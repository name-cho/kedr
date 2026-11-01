// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy.frontend

import com.intellij.openapi.options.UnnamedConfigurable
import com.intellij.openapi.project.Project
import com.intellij.python.mypy.common.PyMypyToolConfigurationDto
import com.intellij.python.pytools.common.FusId
import com.intellij.python.pytools.common.PyToolDescriptorDto
import com.intellij.python.pytools.frontend.ProjectLevelPyToolFrontend
import javax.swing.Icon

/**
 * The External Tools page half of the mypy tool: the row, its icon and the arguments field it expands.
 *
 * The executable itself is not configured here: the custom path is a per-machine setting shared by every
 * project, and the page shows it from the tool state.
 */
internal class MypyPyToolFrontend : ProjectLevelPyToolFrontend<PyMypyToolConfigurationDto> {
  override val presentableName: String = "mypy"
  override val description: String = "Static type checker for Python"
  override val fusId: FusId = FusId("mypy")
  override val icon: Icon get() = com.intellij.icons.AllIcons.Nodes.Plugin
  override val configurationClass: Class<PyMypyToolConfigurationDto> = PyMypyToolConfigurationDto::class.java

  override fun createConfigurable(project: Project, descriptor: PyToolDescriptorDto): UnnamedConfigurable =
    MypyArgumentsConfigurable(project, descriptor)

  override fun summary(project: Project, configuration: PyMypyToolConfigurationDto): String =
    configuration.arguments.trim()
}
