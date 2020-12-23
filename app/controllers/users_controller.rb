class UsersController < ApplicationController

  def index
    @users = User.sorted
  end

  def show
    @user = User.find(params[:id])
  end

  def new
    @user = User.new({:name => 'User'})
  end

  def create
    #store a new object using form parameters
    @user = User.new(user_params)
    #Save the object
    if @user.save
    #If save suceeds, redirect to user action
    flash[:notice] = "User created successfully"
    redirect_to (users_path)
    else
    #If save fails, redisplay the form
    render('new')
    end
  end

  def edit
    @user = User.find(params[:id])
  end

  def update
    #Find a new object using form parameters
    @user = User.find(params[:id])
    #Update the object
    if @User.update_attributes(user_params)
    #If save suceeds, redirect to show action
    flash[:notice] = "User updated successfully"
    redirect_to(users_path(@user))
    else
    #If save fails, redisplay the form
    render('edit')
    end
  end

  def delete
    @user = User.find(params[:id])
  end

  def destroy
    @user = User.find(params[:id])
    @user.destroy
    flash[:notice] = "User '#{@user.username}' destroyed successfully"
    redirect_to(users_path)
  end

  private

    def user_params
      params.require(:user).permit(:username, :email)
    end

end
