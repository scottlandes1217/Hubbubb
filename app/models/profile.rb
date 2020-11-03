class Profile < ApplicationRecord

  scope :sorted, lambda { order("created_at DESC") }
  scope :search, lambda {|query| where(["name LIKE ?", "%#{query}%"]) }

end
