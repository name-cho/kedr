// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy

import com.intellij.openapi.options.UnnamedConfigurable
import com.intellij.openapi.project.Project
import com.intellij.python.pytools.PyTool
import com.intellij.python.pytools.configuration.ConfigurablePyTool
import com.intellij.python.pytools.icons.PythonPyToolsIcons
import com.jetbrains.python.packaging.PyPackageName
import org.jetbrains.annotations.ApiStatus
import javax.swing.Icon

/**
 * mypy — a static type checker for Python, integrated as a Kedr tool.
 *
 * mypy has no language server, so it cannot plug into the LSP client that
 * powers pyright/pyrefly/ty. Instead it is registered as a Python tool: the
 * interpreter is detected, mypy is reported in Python Tools settings, and the
 * bundled external-tool action lets the user run `mypy <project>` from the IDE
 * and read the report in the console. On-the-fly typing stays on the LSP-based
 * checkers that ship with the Python plugin.
 */
@ApiStatus.Internal
class MypyPyTool : PyTool, ConfigurablePyTool {
  override val presentableName: String = "mypy"
  override val description: String get() = "Static type checker for Python"
  override val packageName: PyPackageName = PyPackageName.from("mypy")
  override val icon: Icon get() = PythonPyToolsIcons.Logo
  override fun createConfigurable(project: Project): UnnamedConfigurable = MypyConfigurable(project)
}