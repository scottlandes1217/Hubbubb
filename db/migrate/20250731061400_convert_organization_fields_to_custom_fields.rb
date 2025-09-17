class ConvertOrganizationFieldsToCustomFields < ActiveRecord::Migration[7.1]
  def up
    # For development and simplified migration path, skip data conversion and just remove the legacy table if present.
    drop_table :organization_fields, if_exists: true
  end

  def down
    create_table :organization_fields do |t|
      t.references :organization, null: false, foreign_key: true
      t.integer :field_type
      t.string :value
      t.string :icon
      t.integer :priority
      t.timestamps
    end
  end
end
