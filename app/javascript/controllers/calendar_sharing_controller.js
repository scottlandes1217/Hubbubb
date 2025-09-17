import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["userSelect", "emailInput", "permissionSelect", "shareBtn"]

  connect() {
    console.log("Calendar sharing controller connected")
  }

  share() {
    const userId = this.userSelectTarget.value
    const email = this.emailInputTarget.value
    const permission = this.permissionSelectTarget.value

    if (!userId && !email) {
      this.showError("Please select a user or enter an email address")
      return
    }

    const data = {
      calendar_share: {
        user_id: userId || null,
        email: email || null,
        permission: permission
      }
    }

    fetch(this.element.dataset.shareUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      if (data.errors) {
        this.showError(data.errors.join(', '))
      } else {
        this.showSuccess("Calendar shared successfully!")
        this.clearForm()
        // Refresh the shares list
        this.refreshSharesList()
      }
    })
    .catch(error => {
      console.error('Error:', error)
      this.showError("Failed to share calendar")
    })
  }

  clearForm() {
    this.userSelectTarget.value = ""
    this.emailInputTarget.value = ""
    this.permissionSelectTarget.value = "view"
  }

  refreshSharesList() {
    // This would trigger a Turbo Stream update
    // For now, we'll just reload the page
    window.location.reload()
  }

  showSuccess(message) {
    this.showNotification(message, 'success')
  }

  showError(message) {
    this.showNotification(message, 'danger')
  }

  showNotification(message, type) {
    const alert = document.createElement('div')
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    
    document.body.appendChild(alert)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert)
      }
    }, 5000)
  }

  // Handle user selection change
  userSelected() {
    if (this.userSelectTarget.value) {
      this.emailInputTarget.value = ""
    }
  }

  // Handle email input change
  emailChanged() {
    if (this.emailInputTarget.value) {
      this.userSelectTarget.value = ""
    }
  }
} 