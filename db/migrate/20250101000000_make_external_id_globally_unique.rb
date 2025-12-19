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
    
    # Remove the composite unique index
    remove_index :custom_records, name: "index_custom_records_on_custom_object_id_and_external_id"
    
    # Add a global unique index on external_id
    add_index :custom_records, :external_id, unique: true, name: "index_custom_records_on_external_id"
    
    # Make external_id required (not null)
    change_column_null :custom_records, :external_id, false
  end

  def down
    # Remove the global unique index
    remove_index :custom_records, name: "index_custom_records_on_external_id"
    
    # Restore the composite unique index
    add_index :custom_records, [:custom_object_id, :external_id], unique: true, name: "index_custom_records_on_custom_object_id_and_external_id"
    
    # Allow null again
    change_column_null :custom_records, :external_id, true
  end
end
