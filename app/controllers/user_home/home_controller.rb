module UserHome
  class HomeController < ApplicationController
    before_action :authorize_basic_user!

    def index
      # Add any necessary instance variables or logic for the basic user home page
    end

    private

    def authorize_basic_user!
      unless current_user&.basic_user?
        redirect_to root_path, alert: 'You are not authorized to access this page.'
      end
    end
  end
end 