class AddIconAndNavigationToCustomTables < ActiveRecord::Migration[7.1]
  def change
    add_column :custom_tables, :icon, :string
    add_column :custom_tables, :add_to_navigation, :boolean, default: false, null: false
  end
end
