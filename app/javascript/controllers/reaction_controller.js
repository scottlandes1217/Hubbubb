import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  sendReaction(event) {
    event.preventDefault()

    const button = event.currentTarget
    const postId = button.dataset.postId
    const reactionType = button.dataset.reactionType

    fetch(`/posts/${postId}/react?reaction_type=${reactionType}`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to set reaction.")
        return response.json()
      })
      .then((data) => {
        console.log("Reaction updated successfully!")

        // `data.updated_html` is the entire updated post partial.
        // Replace the old <div id="post-XX"> with this new HTML
        const postElem = document.querySelector(`#post-${postId}`)
        if (postElem && data.updated_html) {
          postElem.outerHTML = data.updated_html
        }
      })
      .catch((err) => {
        console.error("Error setting reaction:", err)
      })
  }
}