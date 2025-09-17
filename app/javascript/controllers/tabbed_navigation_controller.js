import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"

export default class extends Controller {
  static targets = ["tabsContainer"]
  
  connect() {
    console.log("TabbedNavigationController connected");
    this.tabs = [];
    this.pinnedPetIds = new Set();
    this.pinnedTaskIds = new Set();
    
    this.initializeFromServerRenderedTabs();
    this.restoreUnpinnedTab();
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.debouncedUpdateOverflowedTabsList = this.debounce(this.updateOverflowedTabsList, 40);
    this.updateOverflowedTabsList();
    window.addEventListener('resize', this.debouncedUpdateOverflowedTabsList.bind(this));
  }
  
  disconnect() {
    console.log("TabbedNavigationController disconnected");
    this.removeEventListeners();
    this.removeDragAndDrop();
  }
  
  setupEventListeners() {
    this.handlePetOpened = this.handlePetOpened.bind(this);
    this.handlePetUnpinned = this.handlePetUnpinned.bind(this);
    this.handleTaskOpened = this.handleTaskOpened.bind(this);
    this.handleTaskUnpinned = this.handleTaskUnpinned.bind(this);
    this.handleUnpinAllTabs = this.unpinAllTabs.bind(this);
    
    window.addEventListener('pet:opened', this.handlePetOpened);
    window.addEventListener('pet:unpinned', this.handlePetUnpinned);
    window.addEventListener('task:opened', this.handleTaskOpened);
    window.addEventListener('task:unpinned', this.handleTaskUnpinned);
    document.addEventListener('unpinAllTabs', this.handleUnpinAllTabs);
  }
  
  removeEventListeners() {
    window.removeEventListener('pet:opened', this.handlePetOpened);
    window.removeEventListener('pet:unpinned', this.handlePetUnpinned);
    window.removeEventListener('task:opened', this.handleTaskOpened);
    window.removeEventListener('task:unpinned', this.handleTaskUnpinned);
    document.removeEventListener('unpinAllTabs', this.handleUnpinAllTabs);
  }
  
  initializeFromServerRenderedTabs() {
    // Get all existing tabs from the DOM (server-rendered pinned tabs)
    // Use Array.from to ensure we get them in DOM order
    const existingTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    this.tabs = [];
    existingTabs.forEach(tabElement => {
      const tabData = {
        id: tabElement.dataset.tabId || null,
        tabable_id: tabElement.dataset.recordId || null,
        title: tabElement.querySelector('.nav-tab-title').textContent,
        url: tabElement.dataset.tabUrl,
        tab_type: tabElement.dataset.tabType,
        position: tabElement.dataset.position !== undefined && tabElement.dataset.position !== '' ? parseInt(tabElement.dataset.position) : null
      };
      this.tabs.push(tabData);
      if (tabData.tab_type === 'pet' && tabData.tabable_id) {
        this.pinnedPetIds.add(String(tabData.tabable_id));
      } else if (tabData.tab_type === 'task' && tabData.tabable_id) {
        this.pinnedTaskIds.add(String(tabData.tabable_id));
      }
    });
    // Tabs should already be in the correct order from the database (ordered scope)
    // But let's add some debugging to see what order they're in
    console.log('Tabs loaded from server:', this.tabs.map(t => ({ id: t.id, title: t.title, tab_type: t.tab_type, position: t.position })));
    console.log('Tab order in DOM:', Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab')).map(t => ({ 
      id: t.dataset.tabId, 
      title: t.querySelector('.nav-tab-title').textContent, 
      type: t.dataset.tabType 
    })));
    
    // Let's also check the actual DOM order by looking at the children
    console.log('DOM children order:', Array.from(this.tabsContainerTarget.children).map(child => {
      if (child.classList.contains('nav-tab')) {
        return {
          id: child.dataset.tabId,
          title: child.querySelector('.nav-tab-title').textContent,
          type: child.dataset.tabType
        };
      }
      return null;
    }).filter(Boolean));
    
    // Don't re-render the tabs - they're already in the correct order from the server
    // Just add the necessary event listeners to the existing DOM elements
    existingTabs.forEach(tabElement => {
      tabElement.draggable = true;
      tabElement.addEventListener('dragstart', this.handleDragStart);
      tabElement.addEventListener('dragover', this.handleDragOver);
      tabElement.addEventListener('drop', this.handleDrop);
      tabElement.addEventListener('dragend', this.handleDragEnd);
    });
    
    console.log(`Initialized with ${this.tabs.length} server-rendered pinned tabs`);
  }
  
  restoreUnpinnedTab() {
    // Restore unpinned pet tab
    const petContainer = document.querySelector('[data-controller~="pet"]');
    const unpinnedPetTab = sessionStorage.getItem('currentUnpinnedPetTab');
    
    if (petContainer && unpinnedPetTab) {
      try {
        const { petId, petName, petUrl } = JSON.parse(unpinnedPetTab);
        console.log(`Restoring unpinned tab for pet: ${petName} (ID: ${petId})`);
        
        // Check if this pet is already pinned
        if (this.pinnedPetIds.has(String(petId))) {
          console.log(`Pet ${petId} is already pinned, not restoring as unpinned tab`);
          return;
        }
        
        // Check if tab already exists
        let existingTab = this.tabsContainerTarget.querySelector(`[data-record-id="${petId}"][data-tab-type="pet"]`);
        if (existingTab) {
          console.log(`Tab for pet ${petId} already exists, making it active`);
          this.makeTabActive(existingTab);
          return;
        }
        
        // Add the unpinned tab
        const tabData = {
          id: null,
          tabable_id: petId,
          title: petName,
          url: petUrl,
          tab_type: 'pet'
        };
        this.tabs.push(tabData);
        const tabElement = this.createTabElement(tabData);
        this.insertTabAtCorrectPosition(tabElement, tabData);
        this.makeTabActive(tabElement);
        console.log(`Successfully restored unpinned tab for pet: ${petName}`);
      } catch (error) {
        console.error('Error restoring unpinned pet tab:', error);
        sessionStorage.removeItem('currentUnpinnedPetTab');
      }
    }

    // Restore unpinned task tab
    const taskContainer = document.querySelector('[data-controller~="task"]');
    const unpinnedTaskTab = sessionStorage.getItem('currentUnpinnedTaskTab');
    
    if (taskContainer && unpinnedTaskTab) {
      try {
        const { taskId, taskSubject, taskUrl } = JSON.parse(unpinnedTaskTab);
        // Only restore if the current page is for this task
        if (String(taskContainer.dataset.taskId) !== String(taskId)) {
          // If not the same task, clear sessionStorage and do not restore
          sessionStorage.removeItem('currentUnpinnedTaskTab');
          return;
        }
        console.log(`Restoring unpinned tab for task: ${taskSubject} (ID: ${taskId})`);
        
        // Check if this task is already pinned or a pinned tab exists in DOM
        const isPinned = this.pinnedTaskIds.has(String(taskId));
        const existingPinnedTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"][data-tab-id]`);
        if (isPinned || existingPinnedTab) {
          console.log(`Task ${taskId} is already pinned, not restoring as unpinned tab`);
          if (existingPinnedTab) {
            this.makeTabActive(existingPinnedTab);
          }
          return;
        }
        
        // Add the unpinned tab
        const tabData = {
          id: null,
          tabable_id: taskId,
          title: taskSubject,
          url: taskUrl,
          tab_type: 'task'
        };
        this.tabs.push(tabData);
        const tabElement = this.createTabElement(tabData);
        
        // Insert at the correct position based on saved order
        this.insertTabAtCorrectPosition(tabElement, tabData);
        this.makeTabActive(tabElement);
        console.log(`Successfully restored unpinned tab for task: ${taskSubject}`);
      } catch (error) {
        console.error('Error restoring unpinned task tab:', error);
        sessionStorage.removeItem('currentUnpinnedTaskTab');
      }
    }
  }
  
  renderTabs() {
    // Only render tabs that aren't already in the DOM (unpinned tabs)
    const existingTabIds = new Set();
    this.tabsContainerTarget.querySelectorAll('.nav-tab').forEach(tab => {
      const tabId = tab.dataset.tabId || tab.dataset.petId;
      if (tabId) existingTabIds.add(tabId);
    });
    
    this.tabs.forEach(tab => {
      const tabId = tab.id || tab.tabable_id;
      if (!existingTabIds.has(String(tabId))) {
        this.tabsContainerTarget.appendChild(this.createTabElement(tab));
      }
    });
  }
  
  createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'nav-tab';
    tabDiv.draggable = true;
    tabDiv.dataset.tabId = tab.id || '';
    tabDiv.dataset.tabType = tab.tab_type;
    tabDiv.dataset.tabUrl = tab.url;
    
    // Use a generic recordId attribute for all tab types
    tabDiv.dataset.recordId = tab.tabable_id || '';
    
    let isActive = false;
    try {
      isActive = window.location.pathname === new URL(tab.url, window.location.origin).pathname;
    } catch (e) {
      isActive = window.location.pathname === tab.url;
    }
    
    const isPinned = tab.tab_type === 'pet' 
      ? this.pinnedPetIds.has(String(tab.tabable_id))
      : this.pinnedTaskIds.has(String(tab.tabable_id));
    
    // Choose icon based on tab type
    const icon = tab.tab_type === 'pet' ? 'fas fa-paw' : 'fas fa-tasks';
    
    tabDiv.innerHTML = `
      <div class="nav-tab-content ${isActive ? 'active' : ''}" data-action="click->tabbed-navigation#switchToTab">
        <i class="${icon} me-2"></i>
        <span class="nav-tab-title">${tab.title}</span>
        <div class="nav-tab-actions">
          ${isPinned
            ? `<button class="nav-tab-close" data-action="click->tabbed-navigation#unpinAndClose" title="Unpin and close tab" onclick="event.stopPropagation()"><i class="fas fa-times"></i></button>`
            : `<button class="nav-tab-pin" data-action="click->tabbed-navigation#pinTab" title="Pin tab" onclick="event.stopPropagation()"><i class="fas fa-thumbtack"></i></button>`
          }
        </div>
      </div>
    `;
    // Attach drag event listeners only to tabDiv
    tabDiv.addEventListener('dragstart', this.handleDragStart);
    tabDiv.addEventListener('dragover', this.handleDragOver);
    tabDiv.addEventListener('drop', this.handleDrop);
    tabDiv.addEventListener('dragend', this.handleDragEnd);
    return tabDiv;
  }
  
  switchToTab(event) {
    event.preventDefault();
    const tab = event.currentTarget.closest('.nav-tab');
    if (!tab) return;
    const url = tab.dataset.tabUrl;
    if (url) {
      // Use Turbo navigation for fast tab switching
      Turbo.visit(url);
    }
  }
  
  async pinTab(event) {
    event.stopPropagation();
    const tabElement = event.currentTarget.closest('.nav-tab');
    const tabType = tabElement.dataset.tabType;
    
    if (tabType === 'pet') {
      const petId = tabElement.dataset.recordId;
      if (!petId) return;
      
      console.log(`Pinning tab for pet: ${petId}`);
      
      await fetch('/pinned_tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ pet_id: petId })
      });
      
      this.pinnedPetIds.add(petId);
      
      // Remove from sessionStorage if present
      const unpinnedTab = sessionStorage.getItem('currentUnpinnedPetTab');
      if (unpinnedTab) {
        const { petId: storedId } = JSON.parse(unpinnedTab);
        if (String(storedId) === String(petId)) {
          sessionStorage.removeItem('currentUnpinnedPetTab');
          console.log(`Removed pet ${petId} from sessionStorage after pinning`);
        }
      }
      
      // Re-render the tab as pinned (with X icon)
      const tabData = this.tabs.find(t => String(t.tabable_id) === String(petId) && t.tab_type === 'pet');
      if (tabData) {
        const newTab = this.createTabElement(tabData);
        tabElement.replaceWith(newTab);
        this.makeTabActive(newTab);
        console.log(`Tab for pet ${petId} is now pinned`);
      }
    } else if (tabType === 'task') {
      const taskId = tabElement.dataset.recordId;
      if (!taskId) return;
      
      console.log(`Pinning tab for task: ${taskId}`);
      
      // Add to pinned task IDs and save to database
      this.pinnedTaskIds.add(taskId);
      await this.savePinnedTaskTabToDatabase(taskId);
      
      // Remove from sessionStorage if present
      const unpinnedTab = sessionStorage.getItem('currentUnpinnedTaskTab');
      if (unpinnedTab) {
        const { taskId: storedId } = JSON.parse(unpinnedTab);
        if (String(storedId) === String(taskId)) {
          sessionStorage.removeItem('currentUnpinnedTaskTab');
          console.log(`Removed task ${taskId} from sessionStorage after pinning`);
        }
      }
      
      // Re-render the tab as pinned (with X icon)
      const tabData = this.tabs.find(t => String(t.tabable_id) === String(taskId) && t.tab_type === 'task');
      if (tabData) {
        const newTab = this.createTabElement(tabData);
        tabElement.replaceWith(newTab);
        this.makeTabActive(newTab);
        console.log(`Tab for task ${taskId} is now pinned`);
      }
    }
  }
  
  async unpinAndClose(event) {
    event.stopPropagation();
    const tabElement = event.currentTarget.closest('.nav-tab');
    const tabType = tabElement.dataset.tabType;
    const tabId = tabElement.dataset.tabId;
    
    if (tabType === 'pet') {
      const petId = tabElement.dataset.recordId;
      console.log(`Unpinning and closing tab for pet: ${petId}`);
      
      // Check if we're currently on this pet's page
      const petContainer = document.querySelector('[data-controller~="pet"]');
      const currentPetId = petContainer ? petContainer.dataset.petId : null;
      const isOnCurrentPetPage = currentPetId && String(currentPetId) === String(petId);
      
      // Find the next tab to switch to (tab to the right)
      const allTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
      const currentTabIndex = allTabs.indexOf(tabElement);
      const nextTab = allTabs[currentTabIndex + 1];
      const previousTab = allTabs[currentTabIndex - 1];
      
      if (petId) {
        await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedPetIds.delete(petId);
        
        // Remove from sessionStorage if present
        const unpinnedTab = sessionStorage.getItem('currentUnpinnedPetTab');
        if (unpinnedTab) {
          const { petId: storedId } = JSON.parse(unpinnedTab);
          if (String(storedId) === String(petId)) {
            sessionStorage.removeItem('currentUnpinnedPetTab');
            console.log(`Removed pet ${petId} from sessionStorage after unpinning`);
          }
        }
      }
      
      if (isOnCurrentPetPage) {
        // If we're on the current pet's page, close the tab and navigate
        console.log(`On current pet page, closing tab for pet ${petId}`);
        
        // Remove the tab from DOM and tabs array
        tabElement.remove();
        this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(petId));
        
        // Save the new tab order
        this.saveTabOrder();
        
        // Navigate to next tab or main navigation
        if (nextTab) {
          // Switch to the tab to the right
          const nextUrl = nextTab.dataset.tabUrl;
          console.log(`Switching to next tab: ${nextUrl}`);
          Turbo.visit(nextUrl);
        } else if (previousTab) {
          // Switch to the tab to the left if no tab to the right
          const prevUrl = previousTab.dataset.tabUrl;
          console.log(`Switching to previous tab: ${prevUrl}`);
          Turbo.visit(prevUrl);
        } else {
          // No more tabs, go to main navigation (pets index)
          console.log('No more tabs, navigating to pets index');
          const organizationId = window.location.pathname.split('/')[2]; // Extract org ID from URL
          Turbo.visit(`/organizations/${organizationId}/pets`);
        }
      } else {
        // If we're not on the pet's page, just remove the tab
        console.log(`Not on current pet page, removing tab for pet ${petId}`);
        tabElement.remove();
        // Remove from tabs array
        this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(petId));
        console.log(`Tab for pet ${petId} has been removed`);
        
        // Save the new tab order
        this.saveTabOrder();
      }
      
      // Notify pets index to update pin button
      window.dispatchEvent(new CustomEvent('pet:unpinned_ui', { detail: { petId } }));
      console.log('[DEBUG] pet:unpinned_ui event dispatched for petId', petId);
    } else if (tabType === 'task') {
      const taskId = tabElement.dataset.recordId;
      console.log(`Unpinning and closing tab for task: ${taskId}`);
      
      // Check if we're currently on this task's page
      const taskContainer = document.querySelector('[data-controller~="task"]');
      const currentTaskId = taskContainer ? taskContainer.dataset.taskId : null;
      const isOnCurrentTaskPage = currentTaskId && String(currentTaskId) === String(taskId);
      
      // Find the next tab to switch to (tab to the right)
      const allTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
      const currentTabIndex = allTabs.indexOf(tabElement);
      const nextTab = allTabs[currentTabIndex + 1];
      const previousTab = allTabs[currentTabIndex - 1];
      
      if (taskId) {
        await fetch(`/pinned_tabs/unpin_task?task_id=${taskId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedTaskIds.delete(taskId);
        
        // Remove from sessionStorage if present
        const unpinnedTab = sessionStorage.getItem('currentUnpinnedTaskTab');
        if (unpinnedTab) {
          const { taskId: storedId } = JSON.parse(unpinnedTab);
          if (String(storedId) === String(taskId)) {
            sessionStorage.removeItem('currentUnpinnedTaskTab');
            console.log(`Removed task ${taskId} from sessionStorage after unpinning`);
          }
        }
      }
      
      if (isOnCurrentTaskPage) {
        // If we're on the current task's page, close the tab and navigate
        console.log(`On current task page, closing tab for task ${taskId}`);
        
        // Remove the tab from DOM and tabs array
        tabElement.remove();
        this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(taskId));
        
        // Save the new tab order
        this.saveTabOrder();
        
        // Navigate to next tab or main navigation
        if (nextTab) {
          // Switch to the tab to the right
          const nextUrl = nextTab.dataset.tabUrl;
          console.log(`Switching to next tab: ${nextUrl}`);
          Turbo.visit(nextUrl);
        } else if (previousTab) {
          // Switch to the tab to the left if no tab to the right
          const prevUrl = previousTab.dataset.tabUrl;
          console.log(`Switching to previous tab: ${prevUrl}`);
          Turbo.visit(prevUrl);
        } else {
          // No more tabs, go to main navigation (tasks index)
          console.log('No more tabs, navigating to tasks index');
          const organizationId = window.location.pathname.split('/')[2]; // Extract org ID from URL
          Turbo.visit(`/organizations/${organizationId}/tasks`);
        }
      } else {
        // If we're not on the task's page, just remove the tab
        console.log(`Not on current task page, removing tab for task ${taskId}`);
        tabElement.remove();
        // Remove from tabs array
        this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(taskId));
        console.log(`Tab for task ${taskId} has been removed`);
        
        // Save the new tab order
        this.saveTabOrder();
      }
      
      // Notify tasks index to update pin button
      window.dispatchEvent(new CustomEvent('task:unpinned_ui', { detail: { taskId } }));
      console.log('[DEBUG] task:unpinned_ui event dispatched for taskId', taskId);
    }
  }
  
  closeAllTabs() {
    console.log('Closing all tabs');
    const tabs = this.tabsContainerTarget.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const closeButton = tab.querySelector('.nav-tab-close');
      if (closeButton) closeButton.click();
    });
  }
  
  handlePetOpened(event) {
    const { petId, petName, petUrl, fromPinButton } = event.detail;
    // Guard: Only create a new tab if one does not already exist (using generic recordId and tabType)
    let existingTab = this.tabsContainerTarget.querySelector(`[data-record-id="${petId}"][data-tab-type="pet"]`);
    if (existingTab) {
      console.log(`Tab for pet ${petId} already exists, making it active`);
      this.makeTabActive(existingTab);
      return;
    }

    // Check if this pet is already pinned
    if (this.pinnedPetIds.has(String(petId))) {
      console.log(`Pet ${petId} is already pinned, not creating duplicate tab`);
      return;
    }

    if (fromPinButton) {
      // Create pinned tab
      console.log(`Creating pinned tab for pet: ${petName} (ID: ${petId})`);

      // Add new tab as pinned
      const tabData = {
        id: null,
        tabable_id: petId,
        title: petName,
        url: petUrl,
        tab_type: 'pet'
      };
      this.tabs.push(tabData);
      
      // Add to pinnedPetIds immediately
      this.pinnedPetIds.add(String(petId));
      
      const tabElement = this.createTabElement(tabData);
      this.insertTabAtCorrectPosition(tabElement, tabData);
      this.makeTabActive(tabElement);
      console.log(`Created pinned tab for pet: ${petName} (ID: ${petId})`);

      // Save to database
      this.savePinnedTabToDatabase(petId);
    } else {
      // Create unpinned tab
      console.log(`Creating unpinned tab for pet: ${petName} (ID: ${petId})`);

      // Add new tab as unpinned
      const tabData = {
        id: null,
        tabable_id: petId,
        title: petName,
        url: petUrl,
        tab_type: 'pet'
      };
      this.tabs.push(tabData);
      
      const tabElement = this.createTabElement(tabData);
      this.insertTabAtCorrectPosition(tabElement, tabData);
      this.makeTabActive(tabElement);
      console.log(`Created unpinned tab for pet: ${petName} (ID: ${petId})`);

      // Store in sessionStorage for unpinned tabs
      sessionStorage.setItem('currentUnpinnedPetTab', JSON.stringify({
        petId: petId,
        petName: petName,
        petUrl: petUrl
      }));
    }
    
    // Save tab order after creating new tab
    this.saveTabOrder();
  }

  async savePinnedTabToDatabase(petId) {
    try {
      await fetch('/pinned_tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ pet_id: petId })
      });
      console.log(`Saved pinned tab for pet ${petId} to database`);
      
      // Notify pets index to update pin button
      window.dispatchEvent(new CustomEvent('pet:pinned', { detail: { petId } }));
    } catch (error) {
      console.error(`Failed to save pinned tab for pet ${petId}:`, error);
      // Remove from pinnedPetIds if save failed
      this.pinnedPetIds.delete(String(petId));
    }
  }

  async savePinnedTaskTabToDatabase(taskId) {
    try {
      await fetch('/pinned_tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ task_id: taskId })
      });
      console.log(`Saved pinned tab for task ${taskId} to database`);
      
      // Notify tasks index to update pin button
      window.dispatchEvent(new CustomEvent('task:pinned', { detail: { taskId } }));
    } catch (error) {
      console.error(`Failed to save pinned tab for task ${taskId}:`, error);
      // Remove from pinnedTaskIds if save failed
      this.pinnedTaskIds.delete(String(taskId));
    }
  }

  handlePetUnpinned(event) {
    const { petId } = event.detail;
    this.pinnedPetIds.delete(String(petId));
    // Remove the tab if present
    let tab = this.tabsContainerTarget.querySelector(`[data-record-id="${petId}"][data-tab-type="pet"]`);
    if (tab) tab.remove();
    this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(petId));
    // Notify pets index to update pin button
    window.dispatchEvent(new CustomEvent('pet:unpinned_ui', { detail: { petId } }));
    
    // Save tab order after removing tab
    this.saveTabOrder();
  }

  handleTaskOpened(event) {
    // Always clear any unpinned task tab from sessionStorage when a new task is opened
    sessionStorage.removeItem('currentUnpinnedTaskTab');
    const { taskId, taskSubject, taskUrl, fromPinButton } = event.detail;
    console.log(`Task opened: ${taskSubject} (ID: ${taskId})`);
    console.log("Current tabs:", this.tabs);
    console.log("Pinned task IDs:", this.pinnedTaskIds);
    console.log("All pinned tab IDs from DOM:", Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab[data-tab-id]')).map(t => ({ id: t.dataset.tabId, recordId: t.dataset.recordId, type: t.dataset.tabType })));
    
    // Check if this task is already pinned or a pinned tab exists in DOM
    const isPinned = this.pinnedTaskIds.has(String(taskId));
    const existingPinnedTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"][data-tab-id]`);
    if (isPinned || existingPinnedTab) {
      console.log(`Task ${taskId} is already pinned, making it active`);
      const existingTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"]`);
      if (existingTab) {
        this.makeTabActive(existingTab);
      }
      return;
    }
    
    // Check if tab already exists (using generic recordId and tabType)
    let existingTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"]`);
    console.log("Looking for existing task tab with ID:", taskId);
    console.log("All existing tabs:", this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    console.log("Existing task tab found:", existingTab);
    
    if (existingTab) {
      console.log(`Tab for task ${taskId} already exists, making it active`);
      this.makeTabActive(existingTab);
      return;
    }
    
    // Add the task tab
    const tabData = {
      id: null,
      tabable_id: taskId,
      title: taskSubject,
      url: taskUrl,
      tab_type: 'task'
    };
    this.tabs.push(tabData);
    const tabElement = this.createTabElement(tabData);
    
    // Insert at the correct position based on saved order
    this.insertTabAtCorrectPosition(tabElement, tabData);
    this.makeTabActive(tabElement);
    
    // Store in sessionStorage for restoration
    if (!fromPinButton) {
      sessionStorage.setItem('currentUnpinnedTaskTab', JSON.stringify({
        taskId: taskId,
        taskSubject: taskSubject,
        taskUrl: taskUrl
      }));
    }
    
    console.log(`Successfully added task tab for: ${taskSubject}`);
  }

  handleTaskUnpinned(event) {
    const { taskId } = event.detail;
    this.pinnedTaskIds.delete(String(taskId));
    // Remove the tab if present
    let tab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"]`);
    if (tab) tab.remove();
    this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(taskId));
    
    // Save tab order after removing tab
    this.saveTabOrder();
  }

  makeTabActive(tabElement) {
    this.tabsContainerTarget.querySelectorAll('.nav-tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    const tabContent = tabElement.querySelector('.nav-tab-content');
    if (tabContent) {
      tabContent.classList.add('active');
    }
  }
  
  insertTabAtCorrectPosition(tabElement, tabData) {
    // Check if this tab is already pinned (has a tabId)
    const isPinned = tabData.id !== null;
    
    if (isPinned) {
      console.log(`Tab "${tabData.title}" is pinned, should already be in correct position from server`);
      // For pinned tabs, they should already be rendered by the server in the correct order
      // Don't add them again - just return
      return;
    }
    
    // For unpinned tabs, append to the end since they don't have saved positions
    // When a tab is pinned, it will be re-rendered by the server in the correct order
    this.tabsContainerTarget.appendChild(tabElement);
    
    console.log(`Inserted unpinned tab "${tabData.title}" at the end`);
  }
  
  async unpinAllTabs(event) {
    // Handle both regular events and custom events
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    console.log("Unpin all tabs clicked");
    
    // Find the active tab by checking current URL against tab URLs
    let activeTab = null;
    const currentPath = window.location.pathname;
    const tabElements = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    
    tabElements.forEach(tab => {
      const tabUrl = tab.dataset.tabUrl;
      if (tabUrl) {
        let isActive = false;
        try {
          isActive = currentPath === new URL(tabUrl, window.location.origin).pathname;
        } catch (e) {
          isActive = currentPath === tabUrl;
        }
        
        if (isActive) {
          activeTab = tab;
          console.log("Found active tab:", tab.dataset.recordId, tab.dataset.tabType, "URL:", tabUrl);
        }
      }
    });
    
    const activeTabId = activeTab ? activeTab.dataset.tabId : null;
    const activeTabType = activeTab ? activeTab.dataset.tabType : null;
    const activeTabRecordId = activeTab ? activeTab.dataset.recordId : null;
    
    console.log("Active tab info:", { activeTabId, activeTabType, activeTabRecordId });

    // Handle all pet tabs (both pinned and unpinned) except the active one
    const allPetTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab[data-tab-type="pet"]'));
    console.log("Processing all pet tabs:", allPetTabs.map(t => ({ id: t.dataset.recordId, isPinned: t.dataset.tabId, url: t.dataset.tabUrl })));
    console.log("Current path:", currentPath);
    console.log("Active tab info:", { activeTabId, activeTabType, activeTabRecordId });
    
    for (const tabElement of allPetTabs) {
      const petId = tabElement.dataset.recordId;
      const isPinned = tabElement.dataset.tabId; // If tabId exists, it's pinned
      
      console.log(`Processing pet tab ${petId}, isPinned: ${!!isPinned}, active tab is pet ${activeTabRecordId}`);
      
      // If this is the active tab, keep it open (unpin if it was pinned)
      if (activeTabType === 'pet' && String(activeTabRecordId) === String(petId)) {
        console.log(`Keeping active pet tab ${petId} open`);
        if (isPinned) {
          console.log(`Unpinning active pet tab ${petId} (keeping it open)`);
          await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          this.pinnedPetIds.delete(petId);
          // Remove id from tab data so it's treated as unpinned
          tabElement.dataset.tabId = '';
          this.tabs = this.tabs.map(t => {
            if (t.tab_type === 'pet' && String(t.tabable_id) === String(petId)) {
              return { ...t, id: null };
            }
            return t;
          });
          // Update the DOM to show the pin icon instead of X
          const tabData = this.tabs.find(t => t.tab_type === 'pet' && String(t.tabable_id) === String(petId));
          if (tabData) {
            // Update the URL to current URL to ensure active state is preserved
            tabData.url = window.location.href;
            const newTab = this.createTabElement(tabData);
            tabElement.replaceWith(newTab);
            this.makeTabActive(newTab);
          }
        }
        continue;
      }
      // Remove all other pet tabs (both pinned and unpinned)
      console.log(`Removing non-active pet tab ${petId}`);
      if (isPinned) {
        await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedPetIds.delete(petId);
      }
      tabElement.remove();
      this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(petId) || t.tab_type !== 'pet');
      console.log(`Removed pet tab ${petId} from DOM and tabs array`);
    }
    // Handle all task tabs (both pinned and unpinned) except the active one
    const allTaskTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab[data-tab-type="task"]'));
    console.log("Processing all task tabs:", allTaskTabs.map(t => ({ id: t.dataset.recordId, isPinned: t.dataset.tabId })));
    
    for (const tabElement of allTaskTabs) {
      const taskId = tabElement.dataset.recordId;
      const isPinned = tabElement.dataset.tabId; // If tabId exists, it's pinned
      
      console.log(`Processing task tab ${taskId}, isPinned: ${!!isPinned}, active tab is task ${activeTabRecordId}`);
      
      // If this is the active tab, keep it open (unpin if it was pinned)
      if (activeTabType === 'task' && String(activeTabRecordId) === String(taskId)) {
        console.log(`Keeping active task tab ${taskId} open`);
        if (isPinned) {
          console.log(`Unpinning active task tab ${taskId} (keeping it open)`);
          await fetch(`/pinned_tabs/unpin_task?task_id=${taskId}`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          this.pinnedTaskIds.delete(taskId);
          // Remove id from tab data so it's treated as unpinned
          tabElement.dataset.tabId = '';
          this.tabs = this.tabs.map(t => {
            if (t.tab_type === 'task' && String(t.tabable_id) === String(taskId)) {
              return { ...t, id: null };
            }
            return t;
          });
          // Update the DOM to show the pin icon instead of X
          const tabData = this.tabs.find(t => t.tab_type === 'task' && String(t.tabable_id) === String(taskId));
          if (tabData) {
            // Update the URL to current URL to ensure active state is preserved
            tabData.url = window.location.href;
            const newTab = this.createTabElement(tabData);
            tabElement.replaceWith(newTab);
            this.makeTabActive(newTab);
          }
        }
        continue;
      }
      // Remove all other task tabs (both pinned and unpinned)
      console.log(`Removing non-active task tab ${taskId}`);
      if (isPinned) {
        await fetch(`/pinned_tabs/unpin_task?task_id=${taskId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedTaskIds.delete(taskId);
      }
      tabElement.remove();
      this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(taskId) || t.tab_type !== 'task');
      console.log(`Removed task tab ${taskId} from DOM and tabs array`);
    }
    sessionStorage.removeItem('currentUnpinnedPetTab');
    sessionStorage.removeItem('currentUnpinnedTaskTab');
    this.updateOverflowedTabsList();
  }

  // --- DRAG AND DROP HANDLERS AS CLASS PROPERTIES ---
  handleDragStart = (event) => {
    const tabElement = event.target.closest('.nav-tab');
    console.log('[DEBUG] handleDragStart fired', tabElement);
    if (!tabElement) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', tabElement.outerHTML);
    tabElement.classList.add('dragging');
    this.draggedTab = {
      element: tabElement,
      recordId: tabElement.dataset.recordId,
      tabId: tabElement.dataset.tabId
    };
  }

  handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const tabElement = event.target.closest('.nav-tab');
    if (!tabElement || tabElement === this.draggedTab?.element) return;
    const rect = tabElement.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (event.clientX < midX) {
      tabElement.classList.add('drag-before');
      tabElement.classList.remove('drag-after');
    } else {
      tabElement.classList.add('drag-after');
      tabElement.classList.remove('drag-before');
    }
  }

  handleDrop = (event) => {
    event.preventDefault();
    console.log('[DEBUG] handleDrop fired');
    const targetTab = event.target.closest('.nav-tab');
    if (!targetTab || !this.draggedTab) {
      console.log('[DEBUG] handleDrop: missing targetTab or draggedTab');
      return;
    }
    console.log('[DEBUG] handleDrop: targetTab =', targetTab);
    console.log('[DEBUG] handleDrop: draggedTab =', this.draggedTab);
    
    const isAfter = targetTab.classList.contains('drag-after');
    const draggedElement = this.draggedTab.element;
    
    // Move the DOM element first
    if (isAfter) {
      targetTab.parentNode.insertBefore(draggedElement, targetTab.nextSibling);
    } else {
      targetTab.parentNode.insertBefore(draggedElement, targetTab);
    }
    
    // Now rebuild this.tabs array based on the actual DOM order
    this.tabs = [];
    const domTabs = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    domTabs.forEach(tabElement => {
      const tabData = {
        id: tabElement.dataset.tabId || null,
        tabable_id: tabElement.dataset.recordId || null,
        title: tabElement.querySelector('.nav-tab-title').textContent,
        url: tabElement.dataset.tabUrl,
        tab_type: tabElement.dataset.tabType,
        position: tabElement.dataset.position !== undefined && tabElement.dataset.position !== '' ? parseInt(tabElement.dataset.position) : null
      };
      this.tabs.push(tabData);
    });
    
    console.log('[DEBUG] handleDrop: calling saveTabOrder');
    console.log('[DEBUG] handleDrop: updated this.tabs =', this.tabs);
    this.saveTabOrder();
    this.updateOverflowedTabsList();
  }

  handleDragEnd = (event) => {
    this.tabsContainerTarget.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('dragging', 'drag-before', 'drag-after');
    });
    this.draggedTab = null;
  }

  setupDragAndDrop() {
    this.tabsContainerTarget.addEventListener('dragstart', this.handleDragStart);
    this.tabsContainerTarget.addEventListener('dragover', this.handleDragOver);
    this.tabsContainerTarget.addEventListener('drop', this.handleDrop);
    this.tabsContainerTarget.addEventListener('dragend', this.handleDragEnd);
  }

  removeDragAndDrop() {
    this.tabsContainerTarget.removeEventListener('dragstart', this.handleDragStart);
    this.tabsContainerTarget.removeEventListener('dragover', this.handleDragOver);
    this.tabsContainerTarget.removeEventListener('drop', this.handleDrop);
    this.tabsContainerTarget.removeEventListener('dragend', this.handleDragEnd);
  }

  saveTabOrder() {
    // Only save order for tabs that are actually pinned (have database IDs and are in pinned sets)
    const pinnedTabs = this.tabs.filter(tab => {
      if (!tab.id) return false; // Must have database ID
      if (tab.tab_type === 'pet') {
        return this.pinnedPetIds.has(String(tab.tabable_id));
      } else if (tab.tab_type === 'task') {
        return this.pinnedTaskIds.has(String(tab.tabable_id));
      }
      return false;
    });
    const tabOrder = pinnedTabs.map(tab => tab.id);
    console.log('Saving tab order - pinned tabs:', pinnedTabs);
    console.log('Saving tab order - tab IDs:', tabOrder);
    console.log('All tabs in this.tabs:', this.tabs);
    console.log('Pinned pet IDs:', Array.from(this.pinnedPetIds));
    console.log('Pinned task IDs:', Array.from(this.pinnedTaskIds));
    
    // Save to server
    fetch('/pinned_tabs/update_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ tab_ids: tabOrder })
    }).then(res => res.json()).then(data => {
      if (!data.success) {
        console.error('Failed to update tab order on server:', data.error);
      } else {
        console.log('Tab order successfully saved to server');
      }
    }).catch(error => {
      console.error('Error saving tab order:', error);
    });
    // No longer save to localStorage
    // localStorage.setItem('tabOrder', JSON.stringify(tabOrder));
    console.log('Tab order saved to server:', tabOrder);
  }

  loadTabOrder() {
    // No longer use localStorage; order comes from server
    return null;
  }

  // Call this after any tab change
  updateOverflowedTabsList() {
    // Select the 3-dots dropdown menu globally
    const dropdownMenu = document.querySelector('#tabMenuDropdown + .dropdown-menu');
    if (!dropdownMenu) return;

    // Always ensure divider and 'Unpin all tabs' are present and in the correct order
    let divider = Array.from(dropdownMenu.children).find(
      li => li.querySelector && li.querySelector('.tab-menu-divider')
    );
    let unpinLi = Array.from(dropdownMenu.querySelectorAll('li')).find(li => {
      const a = li.querySelector('a.dropdown-item');
      return a && a.dataset.action && a.dataset.action.includes('unpinAllTabs');
    });

    if (!divider) {
      divider = document.createElement('li');
      const hr = document.createElement('hr');
      hr.className = 'tab-menu-divider';
      divider.appendChild(hr);
      dropdownMenu.appendChild(divider);
    }
    // Don't create the unpin button here since it's already in the HTML template

    // Remove only dynamically inserted overflowed tab <li>s
    dropdownMenu.querySelectorAll('li.overflowed-tab-li').forEach(li => li.remove());

    // 1. Set all tabs to visible (no animation)
    const tabElements = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    tabElements.forEach(tab => {
      tab.classList.remove('tab-overflowed');
      tab.style.removeProperty('width');
      tab.style.removeProperty('minWidth');
      tab.style.removeProperty('margin');
      tab.style.removeProperty('padding');
      tab.style.removeProperty('border');
      tab.style.removeProperty('transform');
    });

    // 2. Calculate available width for tabs
    const tabsRow = document.querySelector('.org-header-navrow');
    const tabMenuDropdown = document.getElementById('tabMenuDropdown');
    const userNav = document.querySelector('.org-header-right .navbar-nav');
    const tabsRowRect = tabsRow.getBoundingClientRect();
    const dropdownRect = tabMenuDropdown ? tabMenuDropdown.getBoundingClientRect() : { width: 0 };
    const userNavRect = userNav ? userNav.getBoundingClientRect() : { width: 0 };
    const buffer = 80; // Buffer so tabs disappear before the X is cut off
    const availableWidth = tabsRowRect.width - dropdownRect.width - userNavRect.width - 32 - buffer;

    // 3. Show as many tabs as fit from left to right, hide the rest
    // First, show all tabs so we can measure their widths
    tabElements.forEach(tab => {
      tab.classList.remove('tab-overflowed');
      tab.style.display = '';
    });
    // Now, measure and hide from right to left
    let usedWidth = 0;
    let overflowed = [];
    for (let i = 0; i < tabElements.length; i++) {
      const tab = tabElements[i];
      const tabWidth = tab.getBoundingClientRect().width;
      if (usedWidth + tabWidth > availableWidth) {
        overflowed = tabElements.slice(i);
        break;
      } else {
        usedWidth += tabWidth;
      }
    }
    // Hide overflowed tabs
    overflowed.forEach(tab => {
      tab.classList.add('tab-overflowed');
      tab.style.display = 'none';
    });

    // 5. Render overflowed tabs as clickable items with icons, before the divider
    if (overflowed.length === 0) {
      return;
    }
    overflowed.forEach(tab => {
      // Only render if tab is actually hidden (has .tab-overflowed)
      if (!tab.classList.contains('tab-overflowed')) return;
      const title = tab.querySelector('.nav-tab-title').textContent;
      const tabId = tab.dataset.tabId;
      const tabType = tab.dataset.tabType;
      const recordId = tab.dataset.recordId;
      const li = document.createElement('li');
      li.className = 'overflowed-tab-li';
      const a = document.createElement('a');
      a.className = 'dropdown-item d-flex align-items-center' + (tab.querySelector('.nav-tab-content.active') ? ' active' : '');
      a.href = '#';
      const icon = document.createElement('i');
      icon.className = (tabType === 'pet' ? 'fas fa-paw me-2' : 'fas fa-tasks me-2') + (tab.querySelector('.nav-tab-content.active') ? ' active-icon' : '');
      a.appendChild(icon);
      a.appendChild(document.createTextNode(title));
      a.onclick = (e) => {
        e.preventDefault();
        Turbo.visit(tab.dataset.tabUrl);
      };
      li.appendChild(a);
      dropdownMenu.insertBefore(li, divider);
    });
  }

  // Debounce utility
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
} 