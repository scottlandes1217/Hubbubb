class CalendarsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_calendar, only: [:show, :edit, :update, :destroy]
  before_action :authorize_calendar_access!, only: [:show]
  before_action :authorize_calendar_edit!, only: [:edit, :update, :destroy]

  def index
    # Auto-create Personal calendar if none exist
    ensure_personal_calendar_exists
    
    # Get all calendars the user can view
    @calendars = @organization.calendars.includes(:created_by, :events, :calendar_shares)
    
    # Filter based on user permissions
    unless current_user.admin? || current_user.shelter_staff?
      @calendars = @calendars.where(
        'is_public = ? OR created_by_id = ? OR calendar_shares.user_id = ? AND calendar_shares.status = ?',
        true, current_user.id, current_user.id, 'accepted'
      ).distinct
    end
  end

  def show
    # Calculate the full visible date range for the calendar grid
    start_date = params[:start_date]&.to_date || Date.current
    month_start = start_date.beginning_of_month
    month_end = start_date.end_of_month
    
    # Calculate the first and last visible dates in the calendar grid
    # Calendar grids typically show 6 weeks (42 days) starting from the first day of the week
    grid_start = month_start.beginning_of_week(:sunday)
    grid_end = month_end.end_of_week(:saturday)
    
    # Load events for the full visible date range
    @events = @calendar.events.includes(:organizer, :participants)
                       .where(start_time: grid_start.beginning_of_day..grid_end.end_of_day)
                       .order(:start_time)
    
    @calendar_shares = @calendar.calendar_shares.includes(:user)
  end

  def new
    @calendar = @organization.calendars.build
  end

  def create
    @calendar = @organization.calendars.build(calendar_params)
    @calendar.created_by = current_user

    if @calendar.save
      redirect_to organization_events_path(@organization), notice: 'Calendar was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @calendar.update(calendar_params)
      # Set up variables for main calendar grid refresh
      @view = params[:view].presence || 'month'
      @start_date = params[:start_date].presence&.to_date || Date.current
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
        month_start = @start_date.beginning_of_month
        month_end = @start_date.end_of_month
        grid_start = month_start.beginning_of_week(:sunday)
        grid_end = month_end.end_of_week(:saturday)
        @end_date = grid_end
        @events = @organization.events.includes(:organizer, :participants, :calendar)
                               .where(start_time: grid_start.beginning_of_day..grid_end.end_of_day)
                               .order(:start_time)
      end
      @calendars = @organization.calendars.includes(:events)
      @selected_calendar_ids = params[:calendar_ids]&.map(&:to_i) || @calendars.pluck(:id)
      if @selected_calendar_ids.any?
        @events = @events.where(calendar_id: @selected_calendar_ids)
      end
      respond_to do |format|
        format.html { redirect_to organization_events_path(@organization), notice: 'Calendar was successfully updated.' }
        format.turbo_stream
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.turbo_stream {
          render turbo_stream: turbo_stream.replace(
            "sidebar_content",
            partial: "form",
            locals: { calendar: @calendar }
          )
        }
      end
    end
  end

  def destroy
    @calendar.destroy
    respond_to do |format|
      format.html { redirect_to organization_events_path(@organization), notice: 'Calendar was successfully deleted.' }
      format.json { head :no_content }
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_calendar
    @calendar = @organization.calendars.find(params[:id])
  end

  def calendar_params
    params.require(:calendar).permit(:name, :description, :color, :is_public)
  end

  def authorize_calendar_access!
    unless @calendar.can_view?(current_user)
      redirect_to organization_calendars_path(@organization), alert: 'Access denied.'
    end
  end

  def authorize_calendar_edit!
    unless @calendar.can_edit?(current_user)
      redirect_to organization_calendar_path(@organization, @calendar), alert: 'You are not authorized to edit this calendar.'
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
      @organization.calendars.create!(
        name: 'Personal',
        description: 'Your personal calendar for private events',
        color: '#3788d8',
        is_public: false,
        created_by: current_user
      )
    end
  end
end
