import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("GlobalAlertController connected!", this.element);
  }

  close(event) {
    console.log("Close clicked!");
    this.element.remove();
  }
} 