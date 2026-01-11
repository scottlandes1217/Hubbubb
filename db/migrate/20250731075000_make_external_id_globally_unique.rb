class MakeExternalIdGloballyUnique < ActiveRecord::Migration[7.1]
  def up
    # Generate external_ids for any existing records that don't have one
    CustomRecord.where(external_id: nil).find_each do |record|
      loop do
        external_id = SecureRandom.urlsafe_base64(12).tr('=', '').tr('+', '-').tr('/', '_')
        unless CustomRecord.exists?(external_id: external_id)
          record.update_column(:external_id, external_id)
          break
        end
      end
    end
    
    # Remove the composite unique index (check for both possible names)
    # The original index name uses custom_table_id, but column was renamed to custom_object_id
    old_index_name = "index_custom_records_on_custom_table_id_and_external_id"
    new_index_name = "index_custom_records_on_custom_object_id_and_external_id"
    
    if index_name_exists?(:custom_records, old_index_name)
      remove_index :custom_records, name: old_index_name
    elsif index_name_exists?(:custom_records, new_index_name)
      remove_index :custom_records, name: new_index_name
    end
    
    # Add a global unique index on external_id (only if it doesn't already exist)
    unless index_name_exists?(:custom_records, "index_custom_records_on_external_id")
      add_index :custom_records, :external_id, unique: true, name: "index_custom_records_on_external_id"
    end
    
    # Make external_id required (not null)
    change_column_null :custom_records, :external_id, false if column_exists?(:custom_records, :external_id)
  end

  def down
    # Remove the global unique index
    if index_name_exists?(:custom_records, "index_custom_records_on_external_id")
      remove_index :custom_records, name: "index_custom_records_on_external_id"
    end
    
    # Restore the composite unique index (only if it doesn't exist)
    composite_index_name = "index_custom_records_on_custom_object_id_and_external_id"
    unless index_name_exists?(:custom_records, composite_index_name)
      add_index :custom_records, [:custom_object_id, :external_id], unique: true, name: composite_index_name
    end
    
    # Allow null again
    change_column_null :custom_records, :external_id, true if column_exists?(:custom_records, :external_id)
  end
end
