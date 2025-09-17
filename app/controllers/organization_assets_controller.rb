class OrganizationAssetsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :authorize_access!

  def index
    assets = @organization.organization_assets.includes(file_attachment: :blob)
    urls = assets.map { |asset| url_for(asset.file) if asset.file.attached? }.compact
    render json: urls
  end

  def create
    asset = @organization.organization_assets.build(file: params[:file])
    if asset.save
      render json: { url: url_for(asset.file) }, status: :created
    else
      render json: { errors: asset.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def authorize_access!
    unless current_user.admin? || (current_user.shelter_staff? && current_user.organizations.include?(@organization))
      render json: { error: 'Not authorized' }, status: :unauthorized
    end
  end
end 