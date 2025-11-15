class ProfilesController < ApplicationController
  before_action :authenticate_user!

  def show
    @user = current_user
  end

  def update
    @user = current_user
    
    # Handle password change separately if password fields are present
    if params[:user].present? && params[:user][:password].present? && params[:user][:password].strip.present?
      if @user.update_with_password(user_params)
        # Sign in again after password change
        bypass_sign_in(@user)
        
        respond_to do |format|
          format.html { redirect_to profile_path, notice: 'User details updated successfully!' }
          format.json { render json: { success_message: "User details updated successfully!", user: user_json }, status: :ok }
        end
      else
        respond_to do |format|
          format.html { render :show, status: :unprocessable_entity }
          format.json { render json: { error: @user.errors.full_messages }, status: :unprocessable_entity }
        end
      end
    else
      # Remove password fields if they're blank
      update_params = user_params.except(:password, :password_confirmation, :current_password)
      
      if @user.update(update_params)
        respond_to do |format|
          format.html { redirect_to profile_path, notice: 'User details updated successfully!' }
          format.json { render json: { success_message: "User details updated successfully!", user: user_json }, status: :ok }
        end
      else
        respond_to do |format|
          format.html { render :show, status: :unprocessable_entity }
          format.json { render json: { error: @user.errors.full_messages }, status: :unprocessable_entity }
        end
      end
    end
  end

  private

  def user_params
    params.require(:user).permit(
      :email, 
      :first_name, 
      :last_name, 
      :birthdate,
      :gender,
      :city,
      :state,
      :county,
      :zip_code,
      :password, 
      :password_confirmation, 
      :current_password
    )
  end

  def user_json
    {
      id: @user.id,
      email: @user.email,
      first_name: @user.first_name,
      last_name: @user.last_name,
      birthdate: @user.birthdate,
      gender: @user.gender,
      city: @user.city,
      state: @user.state,
      county: @user.county,
      zip_code: @user.zip_code,
      full_name: @user.full_name
    }
  end
end

