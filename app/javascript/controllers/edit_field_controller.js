import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "value",
    "input",
    "editButton",
    "saveButton",
    "cancelButton",
    "photoInput",
    "photo",
  ];

  connect() {
    console.log("[EditField] connect", { el: this.element, targets: this.constructor.targets });

    // Prevent re-initializing on the same element
    if (this.initialized) {
      console.warn("Controller already initialized, skipping...");
      return;
    }
    this.initialized = true;

    // Generate instance IDs for fields that don't have them (backwards compatibility)
    this.ensureInstanceIds();

    this.url = this.element.dataset.url;
    this.currentValues = new Map();
    this.changedFields = new Set();
    this.isSaving = false;

    // Store initial values (including checkboxes/multi-selects)
    this.inputTargets.forEach((input) => {
      if (input.type === "checkbox") {
        this.currentValues.set(input.dataset.field, input.checked.toString());
      } else if (input.tagName === "SELECT" && input.multiple) {
        const selected = Array.from(input.selectedOptions).map((o) => o.value);
        this.currentValues.set(input.dataset.field, selected);
      } else {
        this.currentValues.set(input.dataset.field, input.value);
      }
    });

    // Canonicalize from server-provided values when available to avoid stale snapshots
    try {
      const valuesEl = document.getElementById('record-values-json');
      if (valuesEl && valuesEl.textContent) {
        const values = JSON.parse(valuesEl.textContent);
        if (values && typeof values.name === 'string' && values.name.trim()) {
          this.currentValues.set('name', values.name.trim());
          // Normalize all name inputs to server value to prevent stale overrides
          this.inputTargets
            .filter((i) => i.dataset.field === 'name')
            .forEach((i) => { try { i.value = values.name.trim(); } catch(_) {} });
        }
      }
    } catch(_) {}
    // Fallback to data attribute
    if (!this.currentValues.get('name')) {
      const serverName = this.element && this.element.dataset && this.element.dataset.petName;
      if (serverName) {
        this.currentValues.set('name', serverName);
        this.inputTargets
          .filter((i) => i.dataset.field === 'name')
          .forEach((i) => { try { i.value = serverName; } catch(_) {} });
      }
    }

    // Redraw UI on initial load to ensure
    // "Estimated" or other dynamic text is displayed
    this.updateUI();
  }

  /* ------------------------------------------------------------
   * ENSURE INSTANCE IDS
   * Generate unique instance IDs for fields that don't have them
   * ------------------------------------------------------------ */
  ensureInstanceIds() {
    // Find all field containers
    const fieldContainers = this.element.querySelectorAll('.field-container');
    fieldContainers.forEach((container) => {
      // Check if this container already has fields with instance IDs
      const hasInstanceId = container.querySelector('[data-instance-id]');
      if (hasInstanceId) return; // Already has instance IDs

      // Generate a unique instance ID for this field container
      const instanceId = 'field-instance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Find all related elements in this container
      const value = container.querySelector('[data-edit-field-target="value"]');
      const button = container.querySelector('[data-edit-field-target="editButton"]');
      const inputs = container.querySelectorAll('[data-edit-field-target="input"]');
      const groupContainer = container.querySelector('.edit-input-group');
      
      // Add instance ID to all related elements
      if (value) value.dataset.instanceId = instanceId;
      if (button) button.dataset.instanceId = instanceId;
      inputs.forEach((input) => {
        input.dataset.instanceId = instanceId;
      });
      // For grouped fields, also add instance ID to the group container
      if (groupContainer) {
        groupContainer.dataset.instanceId = instanceId;
      }
    });
  }

/* ------------------------------------------------------------
 * EDIT
 * ------------------------------------------------------------ */
  edit(event) {
  event.preventDefault();
  event.stopPropagation();

  // Use event.currentTarget so we always get the button's data attributes
  const button = event.currentTarget;
  const instanceId = button.dataset.instanceId;
  const group = button.dataset.group;
  const field = button.dataset.field;
  console.log("[edit] Clicked edit button:", { instanceId, group, field });

  // Helper function to find elements by instance ID or fallback to container search
  const findElement = (selector, container = null) => {
    if (instanceId) {
      // Use instance ID for precise targeting
      const elements = this.element.querySelectorAll(`[data-instance-id="${instanceId}"]${selector}`);
      return elements.length > 0 ? elements[0] : null;
    } else {
      // Fallback: search within container
      const searchContainer = container || button.closest('.field-container') || this.element;
      return searchContainer.querySelector(selector);
    }
  };

  const findElements = (selector, container = null) => {
    if (instanceId) {
      // Use instance ID for precise targeting
      return Array.from(this.element.querySelectorAll(`[data-instance-id="${instanceId}"]${selector}`));
    } else {
      // Fallback: search within container
      const searchContainer = container || button.closest('.field-container') || this.element;
      return Array.from(searchContainer.querySelectorAll(selector));
    }
  };

  if (group) {
    // Grouped fields (e.g., weight, dob)
    const valueElement = findElement('[data-edit-field-target="value"]');
    let groupContainer = null;
    if (instanceId) {
      // Use instance ID to find the group container
      groupContainer = this.element.querySelector(`[data-instance-id="${instanceId}"].edit-input-group`);
    }
    if (!groupContainer) {
      // Fallback: search within field container
      const fieldContainer = button.closest('.field-container') || this.element;
      groupContainer = fieldContainer.querySelector(`.edit-input-group[data-group="${group}"]`);
    }
    const inputElements = findElements('[data-edit-field-target="input"]').filter(
      (el) => el.dataset.group === group
    );

    // Hide the static text <span>
    if (valueElement) {
      valueElement.style.display = "none";
    }

    // Show the grouped container
    if (groupContainer) {
      groupContainer.style.display = "flex";
    }

    // Show each input inside that container
    inputElements.forEach((inputEl) => {
      inputEl.style.display = "inline-block";
    });

    // Hide the edit button
    button.style.display = "none";

    // Show the cancel button
    this.showCancelButton();

    // Listen for input changes to show/hide the Save button
    inputElements.forEach((inputEl) => {
      const eventType =
        inputEl.type === "checkbox" || inputEl.tagName === "SELECT"
          ? "change"
          : "input";

      inputEl.addEventListener(eventType, () => {
        const changedValues = inputElements.map((el) =>
          el.type === "checkbox" ? el.checked : el.value
        );
        const originalValues = inputElements.map((el) =>
          this.currentValues.get(el.dataset.field)
        );

        if (JSON.stringify(changedValues) !== JSON.stringify(originalValues)) {
          this.changedFields.add(group);
          this.showSaveButton();
        } else {
          this.changedFields.delete(group);
          if (this.changedFields.size === 0) {
            this.hideSaveButton();
          }
        }
      });
    });
  } else {
    // Single field - use instance ID to find related elements
    const valueElement = findElement('[data-edit-field-target="value"]');
    const inputElement = findElement('[data-edit-field-target="input"]');

    // Hide the static text
    if (valueElement) valueElement.style.display = "none";
    
    // Show the <input> or <select>
    if (inputElement) {
      inputElement.style.display = "inline-block";
      inputElement.focus();
    } else {
      console.warn("[edit] Could not find input element for field", field, "instanceId", instanceId);
    }

    // Hide the edit button
    button.style.display = "none";

    // Show the cancel button
    this.showCancelButton();

    // Watch for changes
    if (inputElement) {
      const checkChange = () => {
        if (inputElement.type === "checkbox") {
          if (inputElement.checked.toString() !== this.currentValues.get(field)) {
            this.changedFields.add(field);
            this.showSaveButton();
          } else {
            this.changedFields.delete(field);
            this.hideSaveButton();
          }
        } else if (inputElement.tagName === "SELECT" && inputElement.multiple) {
          const selectedValues = Array.from(inputElement.selectedOptions).map(
            (o) => o.value
          );
          const originalValues = this.currentValues.get(field);
          if (
            JSON.stringify(selectedValues) !== JSON.stringify(originalValues)
          ) {
            this.changedFields.add(field);
            this.showSaveButton();
          } else {
            this.changedFields.delete(field);
            this.hideSaveButton();
          }
        } else {
          if (inputElement.value !== this.currentValues.get(field)) {
            this.changedFields.add(field);
            this.showSaveButton();
          } else {
            this.changedFields.delete(field);
            this.hideSaveButton();
          }
        }
      };

      // For single field, use input or change event
      const eventType =
        inputElement.type === "checkbox" || inputElement.tagName === "SELECT"
          ? "change"
          : "input";
      inputElement.addEventListener(eventType, checkChange);
    }
  }
}

  /* ------------------------------------------------------------
   * CANCEL
   * ------------------------------------------------------------ */
  cancel(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log("Cancel button clicked. Reverting changes...");

    const groupToCancel = event.target.dataset.group; // might be undefined

    // Revert each input to its stored original value
    this.inputTargets.forEach((input) => {
      const field = input.dataset.field;
      const group = input.dataset.group;
      const originalValue = this.currentValues.get(field);

      // If groupToCancel is set, only revert those in that group
      if (!groupToCancel || group === groupToCancel) {
        if (input.tagName === "SELECT" && input.multiple) {
          // Multi-select revert
          Array.from(input.options).forEach((option) => {
            option.selected = originalValue.includes(option.value);
          });
        } else if (input.type === "checkbox") {
          input.checked = originalValue === "true";
        } else {
          // Single-value fields
          input.value = originalValue;
        }
      }
    });

    // Re-draw
    this.updateUI();

    // Clear changes
    this.changedFields.clear();
    this.hideSaveButton();
    this.hideCancelButton();
  }

  /* ------------------------------------------------------------
   * SAVE
   * ------------------------------------------------------------ */
  save(event) {
    if (event) event.preventDefault();

    if (this.isSaving) {
      console.warn("Save is already in progress. Ignoring duplicate request.");
      return;
    }
    this.isSaving = true;

    // Collect all new values
    const data = {};
    this.inputTargets.forEach((input) => {
      const field = input.dataset.field;
      let value;

      if (input.type === "checkbox") {
        value = input.checked;
      } else if (input.tagName === "SELECT" && input.multiple) {
        value = Array.from(input.selectedOptions).map((o) => o.value);
        // For breed/color, always keep as array (even if empty) - server expects arrays
        // For other multi-selects, convert empty array to null
        if (value.length === 0 && field !== 'breed' && field !== 'color' && field !== 'flags') {
          value = null;
        }
      } else {
        value = input.value; // includes single <select>, text, date...
        // Convert empty strings to null for optional fields (but keep required fields as empty string)
        if (value === "" && field !== 'name' && field !== 'status') {
          value = null;
        }
      }
      
      // Always include breed, color, and flags (even if empty arrays)
      // For other fields, only include if they have a value (not undefined or null)
      if (field === 'breed' || field === 'color' || field === 'flags') {
        data[field] = value;
      } else if (value !== undefined && value !== null) {
        data[field] = value;
      }
    });

    // Determine model type from URL or data attribute
    const isUserProfile = this.url && this.url.includes('/profile');
    const modelType = isUserProfile ? 'user' : 'pet';

    // Build final data based on model type
    let finalData = {};
    if (isUserProfile) {
      // For user profile, include all fields that are present
      finalData = { ...data };
      // Don't include password fields if they're empty
      if (!data.password) {
        delete finalData.password;
        delete finalData.password_confirmation;
      }
      if (!data.current_password && !data.password) {
        delete finalData.current_password;
      }
    } else {
      // For pet, ensure required fields are present and clean up undefined values
      const requiredFields = {
        name: data.name || this.currentValues.get('name') || '',
        status: data.status || this.currentValues.get('status') || 'available'
      };
      
      // Handle species (server expects 'species' not 'species_id')
      if (data.species !== undefined && data.species !== null && data.species !== '') {
        requiredFields.species = data.species;
      } else if (data.species_id !== undefined && data.species_id !== null && data.species_id !== '') {
        requiredFields.species = data.species_id;
      }
      
      // Handle breed - must ALWAYS be an array (even if empty)
      // Server expects breed: [] format, never null or undefined
      if (data.breed !== undefined) {
        if (Array.isArray(data.breed)) {
          requiredFields.breed = data.breed;
        } else if (data.breed === null || data.breed === '') {
          requiredFields.breed = [];
        } else {
          requiredFields.breed = [data.breed];
        }
      } else {
        // If not in data, get from current values or default to empty array
        const currentBreed = this.currentValues.get('breed');
        if (Array.isArray(currentBreed)) {
          requiredFields.breed = currentBreed;
        } else if (currentBreed !== undefined && currentBreed !== null && currentBreed !== '') {
          requiredFields.breed = [currentBreed];
        } else {
          requiredFields.breed = [];
        }
      }
      
      // Handle color - must ALWAYS be an array (even if empty)
      // Server expects color: [] format, never null or undefined
      if (data.color !== undefined) {
        if (Array.isArray(data.color)) {
          requiredFields.color = data.color;
        } else if (data.color === null || data.color === '') {
          requiredFields.color = [];
        } else {
          requiredFields.color = [data.color];
        }
      } else {
        // If not in data, get from current values or default to empty array
        const currentColor = this.currentValues.get('color');
        if (Array.isArray(currentColor)) {
          requiredFields.color = currentColor;
        } else if (currentColor !== undefined && currentColor !== null && currentColor !== '') {
          requiredFields.color = [currentColor];
        } else {
          requiredFields.color = [];
        }
      }
      
      // Handle other optional fields
      if (data.description !== undefined && data.description !== null && data.description !== '') {
        requiredFields.description = data.description;
      }
      if (data.sex !== undefined && data.sex !== null && data.sex !== '') {
        requiredFields.sex = data.sex;
      }
      
      // Include any other fields from data that aren't undefined
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && !['species_id'].includes(key)) {
          // Don't include species_id if we already have species
          if (key === 'species_id' && requiredFields.species) {
            return;
          }
          requiredFields[key] = data[key];
        }
      });
      
      finalData = requiredFields;
      
      // Remove any undefined values, but keep breed/color even if empty arrays
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) {
          delete finalData[key];
        }
        // Ensure breed and color are always arrays (never null or undefined)
        if (key === 'breed' && !Array.isArray(finalData[key])) {
          finalData[key] = [];
        }
        if (key === 'color' && !Array.isArray(finalData[key])) {
          finalData[key] = [];
        }
      });
      
      // Always ensure breed and color are present as arrays
      if (!finalData.hasOwnProperty('breed')) {
        finalData.breed = [];
      }
      if (!finalData.hasOwnProperty('color')) {
        finalData.color = [];
      }
    }

    console.log("Sending data to server:", JSON.stringify(finalData, null, 2));

    fetch(this.url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
          .content,
      },
      body: JSON.stringify({ [modelType]: finalData }),
    })
      .then((response) => {
        console.log("Fetch response. Status:", response.status);
        if (!response.ok) {
          // Check if response is JSON before trying to parse
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return response.json().then(err => {
              throw new Error(`Response not ok. Status: ${response.status}. Errors: ${JSON.stringify(err)}`);
            });
          } else {
            // Response is HTML (error page), get text and show generic error
            return response.text().then(html => {
              console.error("Server returned HTML error page:", html.substring(0, 200));
              throw new Error(`Server error (${response.status}). Please check the server logs for details.`);
            });
          }
        }
        return response.json();
      })
      .then((json) => {
        console.log(`${modelType} updated successfully:`, json);
        // If a name was updated for pet, reflect immediately in visible header name
        if (!isUserProfile && json && json.pet && json.pet.name) {
          try {
            const headerName = document.querySelector('.name-field-header .value, .pet-header .value');
            if (headerName) headerName.textContent = json.pet.name;
            // Keep container dataset in sync for refreshes and pinned tabs
            const petContainer = document.querySelector('[data-controller~="pet"]');
            if (petContainer) petContainer.dataset.petName = json.pet.name;
          } catch(_) {}
        }
        // For user profile, update UI with new values from response
        if (isUserProfile && json && json.user) {
          const user = json.user;
          // Update email if changed
          if (user.email && this.currentValues.has('email')) {
            this.currentValues.set('email', user.email);
          }
          // Update first_name if changed
          if (user.first_name !== undefined && this.currentValues.has('first_name')) {
            this.currentValues.set('first_name', user.first_name || '');
          }
          // Update last_name if changed
          if (user.last_name !== undefined && this.currentValues.has('last_name')) {
            this.currentValues.set('last_name', user.last_name || '');
          }
          // Update other fields similarly
          ['birthdate', 'gender', 'city', 'state', 'county', 'zip_code'].forEach(field => {
            if (user[field] !== undefined && this.currentValues.has(field)) {
              this.currentValues.set(field, user[field] || '');
            }
          });
        }
        this.showSuccessMessage(
          json.success_message || `${modelType === 'user' ? 'User' : 'Pet'} details updated successfully!`
        );

        // Update currentValues
        this.inputTargets.forEach((input) => {
          const field = input.dataset.field;
          if (input.tagName === "SELECT" && input.multiple) {
            const selectedArr = Array.from(input.selectedOptions).map(
              (o) => o.value
            );
            this.currentValues.set(field, selectedArr);
          } else if (input.type === "checkbox") {
            this.currentValues.set(field, input.checked.toString());
          } else {
            this.currentValues.set(field, input.value);
          }
        });

        // Re-draw
        this.updateUI();
      })
      .catch((err) => {
        console.error(`Error updating ${modelType}:`, err);
        this.showErrorMessage(err.message || "Failed to update. Please try again.");
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  /* ------------------------------------------------------------
   * UPDATE UI
   * ------------------------------------------------------------ */
  updateUI() {
    this.inputTargets.forEach((input) => {
      const field = input.dataset.field;
      const group = input.dataset.group;
      const instanceId = input.dataset.instanceId;

      // Find matching span(s) - use instance ID if available, otherwise fallback to container search
      let valueElements = [];
      if (instanceId) {
        // Use instance ID for precise targeting
        valueElements = Array.from(this.element.querySelectorAll(`[data-instance-id="${instanceId}"][data-edit-field-target="value"]`));
      } else {
        // Fallback: search within field container
        const fieldContainer = input.closest('.field-container');
        if (fieldContainer) {
          if (group) {
            valueElements = Array.from(fieldContainer.querySelectorAll('[data-edit-field-target="value"]')).filter(
              (el) => el.dataset.field === group
            );
          } else {
            valueElements = Array.from(fieldContainer.querySelectorAll('[data-edit-field-target="value"]')).filter(
              (el) => el.dataset.field === field
            );
          }
        } else {
          // Last resort: search globally
          if (group) {
            valueElements = this.valueTargets.filter(
              (el) => el.dataset.field === group
            );
          } else {
            valueElements = this.valueTargets.filter(
              (el) => el.dataset.field === field
            );
          }
        }
      }
      if (valueElements.length === 0) return;

      // Build a "display" value for each matching span
      valueElements.forEach((valueEl) => {
        let displayVal = "Not Set";

        // Special case: DOB group => handle "Estimated"
        if (group === "dob") {
          const dobValue = this.currentValues.get("date_of_birth");
          const isEstimated = this.currentValues.get("dob_estimated") === "true";
          if (dobValue) {
            const [yyyy, mm, dd] = dobValue.split("-");
            const dt = new Date(yyyy, mm - 1, dd);
            const options = { year: "numeric", month: "long", day: "numeric" };
            const formattedDate = dt.toLocaleDateString("en-US", options);
            const years = this.calculateAge(dt);
            displayVal = `${formattedDate} (${years} years)${
              isEstimated ? " (Estimated)" : ""
            }`;
          }
        }

        // Special case: Weight group
        else if (group === "weight") {
          const wLbs = this.currentValues.get("weight_lbs") || "0";
          const wOz = this.currentValues.get("weight_oz") || "0";
          displayVal = `${wLbs} lbs ${wOz} oz`;
        }

        // Special case: Password group (always show masked)
        else if (group === "password") {
          displayVal = "••••••••";
        }

        // Special case: Birthdate (single field, not grouped)
        else if (field === "birthdate" && !group) {
          const birthdateValue = this.currentValues.get("birthdate");
          if (birthdateValue) {
            const [yyyy, mm, dd] = birthdateValue.split("-");
            const dt = new Date(yyyy, mm - 1, dd);
            const options = { year: "numeric", month: "long", day: "numeric" };
            const formattedDate = dt.toLocaleDateString("en-US", options);
            const years = this.calculateAge(dt);
            displayVal = `${formattedDate} (${years} years)`;
          }
        }

        // Special case: Location & Unit group
        else if (group === "location_unit") {
          const locId = this.currentValues.get("location_id");
          const unitId = this.currentValues.get("unit_id");

          // We can fetch the text from the actual <select> in the DOM
          // This ensures we show the user-friendly text (not the ID)
          const container = input.closest(`.edit-input-group[data-group="${group}"]`);
          const locSelect = container?.querySelector('[data-field="location_id"]');
          const unitSelect = container?.querySelector('[data-field="unit_id"]');

          const locOption = locSelect?.querySelector(`option[value="${locId}"]`);
          const unitOption = unitSelect?.querySelector(`option[value="${unitId}"]`);

          const locText = locOption?.textContent?.trim() || "";
          const unitText = unitOption?.textContent?.trim() || "";

          // Only show values if they're not "Not Set"
          if (locText === "Not Set" && unitText === "Not Set") {
            displayVal = "Not Set";
          } else if (locText === "Not Set") {
            displayVal = unitText;
          } else if (unitText === "Not Set") {
            displayVal = locText;
          } else {
            displayVal = `${locText} - ${unitText}`;
          }
        }

        // Multi-select
        else if (input.tagName === "SELECT" && input.multiple) {
          const selectedTexts = Array.from(input.selectedOptions).map((o) =>
            o.textContent.trim()
          );
          displayVal = selectedTexts.length > 0 ? selectedTexts.join(", ") : "Not Set";
        }

        // Single select
        else if (input.tagName === "SELECT" && !input.multiple) {
          const selectedOption = input.selectedOptions[0];
          if (selectedOption) displayVal = selectedOption.textContent.trim();
          if (!displayVal) displayVal = "Not Set";
        }

        // Checkbox
        else if (input.type === "checkbox") {
          displayVal = input.checked ? "Yes" : "No";
        }

        // Everything else (text/date)
        else {
          const val = (this.currentValues.has(field) ? this.currentValues.get(field) : input.value);
          displayVal = val || "Not Set";
        }

        // Do not change capitalization; render exactly as stored

        // Assign the final text
        valueEl.textContent = displayVal;
        valueEl.style.display = "inline-block";
      });

      // Hide the input again
      input.style.display = "none";

      // If it's a grouped field, hide the entire container
      if (group) {
        const fieldContainer = input.closest('.field-container') || this.element;
        const groupContainer = fieldContainer.querySelector(
          `.edit-input-group[data-group="${group}"]`
        );
        if (groupContainer) {
          groupContainer.style.display = "none";
        }
      }

      // Show the edit button again - use instance ID if available
      let editBtn = null;
      if (instanceId) {
        editBtn = this.element.querySelector(
          `[data-instance-id="${instanceId}"][data-edit-field-target="editButton"]`
        );
      } else {
        const fieldContainer = input.closest('.field-container') || this.element;
        editBtn = fieldContainer.querySelector(
          '[data-edit-field-target="editButton"][data-field="' + (group || field) + '"]'
        );
      }
      if (editBtn) {
        editBtn.style.display = "inline-block";
      }
    });

    // Clear changed fields
    this.changedFields.clear();
    this.hideSaveButton();
    this.hideCancelButton();
  }

  /* ------------------------------------------------------------
   * HELPER: Calculate Age from a Date
   * ------------------------------------------------------------ */
  calculateAge(dob) {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /* ------------------------------------------------------------
   * HELPER: Humanize a string
   * e.g. "female" => "Female"
   *      "short hair" => "Short Hair"
   *      "rough_coat" => "Rough Coat"
   * ------------------------------------------------------------ */
  humanizeString(str) {
    if (!str || typeof str !== "string") return str;
    // Replace underscores with spaces, then Title Case each word
    return str
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /* ------------------------------------------------------------
   * SHOW/HIDE Buttons
   * ------------------------------------------------------------ */
  showSaveButton() {
    if (this.saveButtonTarget) {
      this.saveButtonTarget.style.display = "inline-block";
    }
  }
  hideSaveButton() {
    if (this.saveButtonTarget) {
      this.saveButtonTarget.style.display = "none";
    }
  }
  showCancelButton() {
    if (this.cancelButtonTarget) {
      this.cancelButtonTarget.style.display = "inline-block";
      const container = this.cancelButtonTarget.closest(".button-container");
      if (container) container.style.display = "inline-block";
    }
  }
  hideCancelButton() {
    if (this.cancelButtonTarget) {
      this.cancelButtonTarget.style.display = "none";
      const container = this.cancelButtonTarget.closest(".button-container");
      if (container) {
        const anyVisible = Array.from(container.querySelectorAll("button")).some(
          (btn) => btn.style.display !== "none"
        );
        if (!anyVisible) container.style.display = "none";
      }
    }
  }

  /* ------------------------------------------------------------
   * SUCCESS/ERROR Messages
   * ------------------------------------------------------------ */
  showSuccessMessage(msg) {
    // Remove any existing toast
    const existing = document.querySelector('.global-toast');
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.className = "global-toast alert alert-success alert-dismissible fade show";
    el.setAttribute("role", "alert");
    el.innerHTML = `
      <div>${msg}</div>
      <button type="button" class="btn-close" aria-label="Close"></button>
    `;

    // Close handler
    el.querySelector(".btn-close").addEventListener("click", () => {
      el.classList.remove("show");
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    });

    document.body.appendChild(el);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (el.parentNode) {
        el.classList.remove("show");
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 250);
      }
    }, 5000);
  }
  showErrorMessage(msg) {
    // Normalize technical JSON parse errors into a friendlier message
    let friendlyMsg = msg || "Something went wrong while saving. Please try again.";
    if (friendlyMsg.includes("Unexpected token") || friendlyMsg.includes("valid JSON")) {
      friendlyMsg = "Something went wrong while saving. Please try again, and check the server logs if it continues.";
    }

    // Remove any existing toast
    const existing = document.querySelector('.global-toast');
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.className = "global-toast alert alert-danger alert-dismissible fade show";
    el.setAttribute("role", "alert");
    el.innerHTML = `
      <div>${friendlyMsg}</div>
      <button type="button" class="btn-close" aria-label="Close"></button>
    `;

    // Close handler
    el.querySelector(".btn-close").addEventListener("click", () => {
      el.classList.remove("show");
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    });

    document.body.appendChild(el);

    // Auto-remove after 8 seconds (errors linger a bit longer)
    setTimeout(() => {
      if (el.parentNode) {
        el.classList.remove("show");
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 250);
      }
    }, 8000);
  }
}