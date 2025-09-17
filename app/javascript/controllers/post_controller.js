import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "imageModal",
    "uploadInput",
    "selectedImages",
    "gallery",
    "fileInputLabel",
    "addToGalleryCheckboxContainer",
  ];

  connect() {
    console.log("Post controller connected");
    this.selectedGalleryImages = new Set();
    this.uploadedImages = [];
  }

  openImageModal() {
    if (this.imageModalTarget) {
      this.imageModalTarget.style.display = "block";
      console.log("Image modal opened");
    }
  }

  closeImageModal() {
    if (this.imageModalTarget) {
      this.imageModalTarget.style.display = "none";
      console.log("Image modal closed");
    }
  }

  selectImageFromGallery(event) {
    const photoId = event.currentTarget.dataset.photoId;

    if (!photoId) {
      console.error("No photo ID found for selected image.");
      return;
    }

    if (this.selectedGalleryImages.has(photoId)) {
      this.selectedGalleryImages.delete(photoId);
      event.currentTarget.classList.remove("selected");
    } else {
      this.selectedGalleryImages.add(photoId);
      event.currentTarget.classList.add("selected");
    }

    console.log("Selected gallery images:", Array.from(this.selectedGalleryImages));
  }

  uploadInputChanged(event) {
    const files = Array.from(event.target.files);
  
    // Add files to the uploaded images array and display them in the preview
    files.forEach((file) => {
      if (!this.uploadedImages.find((uploadedFile) => uploadedFile.name === file.name && uploadedFile.size === file.size)) {
        this.uploadedImages.push(file);
  
        // Create a preview thumbnail for the uploaded file
        const imgContainer = document.createElement("div");
        imgContainer.classList.add("selected-image-container");
  
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file); // Temporary URL for preview
        img.alt = "Uploaded Image";
        img.classList.add("thumbnail");
  
        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        removeButton.classList.add("remove-photo");
        removeButton.dataset.action = "click->post#removeImage";
  
        imgContainer.appendChild(img);
        imgContainer.appendChild(removeButton);
        this.selectedImagesTarget.appendChild(imgContainer);
      }
    });
  
    console.log("Uploaded images:", this.uploadedImages);
  
    // Update the file count label
    const fileCount = this.uploadedImages.length;
    if (this.fileInputLabelTarget) {
      this.fileInputLabelTarget.textContent = fileCount > 0 ? `${fileCount} file(s) selected` : "No files selected";
    }
  
    // Show or hide the "Add to Gallery" checkbox
    if (this.hasAddToGalleryCheckboxContainerTarget) {
      this.addToGalleryCheckboxContainerTarget.style.display = fileCount > 0 ? "block" : "none";
    }
  
    // Clear the file input to allow re-selection of the same files
    event.target.value = null;
  }  

addSelectedImages(event) {
    console.log("Adding selected images to the preview...");
  
    // Add selected gallery images to the preview
    this.selectedGalleryImages.forEach((photoId) => {
      const galleryItem = document.querySelector(`.gallery-item[data-photo-id="${photoId}"]`);
      if (!galleryItem) return;
  
      const photoUrl = galleryItem.dataset.photoUrl;
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("selected-image-container");
      imgContainer.dataset.photoId = photoId;
  
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = "Gallery Image";
      img.classList.add("thumbnail");
  
      const removeButton = document.createElement("button");
      removeButton.textContent = "X";
      removeButton.classList.add("remove-photo");
      removeButton.dataset.action = "click->post#removeImage";
      removeButton.dataset.photoId = photoId;
  
      imgContainer.appendChild(img);
      imgContainer.appendChild(removeButton);
      this.selectedImagesTarget.appendChild(imgContainer);
  
      galleryItem.style.display = "none";
    });
  
    console.log("Gallery images added to the preview.");
    this.closeImageModal();
  }  

  updatePreview() {
    const selectedImagesContainer = this.selectedImagesTarget;

    // Clear previous preview
    selectedImagesContainer.innerHTML = "";

    // Render selected gallery images
    this.selectedGalleryImages.forEach((photoId) => {
      const galleryItem = document.querySelector(`.gallery-item[data-photo-id="${photoId}"]`);
      const photoUrl = galleryItem.dataset.photoUrl;

      const container = document.createElement("div");
      container.classList.add("selected-image-container");
      container.dataset.photoId = photoId;

      const img = document.createElement("img");
      img.src = photoUrl;
      img.classList.add("thumbnail");

      const removeButton = document.createElement("button");
      removeButton.textContent = "X";
      removeButton.classList.add("remove-photo");
      removeButton.dataset.action = "click->post#removeImage";
      removeButton.dataset.photoId = photoId;

      container.appendChild(img);
      container.appendChild(removeButton);
      selectedImagesContainer.appendChild(container);
    });

    // Render uploaded images
    this.uploadedImages.forEach((file) => {
      const container = document.createElement("div");
      container.classList.add("selected-image-container");

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.classList.add("thumbnail");

      const removeButton = document.createElement("button");
      removeButton.textContent = "X";
      removeButton.classList.add("remove-photo");
      removeButton.dataset.action = "click->post#removeImage";
      removeButton.dataset.fileName = file.name;

      container.appendChild(img);
      container.appendChild(removeButton);
      selectedImagesContainer.appendChild(container);
    });
  }

  removeImage(event) {
    const photoId = event.currentTarget.dataset.photoId;
    const fileName = event.currentTarget.dataset.fileName;

    if (photoId) {
      this.selectedGalleryImages.delete(photoId);
    }

    if (fileName) {
      this.uploadedImages = this.uploadedImages.filter((file) => file.name !== fileName);
    }

    this.updatePreview();
  }

  submitForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
  
    // Append uploaded images
    this.uploadedImages.forEach((file) => {
      formData.append("post[images][]", file);
    });
  
    // Append selected gallery images
    this.selectedGalleryImages.forEach((photoId) => {
      formData.append("gallery_image_ids[]", photoId);
    });
  
    // Add the "Add to Gallery" checkbox state
    if (this.hasAddToGalleryCheckboxContainerTarget) {
      const addToGalleryCheckbox = document.getElementById("addToGalleryCheckbox");
      if (addToGalleryCheckbox && addToGalleryCheckbox.checked) {
        formData.append("add_to_gallery", true);
      }
    }
  
    fetch(form.action, {
      method: "POST",
      body: formData,
      headers: {
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
    })
      .then((response) => {
        if (response.ok) {
          window.location.href = response.url;
        } else {
          return response.text().then((text) => {
            console.error("Form submission failed:", text);
          });
        }
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
      });
  }

  triggerFileUpload() {
    // Trigger the click event on the hidden file input
    this.uploadInputTarget.click();
  }

}