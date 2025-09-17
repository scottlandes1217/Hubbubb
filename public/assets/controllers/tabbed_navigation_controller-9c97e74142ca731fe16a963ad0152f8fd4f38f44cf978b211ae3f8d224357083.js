import { Controller } from "@hotwired/stimulus"

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
    window.addEventListener('pet:opened', this.handlePetOpened);
    window.addEventListener('pet:unpinned', this.handlePetUnpinned);
    window.addEventListener('task:opened', this.handleTaskOpened);
    window.addEventListener('task:unpinned', this.handleTaskUnpinned);
  }
  
  removeEventListeners() {
    window.removeEventListener('pet:opened', this.handlePetOpened);
    window.removeEventListener('pet:unpinned', this.handlePetUnpinned);
    window.removeEventListener('task:opened', this.handleTaskOpened);
    window.removeEventListener('task:unpinned', this.handleTaskUnpinned);
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
        console.log(`Restoring unpinned tab for task: ${taskSubject} (ID: ${taskId})`);
        
        // Check if this task is already pinned
        if (this.pinnedTaskIds.has(String(taskId))) {
          console.log(`Task ${taskId} is already pinned, not restoring as unpinned tab`);
          return;
        }
        
        // Check if tab already exists
        let existingTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"]`);
        if (existingTab) {
          console.log(`Tab for task ${taskId} already exists, making it active`);
          this.makeTabActive(existingTab);
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
    const tabElement = event.currentTarget.closest('.nav-tab');
    const url = tabElement.dataset.tabUrl;
    const tabType = tabElement.dataset.tabType;
    
    let isActive = false;
    try {
      isActive = window.location.pathname === new URL(url, window.location.origin).pathname;
    } catch (e) {
      isActive = window.location.pathname === url;
    }
    if (isActive) {
      // Already on this page, do nothing
      return;
    }
    
    if (tabType === 'pet') {
      const petId = tabElement.dataset.recordId;
      
      // Check if this is a pinned tab
      const isPinned = this.pinnedPetIds.has(String(petId));
      
      if (isPinned) {
        console.log(`Switching to pinned tab for pet: ${petId}, removing unpinned tabs`);
        
        // Remove all unpinned tabs from the DOM and tabs array
        const unpinnedTabs = this.tabsContainerTarget.querySelectorAll('.nav-tab');
        unpinnedTabs.forEach(tab => {
          const tabPetId = tab.dataset.recordId;
          const tabType = tab.dataset.tabType;
          if (tabPetId && tabType === 'pet' && !this.pinnedPetIds.has(String(tabPetId))) {
            console.log(`Removing unpinned tab for pet: ${tabPetId}`);
            tab.remove();
            // Remove from tabs array
            this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(tabPetId));
          }
        });
        
        // Clear sessionStorage for unpinned tabs
        sessionStorage.removeItem('currentUnpinnedPetTab');
        console.log('Cleared sessionStorage for unpinned tabs');
      }
    } else if (tabType === 'task') {
      const taskId = tabElement.dataset.recordId;
      
      // Check if this is a pinned tab
      const isPinned = this.pinnedTaskIds.has(String(taskId));
      
      if (isPinned) {
        console.log(`Switching to pinned tab for task: ${taskId}, removing unpinned tabs`);
        
        // Remove all unpinned tabs from the DOM and tabs array
        const unpinnedTabs = this.tabsContainerTarget.querySelectorAll('.nav-tab');
        unpinnedTabs.forEach(tab => {
          const tabTaskId = tab.dataset.recordId;
          const tabType = tab.dataset.tabType;
          if (tabTaskId && tabType === 'task' && !this.pinnedTaskIds.has(String(tabTaskId))) {
            console.log(`Removing unpinned tab for task: ${tabTaskId}`);
            tab.remove();
            // Remove from tabs array
            this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(tabTaskId));
          }
        });
        
        // Clear sessionStorage for unpinned tabs
        sessionStorage.removeItem('currentUnpinnedTaskTab');
        console.log('Cleared sessionStorage for unpinned tabs');
      }
    }
    
    if (url) {
      window.location.href = url;
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
          window.location.href = nextUrl;
        } else if (previousTab) {
          // Switch to the tab to the left if no tab to the right
          const prevUrl = previousTab.dataset.tabUrl;
          console.log(`Switching to previous tab: ${prevUrl}`);
          window.location.href = prevUrl;
        } else {
          // No more tabs, go to main navigation (pets index)
          console.log('No more tabs, navigating to pets index');
          const organizationId = window.location.pathname.split('/')[2]; // Extract org ID from URL
          window.location.href = `/organizations/${organizationId}/pets`;
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
          window.location.href = nextUrl;
        } else if (previousTab) {
          // Switch to the tab to the left if no tab to the right
          const prevUrl = previousTab.dataset.tabUrl;
          console.log(`Switching to previous tab: ${prevUrl}`);
          window.location.href = prevUrl;
        } else {
          // No more tabs, go to main navigation (tasks index)
          console.log('No more tabs, navigating to tasks index');
          const organizationId = window.location.pathname.split('/')[2]; // Extract org ID from URL
          window.location.href = `/organizations/${organizationId}/tasks`;
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
    console.log("=== handleTaskOpened called ===");
    console.log("Event:", event);
    console.log("Event detail:", event.detail);
    const { taskId, taskSubject, taskUrl, fromPinButton } = event.detail;
    console.log(`Task opened: ${taskSubject} (ID: ${taskId})`);
    console.log("Current tabs:", this.tabs);
    console.log("Pinned task IDs:", this.pinnedTaskIds);
    console.log("All pinned tab IDs from DOM:", Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab[data-tab-id]')).map(t => ({ id: t.dataset.tabId, recordId: t.dataset.recordId, type: t.dataset.tabType })));
    
    // Check if this task is already pinned
    const isPinned = this.pinnedTaskIds.has(String(taskId));
    console.log(`Is task ${taskId} pinned according to pinnedTaskIds? ${isPinned}`);
    
    // Also check if there's a pinned tab in the DOM for this task
    const existingPinnedTab = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"][data-tab-id]`);
    const hasPinnedTabInDOM = existingPinnedTab && existingPinnedTab.dataset.tabId;
    console.log(`Is there a pinned tab in DOM for task ${taskId}? ${hasPinnedTabInDOM}`);
    
    if (isPinned || hasPinnedTabInDOM) {
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
    event.preventDefault();
    // Find the active tab (by .active class or current URL)
    let activeTab = null;
    const tabElements = Array.from(this.tabsContainerTarget.querySelectorAll('.nav-tab'));
    tabElements.forEach(tab => {
      if (tab.querySelector('.nav-tab-content.active')) {
        activeTab = tab;
      }
    });
    const activeTabId = activeTab ? activeTab.dataset.tabId : null;
    const activeTabType = activeTab ? activeTab.dataset.tabType : null;
    const activeTabRecordId = activeTab ? activeTab.dataset.recordId : null;

    // Unpin all pinned pet tabs except the active one
    const petIds = Array.from(this.pinnedPetIds);
    for (const petId of petIds) {
      // If this is the active tab, just unpin (don't remove)
      if (activeTabType === 'pet' && String(activeTabRecordId) === String(petId)) {
        await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedPetIds.delete(petId);
        // Remove id from tab data so it's treated as unpinned
        if (activeTab) {
          activeTab.dataset.tabId = '';
        }
        this.tabs = this.tabs.map(t => {
          if (t.tab_type === 'pet' && String(t.tabable_id) === String(petId)) {
            return { ...t, id: null };
          }
          return t;
        });
        // --- Update the DOM to show the pin icon instead of X ---
        if (activeTab) {
          const tabData = this.tabs.find(t => t.tab_type === 'pet' && String(t.tabable_id) === String(petId));
          if (tabData) {
            const newTab = this.createTabElement(tabData);
            activeTab.replaceWith(newTab);
            this.makeTabActive(newTab);
          }
        }
        continue;
      }
      // Remove all other pinned pet tabs
      await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      this.pinnedPetIds.delete(petId);
      const tabElement = this.tabsContainerTarget.querySelector(`[data-record-id="${petId}"][data-tab-type="pet"]`);
      if (tabElement) tabElement.remove();
      this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(petId) || t.tab_type !== 'pet');
    }
    // Unpin all pinned task tabs except the active one
    const taskIds = Array.from(this.pinnedTaskIds);
    for (const taskId of taskIds) {
      if (activeTabType === 'task' && String(activeTabRecordId) === String(taskId)) {
        await fetch(`/pinned_tabs/unpin_task?task_id=${taskId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        this.pinnedTaskIds.delete(taskId);
        if (activeTab) {
          activeTab.dataset.tabId = '';
        }
        this.tabs = this.tabs.map(t => {
          if (t.tab_type === 'task' && String(t.tabable_id) === String(taskId)) {
            return { ...t, id: null };
          }
          return t;
        });
        // --- Update the DOM to show the pin icon instead of X ---
        if (activeTab) {
          const tabData = this.tabs.find(t => t.tab_type === 'task' && String(t.tabable_id) === String(taskId));
          if (tabData) {
            const newTab = this.createTabElement(tabData);
            activeTab.replaceWith(newTab);
            this.makeTabActive(newTab);
          }
        }
        continue;
      }
      await fetch(`/pinned_tabs/unpin_task?task_id=${taskId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      this.pinnedTaskIds.delete(taskId);
      const tabElement = this.tabsContainerTarget.querySelector(`[data-record-id="${taskId}"][data-tab-type="task"]`);
      if (tabElement) tabElement.remove();
      this.tabs = this.tabs.filter(t => String(t.tabable_id) !== String(taskId) || t.tab_type !== 'task');
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
    const tabsContainer = this.tabsContainerTarget;
    const overflowedTabsList = document.getElementById('overflowed-tabs-list');
    if (!overflowedTabsList) return;
    // Clear previous
    overflowedTabsList.innerHTML = '';
    // 1. Set all tabs to visible and reset styles for measurement
    const tabElements = Array.from(tabsContainer.querySelectorAll('.nav-tab'));
    tabElements.forEach(tab => {
      tab.classList.remove('tab-overflowed');
      tab.style.width = '';
      tab.style.minWidth = '';
      tab.style.margin = '';
      tab.style.padding = '';
      tab.style.border = '';
      tab.style.transform = 'translateX(0)';
    });
    // 2. Measure all tabs and determine which should overflow
    const containerRect = tabsContainer.getBoundingClientRect();
    let overflowed = [];
    tabElements.forEach(tab => {
      const rect = tab.getBoundingClientRect();
      if (rect.left < containerRect.left || rect.right > containerRect.right) {
        overflowed.push(tab);
      }
    });
    // 3. Apply overflow logic and animate
    tabElements.forEach(tab => {
      if (overflowed.includes(tab)) {
        if (!tab.classList.contains('tab-overflowed')) {
          // Animate width to 0 and slide left
          const tabWidth = tab.getBoundingClientRect().width;
          tab.style.width = tabWidth + 'px';
          tab.style.transform = 'translateX(0)';
          void tab.offsetWidth;
          tab.classList.add('tab-overflowed');
          tab.style.width = '0px';
          tab.style.transform = 'translateX(-40px)';
        }
      } else {
        if (tab.classList.contains('tab-overflowed')) {
          // Animate in from right
          tab.style.width = '0px';
          tab.style.transform = 'translateX(40px)';
          void tab.offsetWidth;
          tab.classList.remove('tab-overflowed');
          const normalWidth = tab.scrollWidth;
          tab.style.width = normalWidth + 'px';
          tab.style.transform = 'translateX(0)';
          setTimeout(() => {
            tab.style.width = '';
            tab.style.transform = '';
          }, 180);
        } else {
          tab.style.width = '';
          tab.style.transform = '';
        }
      }
    });
    if (overflowed.length === 0) {
      overflowedTabsList.style.display = 'none';
      return;
    }
    overflowedTabsList.style.display = 'block';
    // Render overflowed tabs as clickable items with icons
    overflowed.forEach(tab => {
      const title = tab.querySelector('.nav-tab-title').textContent;
      const tabId = tab.dataset.tabId;
      const tabType = tab.dataset.tabType;
      const recordId = tab.dataset.recordId;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item d-flex align-items-center' + (tab.querySelector('.nav-tab-content.active') ? ' active' : '');
      a.href = '#';
      // Add icon
      const icon = document.createElement('i');
      icon.className = (tabType === 'pet' ? 'fas fa-paw me-2' : 'fas fa-tasks me-2') + (tab.querySelector('.nav-tab-content.active') ? ' active-icon' : '');
      a.appendChild(icon);
      a.appendChild(document.createTextNode(title));
      a.onclick = (e) => {
        e.preventDefault();
        // Navigate to the tab's URL
        window.location.href = tab.dataset.tabUrl;
      };
      li.appendChild(a);
      overflowedTabsList.appendChild(li);
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
} ;
