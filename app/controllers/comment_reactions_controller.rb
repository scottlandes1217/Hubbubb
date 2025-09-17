class CommentReactionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_comment

  def create
    @reaction = @comment.comment_reactions.find_or_initialize_by(user: current_user)
    @reaction.reaction_type = params[:reaction_type]
    if @reaction.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to feed_index_path(anchor: "comment-#{@comment.id}") }
      end
    else
      head :unprocessable_entity
    end
  end

  def destroy
    @reaction = @comment.comment_reactions.find_by(user: current_user)
    @reaction&.destroy
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to feed_index_path(anchor: "comment-#{@comment.id}") }
    end
  end

  private

  def set_comment
    @comment = Comment.find(params[:comment_id])
  end
end 