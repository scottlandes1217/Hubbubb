class CreateCustomRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :custom_records do |t|
      t.references :custom_table, null: false, foreign_key: true
      t.string :name, null: false
      t.string :external_id
      t.text :description

      t.timestamps
    end

    add_index :custom_records, [:custom_table_id, :external_id], unique: true
    add_index :custom_records, :name
  end
end
