module ShelterStaff
  class HomeController < ApplicationController
    before_action :authenticate_user!
    before_action :authorize_shelter_staff!

    def index
      # Fetch any shelter staff-specific data here (e.g., assigned organizations, pets, etc.)
    end

    private

    def authorize_shelter_staff!
      redirect_to root_path, alert: 'Not authorized' unless current_user.shelter_staff?
    end
  end
end