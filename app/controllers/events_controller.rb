class EventsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_calendar, only: [:index, :new, :create]
  before_action :set_event, only: [:show, :edit, :update, :destroy]
  before_action :authorize_event_access!, only: [:show]
  before_action :authorize_event_edit!, only: [:edit, :update, :destroy]

  def index
    @view = params[:view] || 'month'
    @start_date = params[:start_date]&.to_date || Date.current
    
    # Auto-create Personal calendar if none exist
    ensure_personal_calendar_exists
    
    case @view
    when 'day'
      @end_date = @start_date
      @events = @organization.events.includes(:organizer, :participants, :calendar)
                             .where(start_time: @start_date.beginning_of_day..@start_date.end_of_day)
                             .order(:start_time)
    when 'week'
      @end_date = @start_date.end_of_week
      @events = @organization.events.includes(:organizer, :participants, :calendar)
                             .where(start_time: @start_date.beginning_of_week..@start_date.end_of_week)
                             .order(:start_time)
    else # month
      # Calculate the full visible date range for the calendar grid
      month_start = @start_date.beginning_of_month
      month_end = @start_date.end_of_month
      
      # Calculate the first and last visible dates in the calendar grid
      # Calendar grids typically show 6 weeks (42 days) starting from the first day of the week
      grid_start = month_start.beginning_of_week(:sunday)
      grid_end = month_end.end_of_week(:saturday)
      
      @end_date = grid_end
      @events = @organization.events.includes(:organizer, :participants, :calendar)
                             .where(start_time: grid_start.beginning_of_day..grid_end.end_of_day)
                             .order(:start_time)
      
      # Debug: Log the date ranges
      Rails.logger.debug "Month view date range: #{grid_start} to #{grid_end}"
      Rails.logger.debug "Events loaded: #{@events.count}"
    end

    @calendars = @organization.calendars.includes(:events)
    @selected_calendar_ids = params[:calendar_ids]&.map(&:to_i) || @calendars.pluck(:id)
    
    if @selected_calendar_ids.any?
      @events = @events.where(calendar_id: @selected_calendar_ids)
    end
  end

  def show
    Rails.logger.debug "Show action called for event #{@event.id}"
    Rails.logger.debug "Event calendar: #{@event.calendar.inspect}"
    Rails.logger.debug "Event organizer: #{@event.organizer.inspect}"
    
    respond_to do |format|
      format.html { render :show }
      format.turbo_stream { 
        begin
          Rails.logger.debug "Rendering turbo_stream for event #{@event.id}"
          render turbo_stream: turbo_stream.replace(
            "sidebar_content",
            partial: "sidebar_show",
            locals: { event: @event }
          )
        rescue => e
          Rails.logger.error "Error rendering sidebar_show: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          render turbo_stream: turbo_stream.replace(
            "sidebar_content",
            partial: "error_message",
            locals: { message: "Error loading event details: #{e.message}" }
          )
        end
      }
    end
  end

  def new
    @event = @calendar.events.build
    @event.start_time = params[:start_time]&.to_datetime || Time.current
    @event.end_time = @event.start_time + 1.hour
    @event.calendar_id = @calendar.id
    
    # Load available calendars for the user
    @available_calendars = @organization.calendars.includes(:calendar_shares)
    unless current_user.admin? || current_user.shelter_staff?
      @available_calendars = @available_calendars.where(
        'is_public = ? OR created_by_id = ? OR calendar_shares.user_id = ? AND calendar_shares.status = ?',
        true, current_user.id, current_user.id, 'accepted'
      ).distinct
    end

    respond_to do |format|
      format.html { render :new }
      format.turbo_stream { 
        render turbo_stream: turbo_stream.replace(
          "sidebar_content",
          partial: "sidebar_form",
          locals: { event: @event }
        )
      }
    end
  end

  def create
    # Load available calendars for the user
    @available_calendars = @organization.calendars.includes(:calendar_shares)
    unless current_user.admin? || current_user.shelter_staff?
      @available_calendars = @available_calendars.where(
        'is_public = ? OR created_by_id = ? OR calendar_shares.user_id = ? AND calendar_shares.status = ?',
        true, current_user.id, current_user.id, 'accepted'
      ).distinct
    end
    
    # Debug: Log the parameters
    Rails.logger.debug "Event params: #{params[:event].inspect}"
    Rails.logger.debug "Calendar IDs param type: #{params[:event][:calendar_ids].class}"
    Rails.logger.debug "Calendar IDs param value: #{params[:event][:calendar_ids].inspect}"
    
    # Get selected calendar IDs - handle various parameter formats
    calendar_ids = []
    
    # Try to get calendar_ids from parameters
    if params[:event][:calendar_ids].present?
      calendar_ids_param = params[:event][:calendar_ids]
      
      if calendar_ids_param.is_a?(Array)
        calendar_ids = calendar_ids_param.reject(&:blank?)
      elsif calendar_ids_param.is_a?(Hash)
        calendar_ids = calendar_ids_param.keys.reject(&:blank?)
      elsif calendar_ids_param.is_a?(String)
        calendar_ids = [calendar_ids_param] if calendar_ids_param.present?
      end
    end
    
    # Fallback to current calendar if none selected
    calendar_ids = [@calendar.id] if calendar_ids.empty?
    
    Rails.logger.debug "Selected calendar IDs: #{calendar_ids.inspect}"
    
    # Validate that user has access to all selected calendars
    available_calendar_ids = @available_calendars.pluck(:id).map(&:to_s)
    calendar_ids = calendar_ids.select { |id| available_calendar_ids.include?(id.to_s) }
    
    if calendar_ids.empty?
      @event = @calendar.events.build(event_params)
      @event.errors.add(:base, "Please select at least one calendar")
      render :new, status: :unprocessable_entity
      return
    end

    # Create events for each selected calendar
    created_events = []
    calendar_ids.each do |calendar_id|
      calendar = @organization.calendars.find(calendar_id)
      event = calendar.events.build(event_params.except(:calendar_ids))
      event.organizer = current_user
      event.organization = @organization
      
      if event.save
        # Add organizer as participant
        event.add_participant(current_user, role: 'organizer')
        
        # Add additional participants if specified
        if params[:event][:participant_ids].present?
          participant_ids = params[:event][:participant_ids].reject(&:blank?)
          participant_ids.each do |user_id|
            user = User.find(user_id)
            event.add_participant(user) if user.organizations.include?(@organization)
          end
        end

        # Add tasks if specified
        if params[:event][:task_ids].present?
          task_ids = params[:event][:task_ids].reject(&:blank?)
          task_ids.each do |task_id|
            task = Task.find(task_id)
            event.add_task(task) if task.pet.organization == @organization
          end
        end
        
        created_events << event
      else
        # If any event fails to save, rollback and show errors
        created_events.each(&:destroy)
        @event = event
        render :new, status: :unprocessable_entity
        return
      end
    end

    # Redirect to the first created event
    first_event = created_events.first
    respond_to do |format|
      format.html do
        redirect_to organization_events_path(@organization),
          notice: created_events.length > 1 ?
            "Event was successfully created in #{created_events.length} calendars." :
            'Event was successfully created.'
      end
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "sidebar_content",
          partial: "success_message",
          locals: { message: created_events.length > 1 ? 
            "Event was successfully created in #{created_events.length} calendars." : 
            'Event was successfully created.' }
        )
      end
    end
  end

  def edit
    # Set the calendar to the event's calendar for the form
    @calendar = @event.calendar
    
    # Load available calendars for the user
    @available_calendars = @organization.calendars.includes(:calendar_shares)
    unless current_user.admin? || current_user.shelter_staff?
      @available_calendars = @available_calendars.where(
        'is_public = ? OR created_by_id = ? OR calendar_shares.user_id = ? AND calendar_shares.status = ?',
        true, current_user.id, current_user.id, 'accepted'
      ).distinct
    end
    
    # Ensure the event's current calendar is always available for editing
    unless @available_calendars.include?(@event.calendar)
      @available_calendars = @available_calendars.or(@organization.calendars.where(id: @event.calendar.id))
    end
    
    respond_to do |format|
      format.html { render :edit }
      format.turbo_stream { 
        render turbo_stream: turbo_stream.replace(
          "sidebar_content",
          partial: "sidebar_form",
          locals: { event: @event, available_calendars: @available_calendars }
        )
      }
    end
  end

  def update
    # Handle calendar selection for updates
    calendar_ids = []
    if params[:event][:calendar_ids].present?
      calendar_ids_param = params[:event][:calendar_ids]
      
      if calendar_ids_param.is_a?(Array)
        calendar_ids = calendar_ids_param.reject(&:blank?)
      elsif calendar_ids_param.is_a?(Hash)
        calendar_ids = calendar_ids_param.keys.reject(&:blank?)
      elsif calendar_ids_param.is_a?(String)
        calendar_ids = [calendar_ids_param] if calendar_ids_param.present?
      end
    end
    
    # If no calendars selected, use the current event's calendar
    if calendar_ids.empty?
      calendar_ids = [@event.calendar_id.to_s]
    end
    
    # Validate that user has access to selected calendars
    available_calendars = @organization.calendars.includes(:calendar_shares)
    unless current_user.admin? || current_user.shelter_staff?
      available_calendars = available_calendars.where(
        'is_public = ? OR created_by_id = ? OR calendar_shares.user_id = ? AND calendar_shares.status = ?',
        true, current_user.id, current_user.id, 'accepted'
      ).distinct
    end
    
    available_calendar_ids = available_calendars.pluck(:id).map(&:to_s)
    calendar_ids = calendar_ids.select { |id| available_calendar_ids.include?(id.to_s) }
    
    if calendar_ids.empty?
      @event.errors.add(:base, "Please select at least one calendar")
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.turbo_stream { render partial: 'sidebar_form', locals: { event: @event, available_calendars: available_calendars }, status: :unprocessable_entity }
      end
      return
    end
    
    # Update the event with the first selected calendar
    update_params = event_params.except(:calendar_ids)
    update_params[:calendar_id] = calendar_ids.first.to_i
    
    if @event.update(update_params)
      # Update participants
      if params[:event][:participant_ids].present?
        current_participant_ids = @event.participants.pluck(:id).map(&:to_s)
        new_participant_ids = params[:event][:participant_ids].reject(&:blank?)
        
        # Remove participants not in new list
        (current_participant_ids - new_participant_ids).each do |user_id|
          user = User.find(user_id)
          @event.remove_participant(user) unless @event.organizer?(user)
        end
        
        # Add new participants
        (new_participant_ids - current_participant_ids).each do |user_id|
          user = User.find(user_id)
          @event.add_participant(user) if user.organizations.include?(@organization)
        end
      end

      # Update tasks
      if params[:event][:task_ids].present?
        current_task_ids = @event.tasks.pluck(:id).map(&:to_s)
        new_task_ids = params[:event][:task_ids].reject(&:blank?)
        
        # Remove tasks not in new list
        (current_task_ids - new_task_ids).each do |task_id|
          task = Task.find(task_id)
          @event.remove_task(task)
        end
        
        # Add new tasks
        (new_task_ids - current_task_ids).each do |task_id|
          task = Task.find(task_id)
          @event.add_task(task) if task.pet.organization == @organization
        end
      end

      respond_to do |format|
        format.html { redirect_to organization_events_path(@organization), notice: 'Event was successfully updated.' }
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "sidebar_content",
            partial: "success_message",
            locals: { message: 'Event was successfully updated.' }
          )
        end
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.turbo_stream { render partial: 'sidebar_form', locals: { event: @event, available_calendars: available_calendars }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @event.destroy
    redirect_to organization_events_path(@organization), notice: 'Event was successfully deleted.'
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_calendar
    @calendar = @organization.calendars.find(params[:calendar_id]) if params[:calendar_id]
  end

  def set_event
    @event = @organization.events.find(params[:id])
  end

  def event_params
    params.require(:event).permit(:title, :description, :start_time, :end_time, :location, 
                                 :calendar_id, :all_day, :recurrence_rule, :status, :priority, :event_type,
                                 calendar_ids: [])
  end

  def authorize_event_access!
    unless @event.calendar.is_public || current_user.admin? || 
           (current_user.shelter_staff? && current_user.organizations.include?(@organization)) ||
           @event.organizer?(current_user) || @event.participant?(current_user)
      redirect_to organization_events_path(@organization), alert: 'Access denied.'
    end
  end

  def authorize_event_edit!
    unless @event.can_edit?(current_user)
      redirect_to organization_event_path(@organization, @event), alert: 'You are not authorized to edit this event.'
    end
  end

  private

  def ensure_personal_calendar_exists
    # Create organization calendar if it doesn't exist
    unless @organization.calendars.exists?(name: @organization.name)
      @organization.calendars.create!(
        name: @organization.name,
        description: "Organization-wide calendar for #{@organization.name}",
        color: '#28a745',
        is_public: true,
        created_by: current_user
      )
    end

    # Create personal calendar if it doesn't exist
    unless @organization.calendars.exists?(name: 'Personal', created_by: current_user)
      personal_calendar = @organization.calendars.create!(
        name: 'Personal',
        description: 'Your personal calendar for private events',
        color: '#3788d8',
        is_public: false,
        created_by: current_user
      )
    end
    
    # Set organization calendar as default if no calendars are selected
    if @selected_calendar_ids.blank?
      org_calendar = @organization.calendars.find_by(name: @organization.name)
      @selected_calendar_ids = [org_calendar.id] if org_calendar
    end
  end
end
