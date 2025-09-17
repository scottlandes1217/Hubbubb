class Users::SessionsController < Devise::SessionsController
  def create
    Rails.logger.debug "=== Authentication Attempt ==="
    Rails.logger.debug "Email: #{params[:user][:email]}"
    Rails.logger.debug "Password length: #{params[:user][:password].length}"
    Rails.logger.debug "Raw params: #{params.inspect}"
    
    super do |resource|
      Rails.logger.debug "=== Authentication Result ==="
      Rails.logger.debug "Success: #{resource.persisted?}"
      Rails.logger.debug "Errors: #{resource.errors.full_messages.join(', ')}"
      Rails.logger.debug "User attributes: #{resource.attributes.except('encrypted_password')}"
      Rails.logger.debug "Role: #{resource.role}"
      Rails.logger.debug "Warden authentication result: #{warden.authenticated?(:user)}"
      Rails.logger.debug "Current user: #{current_user.inspect}"
    end
  end

  protected

  def after_sign_in_path_for(resource)
    Rails.logger.debug "=== After Sign In Path ==="
    Rails.logger.debug "User role: #{resource.role}"
    Rails.logger.debug "User attributes: #{resource.attributes.except('encrypted_password')}"
    Rails.logger.debug "Impersonated?: #{resource.impersonated?}"
    Rails.logger.debug "True user: #{resource.true_user&.inspect}"
    
    # Normal login flow - don't check impersonation here
    if resource.admin?
      admin_home_path
    elsif resource.shelter_staff?
      if resource.organizations.count == 1
        # If they only have one organization, go directly to it
        organization_path(resource.organizations.first)
      else
        # If they have multiple organizations or none, show the organizations index
        organizations_path
      end
    else
      user_home_home_path
    end
  end
end 