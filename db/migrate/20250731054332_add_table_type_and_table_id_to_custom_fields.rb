class AddTableTypeAndTableIdToCustomFields < ActiveRecord::Migration[7.1]
  def change
    add_column :custom_fields, :table_type, :string
    add_column :custom_fields, :table_id, :integer
    
    add_index :custom_fields, [:table_type, :table_id]
  end
end
