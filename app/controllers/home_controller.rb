class HomeController < ApplicationController
  skip_before_action :authenticate_user!, only: [:index]

  def index
    # Redirect unauthenticated users to sign in page
    redirect_to new_user_session_path unless user_signed_in?
    
    # Redirect authenticated users to their role-specific home page
    redirect_authenticated_user if user_signed_in?
  end

  private

  # Redirect authenticated users to their role-specific home page
  def redirect_authenticated_user
    if current_user.admin?
      redirect_to admin_home_path
    elsif current_user.shelter_staff?
      redirect_to shelter_staff_home_path
    elsif current_user.basic_user?
      # Basic users stay on the home page (no redirect)
      # The home page will be displayed
    else
      sign_out current_user
      redirect_to new_user_session_path, alert: 'Invalid role. Please contact support.'
    end
  end
end