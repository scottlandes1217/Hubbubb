class CreateStudios < ActiveRecord::Migration[7.1]
  def change
    create_table :studios do |t|
      t.string :name, null: false
      t.string :studio_type, null: false
      t.string :status, null: false, default: 'draft'
      t.references :organization, null: false, foreign_key: true
      t.text :layout_data
      t.text :connections_data

      t.timestamps
    end
    
    add_index :studios, [:organization_id, :studio_type]
    add_index :studios, :status
  end
end
