import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "resizer", "toggle", "content"]
  static values = { 
    position: { type: String, default: "right" },
    width: { type: Number, default: 400 },
    isOpen: { type: Boolean, default: false }
  }

  connect() {
    console.log("Sidebar controller connected")
    this.initializeSidebar()
    
    // Dispatch a custom event to let other controllers know the sidebar is ready
    this.element.dispatchEvent(new CustomEvent('sidebar:ready', { bubbles: true }))
  }

  initializeSidebar() {
    if (!this.hasSidebarTarget) {
      console.error('Sidebar target not found')
      return
    }
    
    // Set initial state
    this.sidebarTarget.style.width = `${this.widthValue}px`
    this.sidebarTarget.style.position = 'fixed'
    this.sidebarTarget.style.top = '0'
    this.sidebarTarget.style.bottom = '0'
    this.sidebarTarget.style.zIndex = '1050'
    this.sidebarTarget.style.backgroundColor = '#fff'
    this.sidebarTarget.style.boxShadow = '0 0 20px rgba(0,0,0,0.1)'
    this.sidebarTarget.style.transition = 'transform 0.3s ease'
    this.sidebarTarget.style.overflowY = 'auto'
    this.sidebarTarget.style.visibility = 'hidden'
    
    // Position the sidebar
    this.updatePosition()
  }

  toggle() {
    if (this.isOpenValue) {
      this.hide()
    } else {
      this.show()
    }
  }

  show() {
    this.isOpenValue = true
    this.sidebarTarget.style.transform = 'translateX(0)'
    this.sidebarTarget.style.visibility = 'visible'
  }

  hide() {
    this.isOpenValue = false
    const translateX = this.positionValue === 'right' ? '100%' : '-100%'
    this.sidebarTarget.style.transform = `translateX(${translateX})`
    setTimeout(() => {
      if (!this.isOpenValue) {
        this.sidebarTarget.style.visibility = 'hidden'
      }
    }, 300)
  }

  switchPosition() {
    this.positionValue = this.positionValue === 'right' ? 'left' : 'right'
    this.updatePosition()
    
    // Update toggle button text
    const toggleText = this.toggleTarget.querySelector('.toggle-text')
    if (toggleText) {
      toggleText.textContent = this.positionValue === 'right' ? '←' : '→'
    }
  }

  updatePosition() {
    if (this.positionValue === 'right') {
      this.sidebarTarget.style.right = '0'
      this.sidebarTarget.style.left = 'auto'
      this.resizerTarget.style.left = '-5px'
      this.resizerTarget.style.right = 'auto'
    } else {
      this.sidebarTarget.style.left = '0'
      this.sidebarTarget.style.right = 'auto'
      this.resizerTarget.style.right = '-5px'
      this.resizerTarget.style.left = 'auto'
    }
  }

  startResize(event) {
    event.preventDefault()
    this.isResizing = true
    document.addEventListener('mousemove', this.resize.bind(this))
    document.addEventListener('mouseup', this.stopResize.bind(this))
  }

  resize(event) {
    if (!this.isResizing) return
    
    const rect = this.sidebarTarget.getBoundingClientRect()
    let newWidth
    
    if (this.positionValue === 'right') {
      newWidth = window.innerWidth - event.clientX
    } else {
      newWidth = event.clientX
    }
    
    // Constrain width between 300px and 800px
    newWidth = Math.max(300, Math.min(800, newWidth))
    
    this.widthValue = newWidth
    this.sidebarTarget.style.width = `${newWidth}px`
  }

  stopResize() {
    this.isResizing = false
    document.removeEventListener('mousemove', this.resize.bind(this))
    document.removeEventListener('mouseup', this.stopResize.bind(this))
  }

  loadContent(url) {
    console.log("Loading content in sidebar:", url)
    
    // Show loading state
    this.contentTarget.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Loading...</div>'
    this.show()
    
    fetch(url, {
      headers: {
        'Accept': 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.text()
      })
      .then(html => {
        // Parse turbo stream response
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const turboStream = doc.querySelector('turbo-stream')
        
        if (turboStream) {
          // Extract the content from turbo stream
          const template = turboStream.querySelector('template')
          if (template) {
            this.contentTarget.innerHTML = template.innerHTML
            
            // Dispatch event to notify other controllers that content was loaded
            this.element.dispatchEvent(new CustomEvent('sidebar:content-loaded', { 
              bubbles: true,
              detail: { url: url }
            }))
          }
        } else {
          // Fallback to direct HTML
          this.contentTarget.innerHTML = html
          
          // Dispatch event to notify other controllers that content was loaded
          this.element.dispatchEvent(new CustomEvent('sidebar:content-loaded', { 
            bubbles: true,
            detail: { url: url }
          }))
        }
      })
      .catch(error => {
        console.error('Error loading content:', error)
        this.contentTarget.innerHTML = `<div class="text-center p-4 text-red-600">
          Error loading content: ${error.message}
          <br><small>Please try again or contact support if the problem persists.</small>
        </div>`
      })
  }

  // Disabled clickOutside: Sidebar will only close via X or Cancel button.
} 