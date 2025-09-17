import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  connect() {
    console.log("OrganizationFieldsController connected!");
  }

  // Add new field
  addField(event) {
    event.preventDefault();

    const form = event.target.closest("form");
    const formData = new FormData(form); // Collect all form data
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");

    fetch(form.action, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Accept": "application/json", // Request JSON response
      },
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        if (data.id) {
          const fieldType = form.dataset.fieldType;
          let container, newItem;

          if (fieldType === "flags") {
            // For flags, we append a new table row (<tr>) to the tbody with id "flags-list"
            container = document.getElementById("flags-list");
            newItem = document.createElement("tr");
            newItem.dataset.fieldId = data.id;
            newItem.innerHTML = `
              <td>${data.icon_url ? `<img src="${data.icon_url}" alt="${data.value} Icon" style="width: 24px; height: 24px;" />` : '<span class="text-muted">No Icon</span>'}</td>
              <td>${data.value}</td>
              <td>${data.priority ? data.priority : "N/A"}</td>
              <td>
                <button class="delete-field btn btn-sm btn-danger" data-action="organization-fields#deleteField" data-field-id="${data.id}">Delete</button>
              </td>
            `;
          } else {
            // For other field types, assume a <ul> exists with id like "species-list", etc.
            container = document.getElementById(`${fieldType}-list`);
            newItem = document.createElement("li");
            newItem.className = "list-group-item d-flex justify-content-between align-items-center";
            newItem.dataset.fieldId = data.id;
            newItem.innerHTML = `
              ${data.value} 
              ${data.icon_url ? `<img src="${data.icon_url}" alt="${data.value} Icon" style="width: 24px; height: 24px; margin-left: 10px;">` : ""}
              ${data.priority ? ` (<span>Priority: ${data.priority}</span>)` : ""}
              <button class="delete-field btn btn-sm btn-danger" data-action="organization-fields#deleteField" data-field-id="${data.id}">Delete</button>
            `;
          }
          container.appendChild(newItem);
          form.reset();
        } else {
          alert("Failed to save the field. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error adding field:", error);
        alert("An error occurred. Please try again.");
      });
  }

  deleteField(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const fieldId = button.dataset.fieldId;
    const organizationId = this.element.dataset.organizationId;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
  
    fetch(`/organizations/${organizationId}/organization_fields/${fieldId}`, {
      method: "DELETE",
      headers: {
        "Accept": "application/json",
        "X-CSRF-Token": csrfToken
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Try to remove the closest table row (<tr>) if it exists, or a list item (<li>)
        const container = button.closest("tr") || button.closest("li");
        if (container) {
          container.remove();
        }
      })
      .catch((error) => {
        console.error("Error deleting field:", error);
        alert("Failed to delete the field. Please try again.");
      });
  }
}