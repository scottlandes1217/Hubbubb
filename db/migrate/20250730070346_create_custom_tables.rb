class CreateCustomTables < ActiveRecord::Migration[7.1]
  def change
    create_table :custom_tables do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :display_name, null: false
      t.string :api_name, null: false
      t.boolean :active, default: true, null: false
      t.text :description

      t.timestamps
    end

    add_index :custom_tables, [:organization_id, :name], unique: true
    add_index :custom_tables, [:organization_id, :api_name], unique: true
  end
end
