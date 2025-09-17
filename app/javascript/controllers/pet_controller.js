import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["imageModal", "uploadInput", "selectedImages", "gallery", "selectedFiles"];

  connect() {
    console.log("Pet controller connected");
    // Get pet ID for storing tab state per pet
    const currentPetId = this.element.dataset.petId;
    
    // Initialize the active tab from localStorage using pet-specific key, or default to 'details'
    const activeTab = localStorage.getItem(`pet_${currentPetId}_activeTab`) || 'details';
    this.showTab(activeTab);

    this.selectedGalleryImage = null;
    this.uploadedImageFiles = null;
  
    // Monitor hash changes for dynamic tab updates
    window.addEventListener("hashchange", () => {
      const newTab = this.getActiveTabFromHash();
      if (newTab) {
        this.showTab(newTab);
      }
    });

    // Always dispatch pet:opened event - let the tabbed navigation controller handle the logic
    const petId = this.element.dataset.petId;
    const petName = this.element.dataset.petName;
    const petUrl = window.location.href;
    
    if (petId && petName) {
      console.log(`Pet page loaded, dispatching pet:opened for pet: ${petName} (ID: ${petId})`);
      const event = new CustomEvent('pet:opened', {
        detail: { petId: petId, petName: petName, petUrl: petUrl, fromPinButton: false }
      });
      window.dispatchEvent(event);
    }
  }

  disconnect() {
    // Clean up any event listeners if needed
  }

  /* -----------------------------------------
   * TAB SWITCHING
   * ----------------------------------------- */
  switchTab(event) {
    const tabId = event.currentTarget.dataset.tab;
    console.log("Switching to tab:", tabId);
    this.showTab(tabId);
  }

  showTab(tabId) {
    // Get pet ID for storing tab state per pet
    const currentPetId = this.element.dataset.petId;
    
    // Store the active tab in localStorage using pet-specific key
    localStorage.setItem(`pet_${currentPetId}_activeTab`, tabId);

    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.style.display = "none";
    });

    // Remove active class from all tab links
    document.querySelectorAll(".tab-link").forEach((link) => {
      link.classList.remove("active");
    });

    // Show the selected tab content
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) {
      selectedContent.style.display = "block";
      
      // If it's a lazy-loaded tab, ensure the turbo frame is loaded
      const turboFrame = selectedContent.querySelector("turbo-frame");
      if (turboFrame && !turboFrame.src) {
        turboFrame.src = turboFrame.dataset.src;
      }
    }

    // Add active class to the tab link
    const tabLink = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabLink) {
      tabLink.classList.add("active");
    }
  }

  updateHash(tab) {
    history.replaceState(null, null, `#${tab}`);
  }

  getActiveTabFromHash() {
    const hash = window.location.hash.replace("#", "");
    return hash || "details";
  }

  /* -----------------------------------------
   * MODAL OPEN/CLOSE
   * ----------------------------------------- */
  openImageModal() {
    if (this.imageModalTarget) {
      this.imageModalTarget.style.display = "block";
      console.log("Image modal opened");
  
      // 1) Unmark any previously selected gallery item
      if (this.selectedGalleryImage) {
        const prevDiv = this.galleryTarget.querySelector(
          `.gallery-item[data-photo-id="${this.selectedGalleryImage}"]`
        );
        if (prevDiv) {
          prevDiv.classList.remove("selected");
        }
        this.selectedGalleryImage = null;
      }
  
      // 2) Clear the preview section
      this.clearPreview();
    }
  }

  closeImageModal() {
    if (this.imageModalTarget) {
      this.imageModalTarget.style.display = "none";
      console.log("Image modal closed");
    }
  }

  /* -----------------------------------------
   * SELECT A GALLERY IMAGE (for main photo)
   * ----------------------------------------- */
  selectImageFromGallery(event) {
    console.log("selectImageFromGallery called!");
    const photoId = event.currentTarget.dataset.photoId;
    const photoUrl = event.currentTarget.dataset.photoUrl;

    if (!photoId) {
      console.error("No photo ID found for selected image.");
      return;
    }

    // Unmark previous selection
    if (this.selectedGalleryImage) {
      const prevDiv = this.galleryTarget.querySelector(
        `.gallery-item[data-photo-id="${this.selectedGalleryImage}"]`
      );
      if (prevDiv) prevDiv.classList.remove("selected");
    }

    // Mark this new selection
    this.selectedGalleryImage = photoId;
    event.currentTarget.classList.add("selected");

    // Clear any uploaded file reference
    this.uploadedImageFiles = null;

    // Show a preview
    this.clearPreview();
    this.addImageToPreview(photoUrl, "Selected Gallery Image");
  }

  /* -----------------------------------------
   * FILE UPLOAD HANDLING
   * ----------------------------------------- */
  triggerFileInput() {
    this.uploadInputTarget.click();
  }

  uploadInputChanged(event) {
    const files = event.target.files;
    if (!files.length) {
      console.error("No files selected.");
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("pet[gallery_photos][]", file);
    });
  
    // e.g., "/organizations/1/pets/42/gallery"
    const formAction = `${this.element.dataset.url}/gallery`;
    console.log("Uploading photos to:", formAction);
  
    fetch(formAction, {
      method: "POST",
      body: formData,
      headers: {
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to upload photos.");
        return response.json();
      })
      .then((data) => {
        console.log("Photos uploaded successfully");
  
        // Update the main gallery
        const galleryContainer = document.querySelector(".gallery-container");
        if (galleryContainer && data.html) {
          galleryContainer.innerHTML = data.html;
        }
  
        // Update the modal gallery if it exists
        if (this.hasGalleryTarget && data.modal_html) {
          this.galleryTarget.innerHTML = data.modal_html;
        }
  
        // Clear the file input
        event.target.value = "";
      })
      .catch((error) => {
        console.error("Error uploading photos:", error);
      });
  }

  /* -----------------------------------------
   * SHOW PREVIEW FOR SELECTED IMAGE
   * ----------------------------------------- */
  addImageToPreview(imageSrc, altText) {
    if (!this.selectedImagesTarget) {
      console.error('Missing target element "selectedImages" for "pet" controller');
      return;
    }

    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = altText;
    img.classList.add("thumbnail");

    this.selectedImagesTarget.appendChild(img);
  }

  clearPreview() {
    if (this.selectedImagesTarget) {
      this.selectedImagesTarget.innerHTML = "";
    }
  }

  /* -----------------------------------------
   * ADD SELECTED IMAGE -> Update Main Photo
   * ----------------------------------------- */
  addSelectedImage(event) {
    event.preventDefault();
    if (!this.selectedGalleryImage && !this.uploadedImageFiles) {
      console.error("No image selected or uploaded.");
      return;
    }
  
    const formData = new FormData();
    if (this.selectedGalleryImage) {
      formData.append("gallery_image_id", this.selectedGalleryImage);
    } else if (this.uploadedImageFiles) {
      this.uploadedImageFiles.forEach((file) => {
        formData.append("pet[gallery_photos][]", file);
      });
    }
  
    // PATCH to /pets/:id
    fetch(this.element.dataset.url, {
      method: "PATCH",
      body: formData,
      headers: {
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to update photo.");
        return response.json();
      })
      .then((data) => {
        if (data.photo_url) {
          console.log(data.success_message || "Photo updated successfully!");
          // Update the main header image
          const headerPhoto = document.querySelector(".pet-photo");
          if (headerPhoto) {
            headerPhoto.src = data.photo_url;
          }
        } else {
          console.error("No photo URL returned from server.");
        }
      })
      .catch((error) => {
        console.error("Error updating photo:", error);
      });
  
    this.closeImageModal();
  }

  /* -----------------------------------------
   * DELETE PHOTO -> Re-render partial
   * ----------------------------------------- */
  deletePhoto(event) {
    event.preventDefault();

    const deleteButton = event.currentTarget;
    const photoId = deleteButton.dataset.photoId;
    if (!photoId) {
      console.error("No photo ID found for deletion.");
      return;
    }

    const formAction = `${this.element.dataset.url}/gallery?photo_id=${photoId}`;
    console.log("Deleting photo at:", formAction);

    fetch(formAction, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to delete the gallery photo.");
        return response.json();
      })
      .then((data) => {
        console.log("Photo deleted successfully");

        // Update main gallery
        const galleryContainer = document.querySelector(".gallery-container");
        if (galleryContainer && data.html) {
          galleryContainer.innerHTML = data.html;
        }

        // Update modal gallery
        if (this.hasGalleryTarget && data.modal_html) {
          this.galleryTarget.innerHTML = data.modal_html;
        }
      })
      .catch((error) => {
        console.error("Error deleting photo:", error);
      });
  }
  
  async togglePin(event) {
    const button = event.currentTarget
    const petId = button.dataset.petId
    const isPinned = button.classList.contains('pinned')
    
    try {
      if (isPinned) {
        // Unpin the pet
        const response = await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        
        if (response.ok) {
          button.classList.remove('pinned')
          button.title = 'Pin to navigation'
          button.querySelector('i').classList.remove('text-warning')
          
          // Emit unpinned event
          const event = new CustomEvent('pet:unpinned', {
            detail: { petId: petId }
          })
          document.dispatchEvent(event)
        }
      } else {
        // Pin the pet
        const response = await fetch('/pinned_tabs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ pet_id: petId })
        })
        
        if (response.ok) {
          button.classList.add('pinned')
          button.title = 'Unpin from navigation'
          button.querySelector('i').classList.add('text-warning')
          
          // Emit pinned event
          const event = new CustomEvent('pet:pinned', {
            detail: { petId: petId }
          })
          document.dispatchEvent(event)
        }
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }
}