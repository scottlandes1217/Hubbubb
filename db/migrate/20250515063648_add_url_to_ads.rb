class AddUrlToAds < ActiveRecord::Migration[7.1]
  def change
    add_column :ads, :url, :string
  end
end
