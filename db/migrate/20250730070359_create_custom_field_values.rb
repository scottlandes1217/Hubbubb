class CreateCustomFieldValues < ActiveRecord::Migration[7.1]
  def change
    create_table :custom_field_values do |t|
      t.references :custom_record, null: false, foreign_key: true
      t.references :custom_field, null: false, foreign_key: true
      t.text :value

      t.timestamps
    end

    add_index :custom_field_values, [:custom_record_id, :custom_field_id], unique: true, name: 'index_custom_field_values_on_record_and_field'
  end
end
