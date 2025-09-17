class CommentReaction < ApplicationRecord
  belongs_to :user
  belongs_to :comment

  validates :reaction_type, presence: true, inclusion: { in: ["Love", "Laugh", "Like", "Congratulations", "Dislike", "Angry"] }
  validates :user_id, uniqueness: { scope: :comment_id }
end 