class FeedController < ApplicationController
  before_action :set_organization

  def index
    @posts = Post.includes(:user, :pet, post_attachments: { file_attachment: :blob })
                 .order(created_at: :desc)
                 .page(params[:page])
                 .per(10)

    @feed_items = helpers.interleave_ads_with_posts(@posts, current_user)

    respond_to do |format|
      format.html # Render the initial HTML view
      format.json do
        render json: {
          posts: @posts.any? ? render_to_string(partial: "posts/post", collection: @posts, as: :post, formats: [:html]) : nil,
          next_page: @posts.next_page
        }
      end
    end
  end

  private

  def set_organization
    if current_user.shelter_staff?
      @organization = current_user.organizations.first
    elsif current_user.admin?
      # For admin users, try to get the organization from the session
      @organization = Organization.find_by(id: session[:organization_id]) if session[:organization_id]
    end
  end
end