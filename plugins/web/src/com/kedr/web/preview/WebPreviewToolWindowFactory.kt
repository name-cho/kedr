package com.kedr.web.preview

import com.intellij.ide.BrowserUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBLabel
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import java.awt.BorderLayout
import java.awt.FlowLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JTextField

class WebPreviewToolWindowFactory : ToolWindowFactory, DumbAware {
  override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
    val panel = WebPreviewPanel(project)
    val content = ContentFactory.getInstance().createContent(panel, "", false)
    content.isCloseable = false
    content.setDisposer(panel)
    toolWindow.contentManager.addContent(content)
  }

  companion object {
    const val ID: String = "Web Preview"
  }
}

private class WebPreviewPanel(project: Project) : JPanel(BorderLayout()), Disposable {
  private val service = WebPreviewService.getInstance(project)
  private val browser: JBCefBrowser? = startBrowser()
  private val location = JBLabel("")
  private val onPreview: (String) -> Unit = { url -> navigate(url) }
  private var loaded = false
  private var lastUrl: String? = null

  init {
    add(createToolbar(), BorderLayout.NORTH)
    val view = browser?.component
    if (view != null) {
      add(view, BorderLayout.CENTER)
    }
    else {
      add(JBLabel("The built-in browser is not available. Use Open in Browser."), BorderLayout.CENTER)
    }
    add(location, BorderLayout.SOUTH)
    service.subscribe(onPreview)
  }

  private fun createToolbar(): JComponent {
    val toolbar = JPanel(FlowLayout(FlowLayout.LEFT, 4, 0))
    val reload = JButton("Reload")
    reload.addActionListener { service.currentUrl()?.let(onPreview) }
    val external = JButton("Open in Browser")
    external.addActionListener { service.currentUrl()?.let { url -> BrowserUtil.browse(url) } }
    val address = JTextField(24)
    address.toolTipText = "Development server URL"
    val openUrl = JButton("Open URL")
    val navigateToAddress = {
      if (!service.openUrl(address.text)) {
        location.text = "Enter a valid HTTP or HTTPS URL."
      }
    }
    openUrl.addActionListener { navigateToAddress() }
    address.addActionListener { navigateToAddress() }
    toolbar.add(address)
    toolbar.add(openUrl)
    toolbar.add(reload)
    toolbar.add(external)
    return toolbar
  }

  private fun navigate(url: String) {
    location.text = url
    val view = browser ?: return
    if (loaded && lastUrl == url) {
      view.cefBrowser.reloadIgnoreCache()
    }
    else if (loaded) {
      view.cefBrowser.loadURL(url)
    }
    else {
      loaded = true
      view.loadURL(url)
    }
    lastUrl = url
  }

  override fun dispose() {
    service.unsubscribe(onPreview)
    browser?.dispose()
  }

  private fun startBrowser(): JBCefBrowser? {
    val supported = try {
      JBCefApp.isSupported()
    }
    catch (e: LinkageError) {
      false
    }
    if (!supported) return null
    return try {
      JBCefBrowser()
    }
    catch (e: Exception) {
      null
    }
    catch (e: LinkageError) {
      null
    }
  }
}
