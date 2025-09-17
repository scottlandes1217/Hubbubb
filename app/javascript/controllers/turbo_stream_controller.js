import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Turbo Stream controller connected")
    console.log("Controller element:", this.element)
    
    // Store bound event handlers so we can remove them later
    this.boundHandlers = {
      beforeStreamRender: this.handleBeforeStreamRender.bind(this),
      beforeCache: this.handleBeforeCache.bind(this),
      render: this.handleRender.bind(this),
      streamReceive: this.handleStreamReceive.bind(this),
      beforeStreamProcess: this.handleBeforeStreamProcess.bind(this),
      streamProcess: this.handleStreamProcess.bind(this),
      error: this.handleError.bind(this)
    }
    
    // Add event listeners
    document.addEventListener("turbo:before-stream-render", this.boundHandlers.beforeStreamRender)
    document.addEventListener("turbo:before-cache", this.boundHandlers.beforeCache)
    document.addEventListener("turbo:render", this.boundHandlers.render)
    document.addEventListener("turbo:stream-receive", this.boundHandlers.streamReceive)
    document.addEventListener("turbo:before-stream-process", this.boundHandlers.beforeStreamProcess)
    document.addEventListener("turbo:stream-process", this.boundHandlers.streamProcess)
    document.addEventListener("turbo:error", this.boundHandlers.error)
  }
  
  disconnect() {
    // Remove all event listeners
    if (this.boundHandlers) {
      document.removeEventListener("turbo:before-stream-render", this.boundHandlers.beforeStreamRender)
      document.removeEventListener("turbo:before-cache", this.boundHandlers.beforeCache)
      document.removeEventListener("turbo:render", this.boundHandlers.render)
      document.removeEventListener("turbo:stream-receive", this.boundHandlers.streamReceive)
      document.removeEventListener("turbo:before-stream-process", this.boundHandlers.beforeStreamProcess)
      document.removeEventListener("turbo:stream-process", this.boundHandlers.streamProcess)
      document.removeEventListener("turbo:error", this.boundHandlers.error)
    }
  }
  
  handleBeforeStreamRender(event) {
    console.log("Turbo Stream before render:", event)
    console.log("Target:", event.target)
    console.log("Action:", event.action)
    console.log("Template:", event.template)
    console.log("Event detail:", event.detail)
    
    // Redirect logic for calendar updates
    const fragment = event.detail.newStreamElement;
    if (fragment) {
      const redirectTrigger = fragment.querySelector('#calendar-redirect-trigger');
      if (redirectTrigger) {
        const url = redirectTrigger.dataset.redirectUrl;
        if (url) {
          window.location.href = url;
        }
      }
    }
  }
  
  handleBeforeCache(event) {
    console.log("Turbo Stream before cache:", event)
    console.log("Event detail:", event.detail)
  }
  
  handleRender(event) {
    console.log("Turbo Stream render:", event)
    console.log("Target:", event.target)
    console.log("Action:", event.action)
    console.log("Template:", event.template)
    console.log("Event detail:", event.detail)
  }
  
  handleStreamReceive(event) {
    console.log("Turbo Stream received:", event)
    console.log("Target:", event.target)
    console.log("Action:", event.action)
    console.log("Template:", event.template)
    console.log("Event detail:", event.detail)
  }
  
  handleBeforeStreamProcess(event) {
    console.log("Turbo Stream before process:", event)
    console.log("Event detail:", event.detail)
  }
  
  handleStreamProcess(event) {
    console.log("Turbo Stream process:", event)
    console.log("Event detail:", event.detail)
  }
  
  handleError(event) {
    console.error("Turbo Stream error:", event)
    console.error("Event detail:", event.detail)
  }
} 