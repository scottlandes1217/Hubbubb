class PinnedTabsController < ApplicationController
  before_action :authenticate_user!
  
  def index
    @pinned_tabs = current_user.pinned_tabs.ordered
    Rails.logger.info "Pinned tabs for user #{current_user.id}: #{@pinned_tabs.map { |t| { id: t.id, title: t.title, position: t.position, tab_type: t.tab_type } }}"
    render json: @pinned_tabs
  end
  
  def create
    if params[:pet_id].present?
      pet = Pet.find(params[:pet_id])
      @pinned_tab = PinnedTab.pin_pet(current_user, pet)
      render json: { success: true, tab: @pinned_tab }
    elsif params[:task_id].present?
      begin
        task = Task.find(params[:task_id])
        @pinned_tab = PinnedTab.pin_task(current_user, task)
        render json: { success: true, tab: @pinned_tab }
      rescue => e
        Rails.logger.error "Error creating pinned task tab: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render json: { success: false, error: e.message }, status: :internal_server_error
      end
    else
      render json: { success: false, error: 'Invalid parameters' }, status: :unprocessable_entity
    end
  end
  
  def destroy
    @pinned_tab = current_user.pinned_tabs.find(params[:id])
    @pinned_tab.destroy
    render json: { success: true }
  end
  
  def unpin_pet
    pet = Pet.find(params[:pet_id])
    PinnedTab.unpin_pet(current_user, pet)
    render json: { success: true }
  end

  def unpin_task
    task = Task.find(params[:task_id])
    PinnedTab.unpin_task(current_user, task)
    render json: { success: true }
  end
  
  def update_order
    tab_ids = params[:tab_ids]
    Rails.logger.info "Received params: #{params.inspect}"
    return render json: { success: false, error: 'No tab_ids provided' }, status: :unprocessable_entity unless tab_ids.is_a?(Array)
    
    Rails.logger.info "Updating tab order for user #{current_user.id}: #{tab_ids}"
    
    # Check if all tabs exist
    existing_tabs = current_user.pinned_tabs.where(id: tab_ids)
    Rails.logger.info "Found #{existing_tabs.count} tabs out of #{tab_ids.length} requested"
    
    begin
      tab_ids.each_with_index do |id, idx|
        tab = current_user.pinned_tabs.find_by(id: id)
        if tab
          Rails.logger.info "Updating tab #{tab.id} (#{tab.title}) to position #{idx}"
          tab.update!(position: idx)
        else
          Rails.logger.error "Tab with ID #{id} not found for user #{current_user.id}"
        end
      end
      render json: { success: true }
    rescue => e
      Rails.logger.error "Error updating tab order: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      render json: { success: false, error: e.message }, status: :internal_server_error
    end
  end
end 