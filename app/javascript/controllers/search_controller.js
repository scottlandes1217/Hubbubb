import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "results", "resultsList", "loading"]
  static values = { 
    organizationId: Number,
    searchUrl: String
  }

  connect() {
    this.debounceTimer = null
    this.selectedIndex = -1
    this.results = []
    this.isSearching = false
    this.keyboardSelected = false
    
    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside.bind(this))
  }

  disconnect() {
    document.removeEventListener('click', this.handleClickOutside.bind(this))
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  performSearch() {
    const query = this.inputTarget.value.trim()
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    if (query.length < 2) {
      this.hideResults()
      return
    }

    this.debounceTimer = setTimeout(() => {
      this.executeSearch(query)
    }, 300)
  }

  async executeSearch(query) {
    if (this.isSearching) return
    
    this.isSearching = true
    this.showLoading()
    this.hideResults()

    try {
      const response = await fetch(`${this.searchUrlValue}?q=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.results = data.results || []
        this.displayResults()
      } else {
        console.error('Search request failed')
        this.results = []
      }
    } catch (error) {
      console.error('Search error:', error)
      this.results = []
    } finally {
      this.hideLoading()
      this.isSearching = false
    }
  }

  displayResults() {
    if (this.results.length === 0) {
      this.hideResults()
      return
    }

    const resultsHtml = this.results.map((result, index) => `
      <div class="search-result-item ${index === this.selectedIndex ? 'selected' : ''}" 
           data-search-index="${index}"
           data-action="click->search#selectResult mouseenter->search#hoverResult">
        <div class="search-result-icon">
          <i class="${result.icon}"></i>
        </div>
        <div class="search-result-content">
          <div class="search-result-title">${this.escapeHtml(result.title)}</div>
          <div class="search-result-subtitle">${this.escapeHtml(result.subtitle)}</div>
        </div>
        ${result.recent ? '<div class="search-result-badge">Recent</div>' : ''}
      </div>
    `).join('')

    this.resultsListTarget.innerHTML = resultsHtml
    this.showResults()
  }

  selectResult(event) {
    const index = parseInt(event.currentTarget.dataset.searchIndex)
    const result = this.results[index]
    
    if (result && result.url) {
      window.location.href = result.url
    }
  }

  hoverResult(event) {
    const index = parseInt(event.currentTarget.dataset.searchIndex)
    this.selectedIndex = index
    this.keyboardSelected = false
    this.updateSelectedResult()
  }

  updateSelectedResult() {
    const items = this.resultsListTarget.querySelectorAll('.search-result-item')
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex)
    })
  }

  handleKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1)
        this.keyboardSelected = true
        this.updateSelectedResult()
        break
      
      case 'ArrowUp':
        event.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
        this.keyboardSelected = true
        this.updateSelectedResult()
        break
      
      case 'Enter':
        event.preventDefault()
        if (this.keyboardSelected && this.selectedIndex > -1 && this.results[this.selectedIndex]) {
          const result = this.results[this.selectedIndex]
          if (result.url) {
            window.location.href = result.url
          }
        } else {
          this.showFullSearch()
        }
        break
      
      case 'Escape':
        this.hideResults()
        this.inputTarget.blur()
        break
    }
  }

  showFullSearch() {
    const query = this.inputTarget.value.trim()
    if (query) {
      let searchUrl
      if (this.hasOrganizationIdValue && this.organizationIdValue) {
        searchUrl = `/organizations/${this.organizationIdValue}/search?q=${encodeURIComponent(query)}`
      } else {
        searchUrl = `/admin/search?q=${encodeURIComponent(query)}`
      }
      window.location.href = searchUrl
    }
  }

  showResults() {
    this.resultsTarget.style.display = 'block'
  }

  hideResults() {
    this.resultsTarget.style.display = 'none'
    this.selectedIndex = -1
  }

  showLoading() {
    this.loadingTarget.style.display = 'block'
  }

  hideLoading() {
    this.loadingTarget.style.display = 'none'
  }

  handleClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.hideResults()
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
} 