module Admin
  class UsersController < ApplicationController
    before_action :set_user, only: [:edit, :update, :destroy]

    def index
      @query = params[:query]
      @users = if @query.present?
        User.where("email ILIKE :query OR first_name ILIKE :query OR last_name ILIKE :query", query: "%#{@query}%")
      else
        User.all
      end
      @users = @users.order(:email).page(params[:page]).per(10)
    end

    def edit
    end

    def update
      if @user.update(user_params)
        redirect_to admin_users_path, notice: "User updated successfully."
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @user.destroy
      redirect_to admin_users_path, notice: "User deleted."
    end

    private

    def set_user
      @user = User.find(params[:id])
    end

    def user_params
      params.require(:user).permit(:email, :first_name, :last_name, :role)
    end
  end
end 