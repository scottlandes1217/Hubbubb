class ApplicationController < ActionController::Base
  before_action :authenticate_user!, unless: :devise_controller?
  before_action :set_organization
  before_action :setup_navbar_data
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:first_name, :last_name, :role, organization_ids: []])
    devise_parameter_sanitizer.permit(:account_update, keys: [:first_name, :last_name, :role, organization_ids: []])
  end

  # Override current_user to handle impersonation
  def current_user
    user = super
    return user unless user

    # If the user is being impersonated, return the impersonated user
    if user.impersonated_by_id.present?
      # Use find_by to avoid recursion and get a fresh instance
      User.find_by(id: user.id)
    else
      user
    end
  end

  # Add a method to get the true user (the admin who is impersonating)
  def true_user
    return unless current_user&.impersonated_by_id.present?
    User.find_by(id: current_user.impersonated_by_id)
  end

  # Add a method to check if the current user is being impersonated
  def impersonated?
    current_user&.impersonated_by_id.present?
  end

  private

  def set_organization
    return unless current_user&.shelter_staff?
    @organization = current_user.organizations.first
  end

  def setup_navbar_data
    return unless current_user
    @pinned_tabs = current_user.pinned_tabs.ordered
    Rails.logger.info "Setting up navbar data - Pinned tabs: #{@pinned_tabs.map { |t| { id: t.id, title: t.title, position: t.position, tab_type: t.tab_type } }}"
  end
end
