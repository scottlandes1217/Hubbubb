import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["posts", "loadingIndicator"];

  connect() {
    console.log("Feed controller connected");

    // Force scroll to the top on page load
    window.scrollTo(0, 0);

    this.loading = false;
    this.nextPage = 2; // Start loading from page 2
    this.noMorePosts = false; // Flag for no more posts
    this.noMorePostsElement = document.getElementById("no-more-posts"); // Cache the "No more posts" element
    window.addEventListener("scroll", this.onScroll.bind(this));

    // --- Ad Impression Tracking ---
    this.trackedAds = new Set();
    this.observeAds();
    this.observeAdClicks();
  }

  disconnect() {
    window.removeEventListener("scroll", this.onScroll.bind(this));
  }

  onScroll() {
    if (this.loading || !this.nextPage || this.noMorePosts) return;

    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;

    if (nearBottom) {
      this.loadMorePosts();
    }
  }

  async loadMorePosts() {
    this.loading = true;
    this.loadingIndicatorTarget.style.display = "block";
    this.loadingIndicatorTarget.textContent = "Loading...";

    try {
      console.log(`Fetching page: ${this.nextPage}`);
      const response = await fetch(`/feed?page=${this.nextPage}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch more posts (status: ${response.status})`);
        throw new Error(`Failed to fetch more posts (status: ${response.status})`);
      }

      const data = await response.json();
      console.log("Fetched posts:", data);

      if (data.posts) {
        this.postsTarget.insertAdjacentHTML("beforeend", data.posts);
        // Observe new ads after loading more posts
        this.observeAds();
        this.observeAdClicks();
      }

      if (data.next_page) {
        this.nextPage = data.next_page;
      } else {
        console.log("No more pages to load");
        this.nextPage = null;
        this.noMorePosts = true;
        this.showNoMorePostsMessage();
      }
    } catch (error) {
      console.error("Error loading posts:", error);

      if (error.message.includes("500")) {
        console.log("Server returned 500. Assuming no more posts.");
        this.nextPage = null;
        this.noMorePosts = true;
        this.showNoMorePostsMessage();
      }
    } finally {
      this.loading = false;
      this.loadingIndicatorTarget.style.display = "none";
    }
  }

  showNoMorePostsMessage() {
    if (this.noMorePostsElement) {
      this.noMorePostsElement.style.display = "block"; // Show "No more posts" message
      console.log("Displayed 'No more posts' message");
    } else {
      console.warn("No more posts element not found. Cannot display 'No more posts' message.");
    }
  }

  observeAds() {
    const adElements = document.querySelectorAll(".ad[data-ad-id]");
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const adId = entry.target.getAttribute('data-ad-id');
          if (adId && !this.trackedAds.has(adId)) {
            this.trackedAds.add(adId);
            fetch('/ad_impressions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.getCSRFToken() },
              body: JSON.stringify({ ad_id: adId })
            });
          }
        }
      });
    }, { threshold: 0.5 });
    adElements.forEach(el => observer.observe(el));
  }

  observeAdClicks() {
    document.removeEventListener('click', this.handleAdClick, true);
    this.handleAdClick = this.handleAdClick || (event => {
      const btn = event.target.closest('.ad-click-btn');
      if (btn) {
        event.preventDefault();
        const adId = btn.getAttribute('data-ad-id');
        const adUrl = btn.getAttribute('data-ad-url') || '#';
        if (!btn.dataset.clicked) {
          btn.dataset.clicked = 'true';
          fetch('/ad_impressions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.getCSRFToken() },
            body: JSON.stringify({ ad_id: adId, impression_type: 'click' })
          }).finally(() => {
            window.location.href = adUrl;
          });
        } else {
          window.location.href = adUrl;
        }
      }
    });
    document.addEventListener('click', this.handleAdClick, true);
  }

  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta && meta.getAttribute('content');
  }
}