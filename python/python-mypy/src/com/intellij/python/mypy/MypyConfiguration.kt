// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.python.mypy

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

@State(name = "KedrMypyConfiguration", storages = [Storage("pythonMypy.xml")])
@Service(Service.Level.PROJECT)
class MypyConfiguration(private val project: Project) : PersistentStateComponent<MypyConfiguration.State> {
  data class State(var executablePath: String? = null)

  private var myState = State()

  var executablePath: String?
    get() = myState.executablePath
    set(value) { myState.executablePath = value }

  override fun getState(): State = myState
  override fun loadState(state: State) { myState = state }

  companion object {
    @JvmStatic
    fun getInstance(project: Project): MypyConfiguration = project.getService(MypyConfiguration::class.java)
  }
}