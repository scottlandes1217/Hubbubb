class CreateOrganizationFields < ActiveRecord::Migration[7.1]
  def change
    create_table :organization_fields do |t|
      t.references :organization, null: false, foreign_key: true
      t.integer :field_type
      t.string :value

      t.timestamps
    end
  end
end
