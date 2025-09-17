module Admin
  class HomeController < ApplicationController
    before_action :authenticate_user! # Ensure the user is signed in
    before_action :authorize_admin!

    def index
      # Logic for the admin home page (e.g., list organizations)
      @organizations = Organization.all
    end

    private

    def authorize_admin!
      # Ensure only admin users can access this controller
      redirect_to root_path, alert: 'Not authorized' unless current_user&.admin?
    end
  end
end