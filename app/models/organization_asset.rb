class OrganizationAsset < ApplicationRecord
  belongs_to :organization
  has_one_attached :file

  validates :file, presence: true
end
