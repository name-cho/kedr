// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

/**
 * Backing store for the mypy arguments edited on the External Tools page.
 *
 * The state name and the storage file are the ones the pre-2026.3 Kedr build used, so a project that
 * had mypy configured keeps its file; only [executablePath] is legacy — the custom path now lives per
 * machine in the Python tools infrastructure and is deliberately not migrated.
 */
@State(name = "KedrMypyConfiguration", storages = [Storage("pythonMypy.xml")])
@Service(Service.Level.PROJECT)
class MypyConfiguration(private val project: Project) : PersistentStateComponent<MypyConfiguration.State> {
  data class State(
    var executablePath: String? = null,
    var arguments: String = "",
  )

  private var myState = State()

  /** Legacy per-project path; kept so that old files load, never written back. */
  var executablePath: String?
    get() = myState.executablePath
    set(value) { myState.executablePath = value }

  var arguments: String
    get() = myState.arguments
    set(value) { myState.arguments = value }

  override fun getState(): State = myState
  override fun loadState(state: State) { myState = state }

  companion object {
    @JvmStatic
    fun getInstance(project: Project): MypyConfiguration = project.getService(MypyConfiguration::class.java)
  }
}
