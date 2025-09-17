class OrganizationUser < ApplicationRecord
  belongs_to :user
  belongs_to :organization

  validates :user_id, uniqueness: { scope: :organization_id, message: 'already belongs to this organization' }
end