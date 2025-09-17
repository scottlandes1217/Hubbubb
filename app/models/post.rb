class Post < ApplicationRecord
  # Associations
  belongs_to :user, optional: true
  belongs_to :shelter, optional: true
  belongs_to :pet, optional: true
  belongs_to :organization, optional: true

  has_many :reactions, dependent: :destroy # Unified reactions model
  has_many :post_attachments, dependent: :destroy
  has_many :comments, dependent: :destroy

  # Active Storage for multiple attachments
  has_many_attached :images

  # Nested attributes for post attachments
  accepts_nested_attributes_for :post_attachments, allow_destroy: true

  # Validations
  validates :body, presence: true
end