class Admin::ApplicationController < ApplicationController
  before_action :authenticate_user!
  before_action :set_pinned_tabs

  private

  def set_pinned_tabs
    @pinned_tabs = current_user.pinned_tabs.includes(:tabable)
  end
end 