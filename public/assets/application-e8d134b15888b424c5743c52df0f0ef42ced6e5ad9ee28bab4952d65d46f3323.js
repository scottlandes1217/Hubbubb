// application.js - Ensure this is the single source of Stimulus setup
import { Application } from "@hotwired/stimulus";
const application = Application.start();

// Import Turbo
import "@hotwired/turbo-rails";
import { Turbo } from "@hotwired/turbo-rails";

// Import controllers
import EditFieldController from "./controllers/edit_field_controller";
application.register("edit-field", EditFieldController);

import FeedController from "./controllers/feed_controller";
application.register("feed", FeedController);

import ReactionController from "./controllers/reaction_controller";
application.register("reaction", ReactionController);

import PostController from "./controllers/post_controller";
application.register("post", PostController);

import PetController from "./controllers/pet_controller";
application.register("pet", PetController);

import TabbedNavigationController from "./controllers/tabbed_navigation_controller";
application.register("tabbed-navigation", TabbedNavigationController);

import OrganizationFieldsController from "./controllers/organization_fields_controller";
application.register("organization-fields", OrganizationFieldsController);

import TaskUpdatesController from "./controllers/task_updates_controller";
application.register("task-updates", TaskUpdatesController);

import TaskController from "./controllers/task_controller";
application.register("task", TaskController);

import CalendarController from "./controllers/calendar_controller";
application.register("calendar", CalendarController);

import SidebarController from "./controllers/sidebar_controller";
application.register("sidebar", SidebarController);

import EventFormController from "./controllers/event_form_controller";
application.register("event-form", EventFormController);

import CalendarSharingController from "./controllers/calendar_sharing_controller";
application.register("calendar-sharing", CalendarSharingController);

import TurboStreamController from "./controllers/turbo_stream_controller";
application.register("turbo-stream", TurboStreamController);

import PetsIndexController from "./controllers/pets_index_controller";
application.register("pets-index", PetsIndexController);

import OrganizationTasksIndexController from "./controllers/organization_tasks_index_controller";
application.register("organization-tasks-index", OrganizationTasksIndexController);

// Other imports
import "bootstrap";
import "@popperjs/core";

// Import channels
import "./channels"

import "trix"
import "@rails/actiontext"

import Rails from "@rails/ujs";
Rails.start();

console.log("moveGlobalAlertToBody loaded");

document.addEventListener("turbo:load", () => {
  console.log("turbo:load event fired");
  moveGlobalAlertToBody();

  // Dispatch pet:opened event if we're on a pet page
  const petContainer = document.querySelector('[data-controller~="pet"]');
  const taskContainer = document.querySelector('[data-controller~="task"]');
  
  console.log("turbo:load - petContainer:", petContainer);
  console.log("turbo:load - taskContainer:", taskContainer);
  
  if (petContainer) {
    const petId = petContainer.dataset.petId;
    const petUrl = petContainer.dataset.petUrlValue;
    
    // Try multiple selectors to find the pet name
    let petName = "Pet";
    const petNameSelectors = [
      'h1',
      '.pet-name', 
      '[data-pet-name]',
      '[data-field="name"]',
      '.name-field-header .value',
      '.pet-header .value'
    ];
    
    for (const selector of petNameSelectors) {
      const petNameElement = document.querySelector(selector);
      if (petNameElement && petNameElement.textContent.trim()) {
        petName = petNameElement.textContent.trim();
        console.log(`Found pet name "${petName}" using selector: ${selector}`);
        break;
      }
    }
    
    // Check if we've already dispatched an event for this pet on this page load
    const lastDispatchedPet = sessionStorage.getItem('lastDispatchedPet');
    if (lastDispatchedPet === petId) {
      console.log(`Already dispatched pet:opened event for pet ${petId} on this page load, skipping`);
      return;
    }
    
    console.log(`Dispatching pet:opened event for pet: ${petName} (ID: ${petId})`);
    
    // Add a small delay to ensure the tabbed navigation controller is connected
    setTimeout(() => {
      // Dispatch the pet:opened event
      document.dispatchEvent(new CustomEvent('pet:opened', {
        detail: { petId, petName, petUrl }
      }));
      
      // Store in sessionStorage for unpinned tabs
      sessionStorage.setItem('currentUnpinnedPetTab', JSON.stringify({ petId, petName, petUrl }));
      sessionStorage.setItem('lastDispatchedPet', petId);
      console.log(`Stored unpinned tab in sessionStorage: ${petName} (ID: ${petId})`);
    }, 100); // 100ms delay
  } else {
    const existingTab = sessionStorage.getItem('currentUnpinnedPetTab');
    if (existingTab) {
      console.log('Not on a pet page, removing unpinned tab from sessionStorage');
      sessionStorage.removeItem('currentUnpinnedPetTab');
    }
    // Clear the last dispatched pet when not on a pet page
    sessionStorage.removeItem('lastDispatchedPet');
  }
});

// Monitor sessionStorage changes for debugging
const originalSetItem = sessionStorage.setItem;
const originalRemoveItem = sessionStorage.removeItem;

sessionStorage.setItem = function(key, value) {
  if (key === 'currentUnpinnedPetTab') {
    console.log(`sessionStorage.setItem called for ${key}:`, value);
  }
  return originalSetItem.apply(this, arguments);
};

sessionStorage.removeItem = function(key) {
  if (key === 'currentUnpinnedPetTab') {
    console.log(`sessionStorage.removeItem called for ${key}`);
  }
  return originalRemoveItem.apply(this, arguments);
};

function moveGlobalAlertToBody() {
  console.log("moveGlobalAlertToBody called");
  document.querySelectorAll('.global-top-alert').forEach(alert => {
    if (alert.parentNode !== document.body) {
      document.body.appendChild(alert);
    }
    // Add close handler to the alert's close button
    const closeBtn = alert.querySelector('.btn-close');
    if (closeBtn && !closeBtn.dataset.closeHandlerAdded) {
      closeBtn.addEventListener('click', function() {
        alert.remove();
      });
      closeBtn.dataset.closeHandlerAdded = 'true';
    }
  });
}

document.addEventListener("turbo:before-stream-render", function(event) {
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
});
