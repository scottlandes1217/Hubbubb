class SitesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_site, only: [:show, :edit, :update, :destroy, :builder]
  before_action :authorize_access!, except: [:display, :submit]

  def index
    @sites = @organization.sites.order(:name)
  end

  def show
  end

  def new
    @site = @organization.sites.build
  end

  def create
    @site = @organization.sites.build(site_params)
    
    if @site.save
      redirect_to organization_sites_path(@organization), notice: 'Site was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @site.update(site_params)
      respond_to do |format|
        format.html { redirect_to organization_sites_path(@organization), notice: 'Site was successfully updated.' }
        format.json { render json: { success: true, message: 'Site saved successfully' } }
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { success: false, errors: @site.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @site.destroy
    redirect_to organization_sites_path(@organization), notice: 'Site was successfully deleted.'
  end

  def builder
    # This will render the GrapeJS form builder
  end

  def display
    # Display the form for users to fill out
    unless @site.is_active?
      redirect_to root_path, alert: 'This site is not available.'
    end
  end

  def submit
    # Handle form submission
    unless @site.is_active?
      redirect_to root_path, alert: 'This site is not available.'
      return
    end

    submission = @site.site_submissions.build(data: params[:site_data])
    
    if submission.save
      redirect_to display_organization_site_path(@organization, @site), notice: 'Site submitted successfully!'
    else
      redirect_to display_organization_site_path(@organization, @site), alert: 'Error submitting site.'
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_site
    @site = @organization.sites.find(params[:id])
  end

  def site_params
    params.require(:site).permit(:name, :description, :is_active, site_data: {})
  end

  def authorize_access!
    unless current_user.admin? || 
           (current_user.shelter_staff? && current_user.organizations.include?(@organization))
      redirect_to root_path, alert: 'Not authorized'
    end
  end
end
