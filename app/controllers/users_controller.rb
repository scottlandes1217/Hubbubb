class UsersController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin, except: [:stop_impersonating]
  before_action :set_user, only: [:edit, :update, :impersonate, :stop_impersonating]

  def index
    @users = User.all.order(created_at: :desc)
    if params[:search].present?
      @users = @users.where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?", 
                           "%#{params[:search]}%", "%#{params[:search]}%", "%#{params[:search]}%")
    end
    @users = @users.page(params[:page])
  end

  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)
    
    # Clear organization associations for non-shelter staff
    @user.organization_ids = [] unless @user.shelter_staff?

    if @user.save
      redirect_to users_path, notice: 'User was successfully created.'
    else
      Rails.logger.info "User creation failed: #{@user.errors.full_messages.join(', ')}"
      flash.now[:alert] = 'Please check the form for errors.'
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    # Clear organization associations for non-shelter staff
    if user_params[:role] != 'shelter_staff'
      params[:user][:organization_ids] = []
    end

    if @user.update(user_params)
      redirect_to users_path, notice: 'User was successfully updated.'
    else
      flash.now[:alert] = 'Please check the form for errors.'
      render :edit
    end
  end

  def search
    @users = User.search_by_name(params[:query])
    render json: @users.map { |user| { id: user.id, text: user.full_name } }
  end

  def impersonate
    if current_user.can_impersonate?(@user)
      # Store the admin user's ID
      admin_id = current_user.id

      # Set the impersonated_by_id on the target user
      if @user.update(impersonated_by_id: admin_id)
        # Sign in as the impersonated user
        bypass_sign_in(@user)
        
        flash[:notice] = "You are now impersonating #{@user.full_name}"
        
        # Redirect based on the impersonated user's role
        if @user.shelter_staff?
          if @user.organizations.count == 1
            redirect_to organization_path(@user.organizations.first)
          else
            redirect_to organizations_path
          end
        else
          redirect_to user_home_home_path
        end
      else
        redirect_to users_path, alert: "Failed to impersonate user"
      end
    else
      redirect_to users_path, alert: "You cannot impersonate this user"
    end
  end

  def stop_impersonating
    Rails.logger.debug "=== Stop Impersonating ==="
    Rails.logger.debug "Current user: #{current_user.inspect}"

    # Get the admin user from the impersonated_by_id
    admin_user = User.find_by(id: current_user.impersonated_by_id)
    Rails.logger.debug "Admin user: #{admin_user.inspect}"

    if admin_user
      # Store the impersonated user for cleanup
      impersonated_user = current_user
      Rails.logger.debug "Impersonated user: #{impersonated_user.inspect}"

      # Clear the impersonation state
      impersonated_user.update_column(:impersonated_by_id, nil)
      Rails.logger.debug "Cleared impersonation state"

      # Clear all session data
      reset_session
      Rails.logger.debug "Reset session"

      # Force Devise to forget the current user
      warden.logout
      Rails.logger.debug "Logged out all users"

      # Force a new sign in with the admin user
      warden.set_user(admin_user, scope: :user)
      Rails.logger.debug "Set warden user to admin"

      # Create a new session with the admin user
      sign_in(:user, admin_user)
      Rails.logger.debug "Signed in as admin: #{admin_user.email}"

      # Redirect to admin home
      redirect_to admin_home_path, notice: "Stopped impersonating user"
    else
      Rails.logger.debug "No admin user found"
      redirect_to users_path, alert: "You are not impersonating any user"
    end
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:email, :first_name, :last_name, :role, :password, :password_confirmation, organization_ids: [])
  end

  def require_admin
    unless current_user&.admin?
      redirect_to root_path, alert: "You are not authorized to access this page."
    end
  end
end 