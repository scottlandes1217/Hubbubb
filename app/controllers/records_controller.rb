class RecordsController < ApplicationController
  before_action :authenticate_user!

  def show
    @record = CustomRecord.find_by!(external_id: params[:external_id])
    @custom_object = @record.custom_object
    @organization = @custom_object.organization
    
    # Redirect to the proper URL format (301 permanent redirect for SEO)
    redirect_to "/organizations/#{@organization.id}/#{@custom_object.api_name}/#{@record.external_id}", 
                status: :moved_permanently
  rescue ActiveRecord::RecordNotFound
    # If record not found, redirect to home or show 404
    redirect_to root_path, alert: 'Record not found'
  end
end

