pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "bootstrap", to: "https://ga.jspm.io/npm:bootstrap@5.3.0/dist/js/bootstrap.esm.js"
pin "@popperjs/core", to: "https://ga.jspm.io/npm:@popperjs/core@2.11.8/lib/index.js"
pin "trix", to: "https://unpkg.com/trix@2.0.0/dist/trix.esm.js"
pin "@rails/actiontext", to: "actiontext.esm.js"
pin "@rails/ujs", to: "@rails--ujs.js" # @7.1.3
