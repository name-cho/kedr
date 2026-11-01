// Copyright 2026 Kedr Project and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.ide.plugins.advertiser

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.updateSettings.impl.pluginsAdvertisement.PluginAdvertiserService
import com.intellij.openapi.updateSettings.impl.pluginsAdvertisement.tryUltimateIsDisabled
import com.intellij.platform.ide.customization.ExternalProductResourceUrls
import com.intellij.testFramework.junit5.TestApplication
import com.intellij.testFramework.junit5.TestDisposable
import com.intellij.testFramework.registerOrReplaceServiceInstance
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

@TestApplication
internal class KedrCommercialSuggestionPolicyTest {
  @Test
  fun forkDisablesCommercialEditionSuggestions(@TestDisposable disposable: Disposable) {
    replacePolicy(false, disposable)
    assertNull(PluginAdvertiserService.getSuggestedCommercialIdeCode("IC"))
    assertNull(PluginAdvertiserService.getSuggestedCommercialIdeCode("PC"))
    assertTrue(tryUltimateIsDisabled())
  }

  @Test
  fun upstreamMappingIsPreservedWhenEnabled(@TestDisposable disposable: Disposable) {
    replacePolicy(true, disposable)
    assertEquals("IU", PluginAdvertiserService.getSuggestedCommercialIdeCode("IC"))
    assertEquals("PY", PluginAdvertiserService.getSuggestedCommercialIdeCode("PC"))
  }

  private fun replacePolicy(enabled: Boolean, disposable: Disposable) {
    val urls = object : ExternalProductResourceUrls {
      override val commercialEditionSuggestionsEnabled: Boolean
        get() = enabled
    }
    ApplicationManager.getApplication().registerOrReplaceServiceInstance(ExternalProductResourceUrls::class.java, urls, disposable)
  }
}
