class RenameTablesToObjects < ActiveRecord::Migration[7.1]
  def change
    # Rename the main table
    rename_table :custom_tables, :custom_objects
    
    # Rename foreign key columns in other tables
    rename_column :custom_fields, :custom_table_id, :custom_object_id
    rename_column :custom_records, :custom_table_id, :custom_object_id
    
    # Update indexes
    remove_index :custom_fields, :custom_table_id if index_exists?(:custom_fields, :custom_table_id)
    add_index :custom_fields, :custom_object_id unless index_exists?(:custom_fields, :custom_object_id)
    
    remove_index :custom_records, :custom_table_id if index_exists?(:custom_records, :custom_table_id)
    add_index :custom_records, :custom_object_id unless index_exists?(:custom_records, :custom_object_id)
  end
end
