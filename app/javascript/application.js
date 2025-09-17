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

import SearchController from "./controllers/search_controller";
application.register("search", SearchController);

// Other imports
// Bootstrap is loaded via CDN in the layout to ensure global availability
// import "bootstrap";
import "@popperjs/core";

// Import channels
import "./channels"

import "trix"
import "@rails/actiontext"

import Rails from "@rails/ujs";
Rails.start();

// Import the record layout builder
import "./record_layouts/builder";

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

    // Defer name resolution slightly so any runtime DOM replacements (e.g., record layout hydration)
    // have completed. Prefer the reliable data attribute from the server.
    setTimeout(() => {
      let petName = petContainer.dataset.petName || "";

      // Fallback 1: record-values JSON embedded on record pages
      if (!petName || petName === "") {
        try {
          const valuesEl = document.getElementById('record-values-json');
          if (valuesEl && valuesEl.textContent) {
            const values = JSON.parse(valuesEl.textContent);
            if (values && typeof values.name === 'string' && values.name.trim()) {
              petName = values.name.trim();
              console.log('Using pet name from record-values-json:', petName);
            }
          }
        } catch(_) {}
      }

      // Fallbacks: attempt to read visible DOM if dataset missing
      if (!petName || petName === "") {
        const petNameSelectors = [
          '.name-field-header .value',
          '.pet-header .value',
          '[data-field="name"]',
          '.pet-name',
          'h1'
        ];
        for (const selector of petNameSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            petName = el.textContent.trim();
            console.log(`Found pet name "${petName}" using selector: ${selector}`);
            break;
          }
        }
      }

      // Check if we've already dispatched an event for this pet on this page load
      const lastDispatchedPet = sessionStorage.getItem('lastDispatchedPet');
      if (lastDispatchedPet === petId) {
        console.log(`Already dispatched pet:opened event for pet ${petId} on this page load, skipping`);
        return;
      }

      const resolvedName = petName || 'Pet';
      console.log(`Dispatching pet:opened event for pet: ${resolvedName} (ID: ${petId})`);

      // Ensure visible header text reflects the server name (guard against stale builder snapshots)
      const applyHeaderName = () => {
        try {
          // Only update the value span, never the edit button
          const headerSpan = document.querySelector('.name-field-header [data-field="name"][data-edit-field-target="value"]');
          if (headerSpan) headerSpan.textContent = resolvedName;
          // If some earlier script injected text into the edit button, restore the pencil icon
          const editBtn = document.querySelector('.name-field-header [data-field="name"][data-edit-field-target="editButton"]');
          if (editBtn && editBtn.querySelector('i.fas.fa-pencil-alt') == null) {
            editBtn.innerHTML = '<i class="fas fa-pencil-alt" aria-hidden="true"></i>';
          }
        } catch(_) {}
      };
      applyHeaderName();
      // Guard against late DOM replacements by record layout hydration
      try {
        const container = document.querySelector('.record-layout-render') || document.body;
        const mo = new MutationObserver(() => applyHeaderName());
        mo.observe(container, { childList: true, subtree: true });
        // Auto-disconnect after a short window to avoid overhead
        setTimeout(() => { try { mo.disconnect(); } catch(_) {} }, 2000);
      } catch(_) {}

      // Dispatch the pet:opened event
      document.dispatchEvent(new CustomEvent('pet:opened', {
        detail: { petId, petName: resolvedName, petUrl }
      }));

      // Don't automatically store in sessionStorage - only store if explicitly unpinned
      sessionStorage.setItem('lastDispatchedPet', petId);
      console.log(`Dispatched pet:opened event for: ${resolvedName} (ID: ${petId})`);
    }, 120); // Slightly longer to ensure hydration
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
