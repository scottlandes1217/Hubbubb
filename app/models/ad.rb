class Ad < ApplicationRecord
  has_many :ad_impressions, dependent: :destroy
  has_many :user_ad_rewards, dependent: :destroy

  serialize :include_locations, coder: YAML
  serialize :exclude_locations, coder: YAML
  serialize :pet_types, coder: YAML
  serialize :target_states, coder: YAML
  serialize :target_counties, coder: YAML
  serialize :target_cities, coder: YAML
  serialize :target_zip_codes, coder: YAML
  serialize :target_genders, coder: YAML
  serialize :target_pet_breeds, coder: YAML
  # target_latitude:float, target_longitude:float, target_radius_miles:float for radius-based targeting
  # min_age, max_age: user age targeting
  # min_pet_age, max_pet_age: pet age targeting

  has_many_attached :media
  has_rich_text :body

  belongs_to :parent_ad, class_name: 'Ad', optional: true
  has_many :variants, class_name: 'Ad', foreign_key: 'parent_ad_id'
end 