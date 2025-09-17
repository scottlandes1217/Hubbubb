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
 * EDIT
 * ------------------------------------------------------------ */
  edit(event) {
  event.preventDefault();
  event.stopPropagation();

  // Use event.currentTarget so we always get the button's data attributes
  const button = event.currentTarget;
  console.log('[EditField] edit click', { button, dataset: { field: button?.dataset?.field, group: button?.dataset?.group } });
  const group = button.dataset.group;
  const field = button.dataset.field;
  console.log("[edit] Clicked edit button:", { group, field });

  if (group) {
    // 1) Find the <span> to hide
    const valueElement = this.valueTargets.find(
      (el) => el.dataset.field === group
    );
    console.log("[edit] valueElement for group =", group, valueElement);

    // 2) Find the group container <div class="edit-input-group" data-group="XYZ">
    const groupContainer = this.element.querySelector(
      `.edit-input-group[data-group="${group}"]`
    );

    // Hide the static text <span>
    if (valueElement) {
      valueElement.style.display = "none";
    }

    // Show the grouped container
    if (groupContainer) {
      groupContainer.style.display = "flex";
    }

    // Also show each input inside that container
    const inputElements = this.inputTargets.filter(
      (el) => el.dataset.group === group
    );
    inputElements.forEach((inputEl) => {
      inputEl.style.display = "inline-block"; // or "block"
    });

    // Hide the edit button
    button.style.display = "none";

    // Show the cancel button
    this.showCancelButton();

    // Listen for input changes to show/hide the Save button
    console.log("[edit] inputElements in group =", group, inputElements);

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
    // Single field
    const valueElement = this.valueTargets.find(
      (el) => el.dataset.field === field
    );
    const inputElement = this.inputTargets.find(
      (el) => el.dataset.field === field
    );

    // Hide the static text
    if (valueElement) valueElement.style.display = "none";
    // Show the <input> or <select>
    if (inputElement) inputElement.style.display = "inline-block";

    // Focus for convenience
    inputElement.focus();

    // Hide the edit button
    button.style.display = "none";

    // Show the cancel button
    this.showCancelButton();

    // Watch for changes
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

      if (input.type === "checkbox") {
        data[field] = input.checked;
      } else if (input.tagName === "SELECT" && input.multiple) {
        data[field] = Array.from(input.selectedOptions).map((o) => o.value);
      } else {
        data[field] = input.value; // includes single <select>, text, date...
      }
    });

    // Ensure required fields are present
    const requiredFields = {
      name: data.name || this.currentValues.get('name'),
      species_id: data.species_id || this.currentValues.get('species_id'),
      breed: data.breed || this.currentValues.get('breed') || [],
      description: data.description || this.currentValues.get('description'),
      status: data.status || this.currentValues.get('status') || 'available'
    };

    // Merge required fields with any changed fields
    const finalData = { ...requiredFields, ...data };

    console.log("Sending data to server:", finalData);

    fetch(this.url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
          .content,
      },
      body: JSON.stringify({ pet: finalData }),
    })
      .then((response) => {
        console.log("Fetch response. Status:", response.status);
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(`Response not ok. Status: ${response.status}. Errors: ${JSON.stringify(err)}`);
          });
        }
        return response.json();
      })
      .then((json) => {
        console.log("Pet updated successfully:", json);
        // If a name was updated, reflect immediately in visible header name
        if (json && json.pet && json.pet.name) {
          try {
            const headerName = document.querySelector('.name-field-header .value, .pet-header .value');
            if (headerName) headerName.textContent = json.pet.name;
            // Keep container dataset in sync for refreshes and pinned tabs
            const petContainer = document.querySelector('[data-controller~="pet"]');
            if (petContainer) petContainer.dataset.petName = json.pet.name;
          } catch(_) {}
        }
        this.showSuccessMessage(
          json.success_message || "Pet details updated successfully!"
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
        console.error("Error updating pet:", err);
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

      // Find matching span(s)
      let valueElements = [];
      if (group) {
        valueElements = this.valueTargets.filter(
          (el) => el.dataset.field === group
        );
      } else {
        valueElements = this.valueTargets.filter(
          (el) => el.dataset.field === field
        );
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
        const groupContainer = this.element.querySelector(
          `.edit-input-group[data-group="${group}"]`
        );
        if (groupContainer) {
          groupContainer.style.display = "none";
        }
      }

      // Show the edit button again
      const editBtn = this.editButtonTargets.find(
        (el) => el.dataset.field === (group || field)
      );
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
    const el = document.createElement("div");
    el.className = "alert alert-success";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  showErrorMessage(msg) {
    const el = document.createElement("div");
    el.className = "alert alert-danger";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}