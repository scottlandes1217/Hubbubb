import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    objectType: String,
    objectId: Number,
    organizationId: Number
  }
  
  static targets = ["viewSelector", "viewList", "viewSearch", "searchForm", "searchInput"]

  connect() {
    console.log("List view controller connected", this.element)
    this.closeViewSelectorOnClickOutside = this.closeViewSelectorOnClickOutside.bind(this)
  }

  disconnect() {
    document.removeEventListener('click', this.closeViewSelectorOnClickOutside)
  }

  showViewSelector(event) {
    event.stopPropagation()
    const selector = this.viewSelectorTarget
    
    if (selector.style.display === 'none') {
      selector.style.display = 'block'
      this.loadViews()
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', this.closeViewSelectorOnClickOutside)
      }, 100)
    } else {
      this.hideViewSelector()
    }
  }

  hideViewSelector() {
    this.viewSelectorTarget.style.display = 'none'
    document.removeEventListener('click', this.closeViewSelectorOnClickOutside)
  }

  closeViewSelectorOnClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.hideViewSelector()
    }
  }

  async loadViews() {
    const url = `/organizations/${this.organizationIdValue}/list_views?object_type=${this.objectTypeValue}&object_id=${this.objectIdValue || ''}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        this.renderViews(data.views || [])
      }
    } catch (error) {
      console.error('Failed to load views:', error)
      this.viewListTarget.innerHTML = '<div class="p-3 text-muted">Failed to load views</div>'
    }
  }

  renderViews(views) {
    const list = this.viewListTarget
    const searchTerm = this.viewSearchTarget.value.toLowerCase()
    
    const filteredViews = views.filter(view => 
      view.name.toLowerCase().includes(searchTerm)
    )
    
    if (filteredViews.length === 0) {
      list.innerHTML = '<div class="p-3 text-muted">No views found</div>'
      return
    }
    
    list.innerHTML = filteredViews.map(view => `
      <div class="list-group-item list-group-item-action" 
           data-action="click->list-view#selectView"
           data-view-id="${view.id}"
           data-view-name="${view.name}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${view.name}</strong>
            ${view.is_default ? '<span class="badge bg-primary ms-2">Default</span>' : ''}
            ${view.is_public ? '<span class="badge bg-success ms-2">Public</span>' : ''}
          </div>
          <div class="btn-group btn-group-sm">
            <a href="/organizations/${this.organizationIdValue}/list_views/${view.id}/edit" 
               class="btn btn-outline-secondary btn-sm"
               onclick="event.stopPropagation()">
              <i class="fas fa-edit"></i>
            </a>
          </div>
        </div>
      </div>
    `).join('')
  }

  filterViews() {
    // Re-render views with current search term
    this.loadViews()
  }

  selectView(event) {
    const viewId = event.currentTarget.dataset.viewId
    const viewName = event.currentTarget.dataset.viewName
    
    // Update the title
    const titleElement = this.element.querySelector('.list-view-title')
    if (titleElement) {
      titleElement.innerHTML = `${viewName} <i class="fas fa-chevron-down ms-2"></i>`
    }
    
    // Reload the page with the view parameter
    const url = new URL(window.location.href)
    url.searchParams.set('view_id', viewId)
    window.location.href = url.toString()
  }
}

