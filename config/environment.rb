# Load the Rails application.
require_relative "application"

# Initialize the Rails application.
Rails.application.initialize!

# Force reload routes after initialization
Rails.application.routes.draw do
  Rails.application.routes_reloader.reload!
end
