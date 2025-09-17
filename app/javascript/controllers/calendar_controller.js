import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["day", "newEventButton", "headerCell"]

  connect() {
    console.log("Calendar controller connected")
    
    // Listen for sidebar ready event
    this.element.addEventListener('sidebar:ready', () => {
      console.log("Sidebar is ready")
      this.sidebarReady = true
      this.retryCount = 0
      if (this.hasNewEventButtonTarget) {
        this.newEventButtonTarget.removeAttribute('disabled')
      }
    })
    
    // Listen for sidebar content loaded event
    this.element.addEventListener('sidebar:content-loaded', (event) => {
      console.log("Sidebar content loaded:", event.detail.url)
      // Reset retry count when content is successfully loaded
      this.retryCount = 0
    })
    
    // Update header colors on initial load
    this.updateHeaderColors()
    window.calendarController = this;
  }

  createEvent(event) {
    // Only allow clicking if user has permission and calendars exist
    if (!this.hasCalendars()) {
      this.showNoCalendarsMessage()
      return
    }

    const date = event.currentTarget.dataset.date
    const organizationId = this.getOrganizationId()
    const calendarId = this.getFirstCalendarId()
    
    if (calendarId) {
      const url = `/organizations/${organizationId}/calendars/${calendarId}/events/new?start_time=${date}T09:00:00`
      this.openEventModal({ preventDefault: () => {}, currentTarget: { href: url } })
    }
  }

  hasCalendars() {
    // Check if there are any calendar checkboxes available
    const calendarCheckboxes = document.querySelectorAll('input[name="calendar_ids[]"]')
    return calendarCheckboxes.length > 0
  }

  getFirstCalendarId() {
    const calendarCheckboxes = document.querySelectorAll('input[name="calendar_ids[]"]:checked')
    if (calendarCheckboxes.length > 0) {
      return calendarCheckboxes[0].value
    }
    
    // If no calendars are selected, prioritize organization calendar, then personal, then first available
    const allCalendarCheckboxes = document.querySelectorAll('input[name="calendar_ids[]"]')
    if (allCalendarCheckboxes.length > 0) {
      // Look for organization calendar first
      for (let checkbox of allCalendarCheckboxes) {
        const label = checkbox.nextElementSibling
        if (label.textContent.includes('Org')) {
          return checkbox.value
        }
      }
      
      // Then look for personal calendar
      for (let checkbox of allCalendarCheckboxes) {
        const label = checkbox.nextElementSibling
        if (label.textContent.includes('Personal')) {
          return checkbox.value
        }
      }
      
      // Fallback to first available
      return allCalendarCheckboxes[0].value
    }
    return null
  }

  getOrganizationId() {
    // Extract organization ID from the current URL
    const urlParts = window.location.pathname.split('/')
    return urlParts[2] // /organizations/{id}/events
  }

  showNoCalendarsMessage() {
    // Show a toast or alert message
    const message = "No calendars available. Please create a calendar first."
    
    // Create a simple toast notification
    const toast = document.createElement('div')
    toast.className = 'alert alert-warning alert-dismissible fade show position-fixed'
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    
    document.body.appendChild(toast)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 5000)
  }

  // Handle calendar checkbox changes
  toggleCalendar(event) {
    const checkbox = event.target
    const label = checkbox.nextElementSibling
    
    if (checkbox.checked) {
      label.style.fontWeight = '600'
    } else {
      label.style.fontWeight = '400'
    }
  }

  // Update header colors based on selected calendar
  updateHeaderColors() {
    const selectedCalendars = this.getSelectedCalendars()
    
    if (selectedCalendars.length === 0) {
      // Reset to default colors if no calendars selected
      this.resetHeaderColors()
      return
    }
    
    if (this.hasHeaderCellTarget) {
      // Remove existing color classes from all cells
      this.headerCellTargets.forEach(cell => {
        cell.classList.remove('calendar-color-1', 'calendar-color-2', 'calendar-color-3', 
                             'calendar-color-4', 'calendar-color-5', 'calendar-color-6', 'calendar-color-7')
        cell.style.background = '' // Clear inline styles
      })
      
      // Create dynamic gradient based on selected calendars for the entire row
      const gradient = this.createMultiCalendarGradient(selectedCalendars)
      const headerRow = this.headerCellTargets[0]?.closest('.calendar-header-row')
      if (headerRow) {
        headerRow.style.background = gradient
      }
    }
  }

  // Create a gradient that combines all selected calendar colors
  createMultiCalendarGradient(calendars) {
    if (calendars.length === 1) {
      // Single calendar - use its color directly
      const color = this.getCalendarColorClass(calendars[0])
      return `linear-gradient(135deg, ${color} 0%, ${this.adjustColor(color, -20)} 100%)`
    }
    
    // Multiple calendars - create a gradient
    const colors = calendars.map(calendar => this.getCalendarColorClass(calendar))
    
    if (calendars.length === 2) {
      // Two calendars - create a diagonal gradient
      return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    } else if (calendars.length === 3) {
      // Three calendars - create a three-color gradient
      return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`
    } else {
      // More than 3 calendars - create a rainbow gradient
      const gradientStops = colors.map((color, index) => {
        const percentage = (index / (colors.length - 1)) * 100
        return `${color} ${percentage}%`
      }).join(', ')
      
      return `linear-gradient(135deg, ${gradientStops})`
    }
  }

  // Get the actual color value for a calendar
  getCalendarColorClass(calendar) {
    if (!calendar.color) return '#667eea'
    
    // Convert CSS color to hex if needed
    const color = this.parseColor(calendar.color)
    return color
  }

  // Parse CSS color to hex
  parseColor(color) {
    // If it's already a hex color, return it
    if (color.startsWith('#')) {
      return color
    }
    
    // If it's an rgb/rgba color, convert to hex
    if (color.startsWith('rgb')) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = color
      return ctx.fillStyle
    }
    
    // Default fallback colors based on the original color mapping
    const colorStr = color.toLowerCase()
    let hash = 0
    
    for (let i = 0; i < colorStr.length; i++) {
      const char = colorStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    const colorIndex = Math.abs(hash % 7)
    const defaultColors = [
      '#ff6b6b', // red
      '#4ecdc4', // teal
      '#45b7d1', // blue-green
      '#f093fb', // purple
      '#4facfe', // cyan
      '#43e97b', // green
      '#fa709a'  // pink
    ]
    
    return defaultColors[colorIndex]
  }

  // Adjust color brightness
  adjustColor(color, amount) {
    const hex = color.replace('#', '')
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount))
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // Get selected calendars
  getSelectedCalendars() {
    const selectedCheckboxes = document.querySelectorAll('input[name="calendar_ids[]"]:checked')
    return Array.from(selectedCheckboxes).map(checkbox => {
      const label = checkbox.nextElementSibling
      const colorIndicator = label.querySelector('.calendar-color-indicator')
      const color = colorIndicator ? colorIndicator.style.backgroundColor : null
      return {
        id: checkbox.value,
        name: label.querySelector('.calendar-name').textContent.trim(),
        color: color
      }
    })
  }

  // Reset header colors to default
  resetHeaderColors() {
    if (this.hasHeaderCellTarget) {
      this.headerCellTargets.forEach(cell => {
        cell.classList.remove('calendar-color-1', 'calendar-color-2', 'calendar-color-3', 
                             'calendar-color-4', 'calendar-color-5', 'calendar-color-6', 'calendar-color-7')
        cell.style.background = '' // Clear inline styles
      })
      
      // Reset header row background to default
      const headerRow = this.headerCellTargets[0]?.closest('.calendar-header-row')
      if (headerRow) {
        headerRow.style.background = ''
      }
    }
  }

  // Open event in sidebar modal
  openEventModal(event) {
    if (event.currentTarget.disabled) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const url = event.currentTarget.dataset?.url || event.currentTarget.href;
    console.log("Opening event modal for URL:", url);
    
    // Find the sidebar controller
    const sidebarElement = document.querySelector('[data-controller*="sidebar"]')
    console.log("Sidebar element found:", !!sidebarElement)
    
    if (sidebarElement) {
      const sidebarController = this.application.getControllerForElementAndIdentifier(sidebarElement, 'sidebar')
      console.log("Sidebar controller found:", !!sidebarController, "Sidebar ready:", this.sidebarReady)
      
      if (sidebarController && this.sidebarReady) {
        // Add turbo_stream format to the URL
        const separator = url.includes('?') ? '&' : '?'
        const sidebarUrl = `${url}${separator}format=turbo_stream`
        console.log("Loading content in sidebar:", sidebarUrl)
        console.log("Event details:", { url, sidebarUrl, sidebarController: !!sidebarController, sidebarReady: this.sidebarReady })
        console.log("About to load content in sidebar...")
        sidebarController.loadContent(sidebarUrl)
      } else {
        // If sidebar controller isn't ready, wait a bit and try again (max 10 attempts)
        if (!this.retryCount) this.retryCount = 0
        if (this.retryCount < 10) {
          this.retryCount++
          console.log(`Retrying... attempt ${this.retryCount}/10`)
          setTimeout(() => {
            this.openEventModal(event)
          }, 200)
        } else {
          // Fallback to regular navigation after max retries
          console.log("Max retries reached, falling back to regular navigation")
          this.retryCount = 0
          this.fallbackToRegularNavigation(url)
        }
      }
    } else {
      // If sidebar element isn't found, fallback to regular navigation
      console.log("Sidebar element not found, falling back to regular navigation")
      this.fallbackToRegularNavigation(url)
    }
  }
  
  // Fallback method for when sidebar is not available
  fallbackToRegularNavigation(url) {
    console.log("Falling back to regular navigation:", url)
    window.location.href = url
  }
  
  // Check if sidebar is available and ready
  isSidebarReady() {
    const sidebarElement = document.querySelector('[data-controller*="sidebar"]')
    if (!sidebarElement) return false
    
    const sidebarController = this.application.getControllerForElementAndIdentifier(sidebarElement, 'sidebar')
    return sidebarController && this.sidebarReady
  }
  
  // Show a custom error toast
  showError(message) {
    const toast = document.getElementById('custom-error-toast');
    if (toast) {
      toast.textContent = message;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
  }

  // Show a custom confirmation modal
  showConfirm(message, onConfirm) {
    const modal = document.getElementById('custom-confirm-modal');
    const msg = document.getElementById('custom-confirm-message');
    const okBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');
    if (!modal || !msg || !okBtn || !cancelBtn) return;

    msg.textContent = message;
    modal.style.display = 'flex';

    const cleanup = () => {
      modal.style.display = 'none';
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      onConfirm();
    };
    cancelBtn.onclick = cleanup;
  }

  // Show a global error alert at the top center of the page
  showGlobalError(message) {
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
        <h6 class="mb-2">Error</h6>
        <ul class="mb-0">
          <li><strong>${message}</strong></li>
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

  // Global success toast
  showGlobalSuccess(message) {
    // Remove any existing global alert
    const existingGlobalAlert = document.querySelector('.global-top-alert');
    if (existingGlobalAlert) existingGlobalAlert.remove();

    // Create global alert div
    const alertDiv = document.createElement('div');
    alertDiv.className = 'global-top-alert alert alert-success d-flex align-items-center justify-content-center position-fixed top-0 start-50 translate-middle-x';
    alertDiv.style.zIndex = '2000';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      <div>
        <h6 class="mb-2">Success</h6>
        <ul class="mb-0">
          <li><strong>${message}</strong></li>
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

  // Delete calendar with confirmation
  deleteCalendar(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const calendarId = button.dataset.calendarId;
    const calendarName = button.dataset.calendarName;
    
    const confirmMessage = `Are you sure you want to delete the calendar "${calendarName}"?\n\nThis will permanently delete ALL events on this calendar and cannot be undone.`;
    this.showConfirm(confirmMessage, () => {
      // Get the organization ID from the current URL
      const urlParts = window.location.pathname.split('/');
      const organizationId = urlParts[2]; // /organizations/:id/events
      
      // Create the delete URL
      const deleteUrl = `/organizations/${organizationId}/calendars/${calendarId}`;
      
      // Send DELETE request
      fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Accept': 'application/json'
        }
      })
      .then(response => {
        if (response.ok) {
          // Remove the calendar item from the DOM
          const calendarItem = button.closest('.calendar-item');
          if (calendarItem) calendarItem.remove();
        } else {
          throw new Error('Failed to delete calendar');
        }
      })
      .catch(error => {
        console.error('Error deleting calendar:', error);
        this.showGlobalError('Failed to delete calendar. Please try again.');
      });
    });
  }

  // Update view when calendar selection changes
  updateView(event) {
    // Update header colors before form submission
    this.updateHeaderColors()
    
    const form = event.target.closest('form')
    if (form) {
      form.requestSubmit()
    }
  }

  // Edit calendar in sidebar
  editCalendar(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const editUrl = button.dataset.calendarEditUrl;
    if (!editUrl) return;

    // Find the sidebar element
    const sidebarElement = document.querySelector('[data-controller*="sidebar"]');
    if (!sidebarElement) {
      this.showGlobalError('Sidebar not found.');
      return;
    }

    // Show loading spinner in sidebar
    const sidebarContent = sidebarElement.querySelector('[data-sidebar-target="content"]');
    if (sidebarContent) {
      sidebarContent.innerHTML = '<div class="d-flex justify-content-center align-items-center" style="height:200px;"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }

    // Try to use sidebar controller's loadContent if available
    const app = window.Stimulus && window.Stimulus.Application ? window.Stimulus.Application.start() : (this.application || window.application);
    let sidebarController = null;
    if (app && sidebarElement) {
      sidebarController = app.getControllerForElementAndIdentifier(sidebarElement, 'sidebar');
    }
    if (sidebarController && typeof sidebarController.loadContent === 'function') {
      sidebarController.loadContent(editUrl);
      return;
    }

    // Fallback: fetch and set innerHTML
    fetch(editUrl, { headers: { 'Accept': 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml' } })
      .then(response => {
        if (!response.ok) throw new Error('Failed to load edit form.');
        return response.text();
      })
      .then(html => {
        if (sidebarContent) sidebarContent.innerHTML = html;
      })
      .catch(error => {
        console.error('Error loading calendar edit form:', error);
        this.showGlobalError('Failed to load calendar edit form.');
      });
  }
}

document.addEventListener('turbo:submit-end', function(event) {
  if (event.detail.success && event.target.closest('.sidebar-body')) {
    // Close the sidebar
    const sidebar = document.querySelector('[data-controller*="sidebar"]');
    if (sidebar && sidebar.controller && typeof sidebar.controller.hide === 'function') {
      sidebar.controller.hide();
    } else if (sidebar) {
      sidebar.style.display = 'none';
    }
    // Show global success toast
    if (window.calendarController && typeof window.calendarController.showGlobalSuccess === 'function') {
      window.calendarController.showGlobalSuccess('Calendar was successfully updated!');
    } else if (typeof showGlobalSuccess === 'function') {
      showGlobalSuccess('Calendar was successfully updated!');
    }
  }
});

// Standalone fallback for showGlobalSuccess
function showGlobalSuccess(message) {
  const existingGlobalAlert = document.querySelector('.global-top-alert');
  if (existingGlobalAlert) existingGlobalAlert.remove();
  const alertDiv = document.createElement('div');
  alertDiv.className = 'global-top-alert alert alert-success d-flex align-items-center justify-content-center position-fixed top-0 start-50 translate-middle-x';
  alertDiv.style.zIndex = '2000';
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    <div>
      <h6 class="mb-2">Success</h6>
      <ul class="mb-0">
        <li><strong>${message}</strong></li>
      </ul>
    </div>
    <button type="button" class="btn-close ms-3" aria-label="Close"></button>
  `;
  alertDiv.querySelector('.btn-close').addEventListener('click', () => {
    alertDiv.remove();
  });
  document.body.appendChild(alertDiv);
  window.scrollTo({ top: 0, behavior: 'smooth' });
} 