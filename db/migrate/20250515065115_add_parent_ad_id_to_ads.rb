class AddParentAdIdToAds < ActiveRecord::Migration[7.1]
  def change
    add_column :ads, :parent_ad_id, :integer
  end
end
