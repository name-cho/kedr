// Copyright 2026 Kedr Project and contributors. Use of this source code is governed by the Apache 2.0 license.
package com.intellij.diagnostic

import com.intellij.notification.Notification
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.DataManager
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Attachment
import com.intellij.openapi.diagnostic.ErrorReportSubmitter
import com.intellij.openapi.diagnostic.IdeaLoggingEvent
import com.intellij.openapi.diagnostic.SubmittedReportInfo
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.SystemInfoRt
import com.intellij.util.Consumer
import com.intellij.util.concurrency.AppExecutorUtil
import org.jetbrains.annotations.ApiStatus
import java.awt.Component
import java.nio.charset.StandardCharsets
import java.nio.file.Path
import java.time.Instant
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.outputStream

@ApiStatus.Internal
class KedrErrorReportSubmitter : ErrorReportSubmitter() {
  override fun getReportActionText(): String = DiagnosticBundle.message("error.report.kedr.save.action")

  override fun getPrivacyNoticeText(): String = DiagnosticBundle.message("error.report.kedr.notice")

  override fun submit(
    events: Array<IdeaLoggingEvent>,
    additionalInfo: String?,
    parentComponent: Component,
    consumer: Consumer<in SubmittedReportInfo>,
  ): Boolean {
    val project = CommonDataKeys.PROJECT.getData(DataManager.getInstance().getDataContext(parentComponent))
    val descriptor = FileSaverDescriptor(
      DiagnosticBundle.message("error.report.kedr.save.title"),
      DiagnosticBundle.message("error.report.kedr.save.description"),
      "zip",
    )
    val target = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, parentComponent)
      .save("kedr-error-report.zip")
    if (target == null) {
      consumer.consume(SubmittedReportInfo(SubmittedReportInfo.SubmissionStatus.FAILED))
      return false
    }

    val environment = reportEnvironment()
    val attachments = events.flatMap { event -> event.attachments.filter { it.isIncluded }.map { it to it.name } }
    AppExecutorUtil.getAppExecutorService().execute {
      try {
        writeReport(target.file.toPath(), events, additionalInfo, environment, attachments)
        target.virtualFile?.refresh(true, false)
        consumer.consume(SubmittedReportInfo(target.file.toURI().toString(), target.file.name, SubmittedReportInfo.SubmissionStatus.NEW_ISSUE))
        Notification(
          "Error Report",
          DiagnosticBundle.message("error.report.kedr.saved.title"),
          DiagnosticBundle.message("error.report.kedr.saved.message", target.file.absolutePath),
          NotificationType.INFORMATION,
        ).notify(project)
      }
      catch (e: Exception) {
        LOG.warn("Failed to save the local error report", e)
        consumer.consume(SubmittedReportInfo(SubmittedReportInfo.SubmissionStatus.FAILED))
        ApplicationManager.getApplication().invokeLater {
          Messages.showErrorDialog(parentComponent, e.message ?: "", DiagnosticBundle.message("error.report.kedr.save.failed"))
        }
      }
    }
    return true
  }

  private companion object {
    val LOG = logger<KedrErrorReportSubmitter>()

    fun reportEnvironment(): Map<String, String> {
      val info = ApplicationInfo.getInstance()
      return linkedMapOf(
        "Product" to info.fullVersion,
        "Build" to info.build.asString(),
        "OS" to SystemInfoRt.OS_NAME,
        "Java" to System.getProperty("java.runtime.version", ""),
      )
    }
  }
}

internal fun renderReport(
  events: Array<IdeaLoggingEvent>,
  additionalInfo: String?,
  environment: Map<String, String>,
): String = buildString {
  appendLine("Kedr diagnostic report")
  appendLine("Created: ${Instant.now()}")
  environment.forEach { (key, value) -> appendLine("$key: $value") }
  if (!additionalInfo.isNullOrBlank()) {
    appendLine().appendLine("User comment:").appendLine(additionalInfo)
  }
  events.forEachIndexed { index, event ->
    appendLine().appendLine("Event ${index + 1}:")
    event.message?.let { appendLine(it) }
    event.problematicPluginInfo?.let { plugin ->
      appendLine("Plugin: ${plugin.pluginId.idString} ${plugin.version ?: ""}")
    }
    appendLine(event.throwableText)
    val included = event.attachments.filter { it.isIncluded }
    if (included.isNotEmpty()) {
      appendLine("Included attachments: ${included.joinToString { it.name }}")
    }
  }
  appendLine().appendLine("This archive was saved locally. Review it before sharing; it may contain personal data.")
}

internal fun writeReport(
  path: Path,
  events: Array<IdeaLoggingEvent>,
  additionalInfo: String?,
  environment: Map<String, String>,
  attachments: List<Pair<Attachment, String>> = events.flatMap { event -> event.attachments.filter { it.isIncluded }.map { it to it.name } },
) {
  ZipOutputStream(path.outputStream()).use { output ->
    output.putNextEntry(ZipEntry("report.txt"))
    output.write(renderReport(events, additionalInfo, environment).toByteArray(StandardCharsets.UTF_8))
    output.closeEntry()
    attachments.forEachIndexed { index, (attachment, name) ->
      val safeName = name.substringAfterLast('/').substringAfterLast('\\')
        .replace(Regex("[^\\w.-]"), "_").replace("..", "_").take(180).ifBlank { "attachment" }
      output.putNextEntry(ZipEntry("attachments/$index-$safeName"))
      attachment.openContentStream().use { it.copyTo(output) }
      output.closeEntry()
    }
  }
}
