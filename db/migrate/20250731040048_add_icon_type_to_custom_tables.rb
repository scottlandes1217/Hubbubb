class AddIconTypeToCustomTables < ActiveRecord::Migration[7.1]
  def change
    add_column :custom_tables, :icon_type, :string, default: 'font_awesome', null: false
    add_column :custom_tables, :font_awesome_icon, :string, default: 'fas fa-database'
  end
end
