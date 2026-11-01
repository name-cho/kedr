// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Version
import com.intellij.python.mypy.common.PyMypyToolConfigurationDto
import com.intellij.python.pytools.backend.ProjectLevelPyTool
import com.intellij.python.pytools.backend.PyTool
import com.intellij.python.pytools.backend.PyToolsState
import com.jetbrains.python.packaging.PyPackageName
import org.jetbrains.annotations.ApiStatus

/**
 * [mypy](https://mypy-lang.org/) — the reference static type checker for Python, bundled as a Kedr tool.
 *
 * mypy has no language server, so it cannot plug into the LSP client that powers pyright/pyrefly/ty.
 * It is an external tool instead: the interpreter is detected, mypy is reported on the External Tools
 * settings page, and the bundled tool action runs `mypy <project>` in the console. On-the-fly typing
 * stays with the LSP-based checkers that ship with the Python plugin.
 */
@ApiStatus.Internal
class MypyPyTool : ProjectLevelPyTool<PyMypyToolConfigurationDto> {
  override val packageName: PyPackageName = PyPackageName.from("mypy")
  override val minimumSupportedVersion: Version = Version(1, 0, 0)

  override fun migrateLegacyState(project: Project): PyToolsState.ToolEntry {
    val configuration = MypyConfiguration.getInstance(project)
    configuration.executablePath = null
    return PyToolsState.ToolEntry(false)
  }

  override fun configurationState(project: Project): PyMypyToolConfigurationDto =
    PyMypyToolConfigurationDto(MypyConfiguration.getInstance(project).arguments)

  override fun applyConfigurationState(project: Project, state: PyMypyToolConfigurationDto) {
    MypyConfiguration.getInstance(project).arguments = state.arguments
  }

  companion object {
    fun getInstance(): MypyPyTool = PyTool.EP_NAME.findExtensionOrFail(MypyPyTool::class.java)
  }
}
