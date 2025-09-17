class AddAdvancedLocationTargetingToAds < ActiveRecord::Migration[7.1]
  def change
    add_column :ads, :target_states, :text
    add_column :ads, :target_counties, :text
    add_column :ads, :target_cities, :text
    add_column :ads, :target_zip_codes, :text
    add_column :ads, :target_latitude, :float
    add_column :ads, :target_longitude, :float
    add_column :ads, :target_radius_miles, :float
  end
end
