package com.kedr.golang

import com.intellij.openapi.components.*

@Service(Service.Level.APP)
class GoSettings : PersistentStateComponent<GoSettings.State> {
  data class State(var goplsPath: String? = null)

  private var myState = State()

  fun goExecutable(): String? = myState.goplsPath?.takeIf { it.isNotBlank() }

  override fun getState(): State = myState
  override fun loadState(state: State) { myState = state }
}
