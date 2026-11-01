// Copyright 2026 Kedr Project and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.diagnostic

import com.intellij.openapi.diagnostic.Attachment
import com.intellij.openapi.diagnostic.IdeaLoggingEvent
import com.intellij.openapi.diagnostic.ProblematicPluginInfo
import com.intellij.openapi.diagnostic.UnhandledExceptionKind
import com.intellij.testFramework.junit5.TestApplication
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.util.zip.ZipFile
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@TestApplication
internal class KedrErrorReportSubmitterTest {
  @TempDir
  lateinit var tempDir: Path

  @Test
  fun reportContainsOnlySelectedAttachments() {
    val included = Attachment("selected.txt", "selected content").apply { isIncluded = true }
    val excluded = Attachment("excluded.txt", "excluded content").apply { isIncluded = false }
    val event = IdeaLoggingEvent("something failed", IllegalStateException("boom"))
    val events = arrayOf(IdeaLoggingEvent(event.message, event.throwable, listOf(included, excluded),
                                          null as ProblematicPluginInfo?, null, UnhandledExceptionKind.HANDLED))
    val target = tempDir.resolve("report.zip")

    writeReport(target, events, "I opened a project", mapOf("Product" to "Kedr Studio", "Build" to "IC-262.TEST"))

    ZipFile(target.toFile()).use { zip ->
      val report = zip.getInputStream(zip.getEntry("report.txt")).bufferedReader().readText()
      assertContains(report, "something failed")
      assertContains(report, "java.lang.IllegalStateException: boom")
      assertContains(report, "I opened a project")
      assertContains(report, "Kedr Studio")
      assertContains(report, "saved locally")
      assertTrue(zip.getEntry("attachments/0-selected.txt") != null)
      assertEquals("selected content", zip.getInputStream(zip.getEntry("attachments/0-selected.txt")).bufferedReader().readText())
      assertFalse(zip.entries().asSequence().any { it.name.contains("excluded") })
      assertFalse(report.contains("excluded content"))
    }
  }

  @Test
  fun attachmentNamesCannotEscapeTheArchiveDirectory() {
    val attachment = Attachment("../../secret.txt", "content").apply { isIncluded = true }
    val events = arrayOf(IdeaLoggingEvent("failure", RuntimeException(), listOf(attachment),
                                          null as ProblematicPluginInfo?, null, UnhandledExceptionKind.HANDLED))
    val target = tempDir.resolve("report.zip")

    writeReport(target, events, null, emptyMap())

    ZipFile(target.toFile()).use { zip ->
      val names = zip.entries().asSequence().map { it.name }.toList()
      assertTrue(names.all { it == "report.txt" || it.startsWith("attachments/") })
      assertFalse(names.any { it.contains("..") })
    }
  }
}
