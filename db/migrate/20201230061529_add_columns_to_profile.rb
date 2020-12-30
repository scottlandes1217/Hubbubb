class AddColumnsToProfile < ActiveRecord::Migration[5.2]
  def change
    add_column :profiles, :active, :boolean
    add_column :profiles, :avatar_url, :text
  end
end
