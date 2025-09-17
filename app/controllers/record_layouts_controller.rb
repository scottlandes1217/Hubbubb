class RecordLayoutsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_table_context
  before_action :set_layout, only: [:builder, :update]

  def builder
    # Renders GrapesJS-based builder for a record page layout
  end

  def update
    respond_to do |format|
      if @layout.update(layout_params)
        format.json { render json: { success: true } }
        format.html { redirect_to @return_path || organization_path(@organization), notice: 'Record page saved.' }
      else
        format.json { render json: { success: false, errors: @layout.errors.full_messages }, status: :unprocessable_entity }
        format.html { render :builder, status: :unprocessable_entity }
      end
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_table_context
    # Expect params: table_type ('Pet'/'Task'/'CustomObject'), table_id for CustomObject id
    @table_type = params[:table_type]
    @table_id = params[:table_id]
    @return_path = params[:return_to]
    unless %w[Pet Task CustomObject].include?(@table_type)
      render plain: 'Invalid table_type', status: :bad_request and return
    end
  end

  def set_layout
    @layout = RecordLayout.find_or_initialize_by(
      organization: @organization,
      table_type: @table_type,
      table_id: @table_type == 'CustomObject' ? @table_id : nil
    )
  end

  def layout_params
    params.require(:record_layout).permit(:layout_html, :layout_css, :layout_js, metadata: {})
  end
end


