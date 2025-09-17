class OrganizationsController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin!, only: [:new, :create, :edit, :update, :destroy]
  before_action :authorize_access!, only: [:index, :show]

  def index
    @query = params[:query]
    base_organizations = if current_user.admin?
                          Organization.all
                        else
                          current_user.organizations
                        end

    @organizations = if @query.present?
                      base_organizations.where("name ILIKE :query OR city ILIKE :query OR state ILIKE :query OR street_address ILIKE :query OR zip ILIKE :query", query: "%#{@query}%")
                    else
                      base_organizations
                    end
    @organizations = @organizations.order(:name).page(params[:page]).per(10)
  end

  def show
    @organization = Organization.find(params[:id])
    session[:organization_id] = @organization.id
    Rails.logger.debug "Set session[:organization_id] to #{@organization.id}"
    @pets = @organization.pets
  end

  def new
    @organization = Organization.new
  end

  def create
    @organization = Organization.new(organization_params)
    if @organization.save
      redirect_to organizations_path, notice: 'Organization was successfully created.'
    else
      render :new
    end
  end

  def edit
    @organization = Organization.find(params[:id])
  end

  def update
    @organization = Organization.find(params[:id])
    if @organization.update(organization_params)
      redirect_to organizations_path, notice: 'Organization was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @organization = Organization.find(params[:id])
    @organization.destroy
    redirect_to organizations_path, notice: 'Organization was successfully deleted.'
  end

  private

  def authorize_admin!
    redirect_to root_path, alert: 'Not authorized' unless current_user.admin?
  end

  def authorize_access!
    unless current_user.admin? || current_user.shelter_staff?
      redirect_to root_path, alert: 'Not authorized to view organizations'
    end
  end

  def organization_params
    params.require(:organization).permit(:name, :street_address, :city, :state, :zip, :country, :phone, :email)
  end
end