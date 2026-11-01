// Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.pycharm.community.customization

import com.intellij.platform.ide.customization.ExternalProductResourceUrls

// Kedr has no external product infrastructure yet, so all resource URLs are absent.
// Returning null disables update checks, JetBrains help/form/YouTube links, and other vendor-hosted resources.
internal class PyCharmExternalResourceUrls : ExternalProductResourceUrls {
  override val commercialEditionSuggestionsEnabled: Boolean
    get() = false
}
