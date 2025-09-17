class CreateCustomFields < ActiveRecord::Migration[7.1]
  def change
    create_table :custom_fields do |t|
      t.references :custom_table, null: false, foreign_key: true
      t.string :name, null: false
      t.string :display_name, null: false
      t.string :api_name, null: false
      t.integer :field_type, null: false, default: 0
      t.boolean :required, default: false, null: false
      t.boolean :unique, default: false, null: false
      t.boolean :active, default: true, null: false
      t.boolean :hidden, default: false, null: false
      t.boolean :read_only, default: false, null: false
      t.text :picklist_values
      t.text :formula
      t.integer :lookup_table_id
      t.text :description

      t.timestamps
    end

    add_index :custom_fields, [:custom_table_id, :name], unique: true
    add_index :custom_fields, [:custom_table_id, :api_name], unique: true
    add_index :custom_fields, :field_type
  end
end
