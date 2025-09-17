class CalendarSharesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_calendar
  before_action :authorize_calendar_manage!

  def create
    @calendar_share = @calendar.calendar_shares.build(calendar_share_params)
    
    if @calendar_share.save
      # Send invitation email if it's an email share
      @calendar_share.send_invitation_email if @calendar_share.email.present?
      
      respond_to do |format|
        format.html { redirect_to organization_calendar_path(@organization, @calendar), notice: 'Calendar shared successfully.' }
        format.json { render json: @calendar_share, status: :created }
        format.turbo_stream { 
          render turbo_stream: turbo_stream.replace(
            "calendar_shares_list",
            partial: "calendars/shares_list",
            locals: { calendar: @calendar }
          )
        }
      end
    else
      respond_to do |format|
        format.html { redirect_to organization_calendar_path(@organization, @calendar), alert: 'Failed to share calendar.' }
        format.json { render json: { errors: @calendar_share.errors.full_messages }, status: :unprocessable_entity }
        format.turbo_stream { 
          render turbo_stream: turbo_stream.replace(
            "share_form",
            partial: "calendars/share_form",
            locals: { calendar: @calendar, calendar_share: @calendar_share }
          )
        }
      end
    end
  end

  def destroy
    @calendar_share = @calendar.calendar_shares.find(params[:id])
    @calendar_share.destroy
    
    respond_to do |format|
      format.html { redirect_to organization_calendar_path(@organization, @calendar), notice: 'Share removed successfully.' }
      format.json { head :no_content }
      format.turbo_stream { 
        render turbo_stream: turbo_stream.replace(
          "calendar_shares_list",
          partial: "calendars/shares_list",
          locals: { calendar: @calendar }
        )
      }
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_calendar
    @calendar = @organization.calendars.find(params[:calendar_id])
  end

  def calendar_share_params
    params.require(:calendar_share).permit(:user_id, :email, :permission)
  end

  def authorize_calendar_manage!
    unless @calendar.can_manage?(current_user)
      redirect_to organization_calendar_path(@organization, @calendar), alert: 'You are not authorized to manage this calendar.'
    end
  end
end
