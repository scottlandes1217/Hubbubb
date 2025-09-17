class AddDemographicAndPetTargetingToAds < ActiveRecord::Migration[7.1]
  def change
    add_column :ads, :min_age, :integer
    add_column :ads, :max_age, :integer
    add_column :ads, :target_genders, :text
    add_column :ads, :target_pet_breeds, :text
    add_column :ads, :min_pet_age, :integer
    add_column :ads, :max_pet_age, :integer
  end
end
