class ProfilesController < ApplicationController

  def index
    @profiles = Profile.sorted
  end

  def show
    @profile = Profile.find(params[:id])
  end

  def new
    @profile = Profile.new({:name => 'Profile'})
  end

  def create
    #store a new object using form parameters
    @profile = Profile.new(profile_params)
    #Save the object
    if @profile.save
    #If save suceeds, redirect to user action
    flash[:notice] = "Profile created successfully"
    redirect_to (profiles_path)
    else
    #If save fails, redisplay the form
    render('new')
    end
  end

  def edit
    @profile = Profile.find(params[:id])
  end

  def update
    #Find a new object using form parameters
    @profile = Profile.find(params[:id])
    #Update the object
    if @profile.update_attributes(profile_params)
    #If save suceeds, redirect to show action
    flash[:notice] = "Profile updated successfully"
    redirect_to(profiles_path(@profile))
    else
    #If save fails, redisplay the form
    render('edit')
    end
  end

  def delete
    @profile = Profile.find(params[:id])
  end

  def destroy
    @profile = Profile.find(params[:id])
    @profile.destroy
    flash[:notice] = "Profile '#{@profile.name}' destroyed successfully"
    redirect_to(profiles_path)
  end

  private

    def profile_params
      params.require(:profile).permit(:name)
    end

end