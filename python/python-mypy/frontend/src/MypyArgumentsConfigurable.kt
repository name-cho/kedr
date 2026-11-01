// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy.frontend

import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogPanel
import com.intellij.platform.ide.progress.runWithModalProgressBlocking
import com.intellij.platform.project.projectId
import com.intellij.python.mypy.common.PyMypyToolConfigurationDto
import com.intellij.python.pytools.common.ProjectLevelPyToolApi
import com.intellij.python.pytools.common.PyToolActionSource
import com.intellij.python.pytools.common.PyToolApi
import com.intellij.python.pytools.common.PyToolDescriptorDto
import com.intellij.python.pytools.common.PyToolEventKind
import com.intellij.python.pytools.common.PyToolLogEventRequest
import com.intellij.python.pytools.common.PyToolRequest
import com.intellij.python.pytools.common.PyToolSetConfigurationRequest
import com.intellij.python.pytools.common.getConfiguration
import com.intellij.python.pytools.frontend.pyToolFrontend
import com.intellij.ui.dsl.builder.AlignX
import com.intellij.ui.dsl.builder.MAX_LINE_LENGTH_WORD_WRAP
import com.intellij.ui.dsl.builder.panel
import javax.swing.JTextField

/**
 * The detail panel of the mypy row: the command line arguments passed to `mypy`.
 *
 * The configuration travels over [ProjectLevelPyToolApi] like every other external tool's, so the panel
 * holds nothing but the edited text and never touches the backing store directly.
 */
internal class MypyArgumentsConfigurable(
  private val project: Project,
  private val descriptor: PyToolDescriptorDto,
) : BoundConfigurable("mypy") {
  private val request = PyToolRequest(project.projectId(), pyToolFrontend<MypyPyToolFrontend>().fusId)
  private val configuration = runWithModalProgressBlocking(project, "mypy") {
    ProjectLevelPyToolApi.getInstance().getConfiguration<PyMypyToolConfigurationDto>(request)
  }
  private var storedArguments = configuration.arguments
  private val argumentsField = JTextField()

  override fun createPanel(): DialogPanel = panel {
    row {
      descriptor.minimumSupportedVersion?.let { version ->
        comment("Requires mypy $version or newer")
      }
    }
    row("mypy arguments:") {
      cell(argumentsField)
        .resizableColumn()
        .align(AlignX.FILL)
        .onApply { storedArguments = argumentsField.text.trim() }
        .onReset { argumentsField.text = storedArguments }
        .onIsModified { argumentsField.text.trim() != storedArguments }
        .comment("Passed to the checker before the target path, for example --strict or --ignore-missing-imports", MAX_LINE_LENGTH_WORD_WRAP)
    }
  }

  override fun apply() {
    super.apply()
    runWithModalProgressBlocking(project, "mypy") {
      ProjectLevelPyToolApi.getInstance().setConfiguration(
        PyToolSetConfigurationRequest(request, configuration.copy(arguments = storedArguments)),
      )
      PyToolApi.getInstance().logEvent(
        PyToolLogEventRequest(request, PyToolActionSource.SETTINGS_DETAIL, PyToolEventKind.CONFIGURATION_CHANGED),
      )
    }
  }
}
