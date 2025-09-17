import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "submitBtn"]

  connect() {
    console.log("Event form controller connected")
  }

  submit(event) {
    // Prevent default form submission
    event.preventDefault()
    
    // Log any console errors before submission
    console.log("Submitting event form...")
    
    // Validate form
    if (this.validateForm()) {
      // Submit the form
      this.formTarget.submit()
    }
  }

  // Handle successful form submission
  success() {
    // Close the sidebar
    const sidebarController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="sidebar"]'), 
      'sidebar'
    )
    
    if (sidebarController) {
      sidebarController.hide()
    }
    
    // Refresh the calendar page
    window.location.reload()
  }

  validateForm() {
    const title = this.formTarget.querySelector('input[name="event[title]"]')
    const startTime = this.formTarget.querySelector('input[name="event[start_time]"]')
    const endTime = this.formTarget.querySelector('input[name="event[end_time]"]')
    const calendarCheckboxes = this.formTarget.querySelectorAll('input[name="event[calendar_ids][]"]:checked')
    
    let isValid = true
    let errors = []
    
    if (!title.value.trim()) {
      errors.push("Title is required")
      isValid = false
    }
    
    if (!startTime.value) {
      errors.push("Start time is required")
      isValid = false
    }
    
    if (!endTime.value) {
      errors.push("End time is required")
      isValid = false
    }
    
    if (calendarCheckboxes.length === 0) {
      errors.push("Please select at least one calendar")
      isValid = false
    }
    
    if (startTime.value && endTime.value) {
      const start = new Date(startTime.value)
      const end = new Date(endTime.value)
      if (end <= start) {
        errors.push("End time must be after start time")
        isValid = false
      }
    }
    
    if (!isValid) {
      this.showErrors(errors)
    }
    
    return isValid
  }

  showErrors(errors) {
    // Remove any existing global alert
    const existingGlobalAlert = document.querySelector('.global-top-alert');
    if (existingGlobalAlert) existingGlobalAlert.remove();

    // Create global alert div
    const alertDiv = document.createElement('div');
    alertDiv.className = 'global-top-alert alert alert-danger d-flex align-items-center justify-content-center position-fixed top-0 start-50 translate-middle-x';
    alertDiv.style.zIndex = '2000';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      <div>
        <h6 class="mb-2">Please fix the following errors:</h6>
        <ul class="mb-0">
          ${errors.map(error => `<li><strong>${error}</strong></li>`).join('')}
        </ul>
      </div>
      <button type="button" class="btn-close ms-3" aria-label="Close"></button>
    `;

    // Add close button handler
    alertDiv.querySelector('.btn-close').addEventListener('click', () => {
      alertDiv.remove();
    });

    // Insert at the top of the body
    document.body.appendChild(alertDiv);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle calendar checkbox changes
  toggleCalendar(event) {
    const checkbox = event.target
    const label = checkbox.nextElementSibling
    
    if (checkbox.checked) {
      label.style.fontWeight = '600'
      label.style.color = '#495057'
    } else {
      label.style.fontWeight = '400'
      label.style.color = '#6c757d'
    }
  }

  closeGlobalAlert(event) {
    const overlay = event.target.closest('.global-alert-overlay');
    if (overlay) overlay.remove();
  }
} 