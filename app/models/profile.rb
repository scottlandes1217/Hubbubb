class Profile < ApplicationRecord

  scope :sorted, lambda { order("created_at DESC") }
  scope :search, lambda {|query| where(["name LIKE ?", "%#{query}%"]) }
  scope :is_active, -> { where(active: true) }

  before_save :ensure_one_active

    def activate!
      self.active = true
      save
    end

    def ensure_one_active
      if self.active
        profile.update_attribute(:active, false)
      end
    end


end
