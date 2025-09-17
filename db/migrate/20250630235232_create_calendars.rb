class CreateCalendars < ActiveRecord::Migration[7.1]
  def change
    create_table :calendars do |t|
      t.string :name, null: false
      t.text :description
      t.string :color, default: '#3788d8'
      t.boolean :is_public, default: false
      t.references :organization, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
    
    add_index :calendars, [:organization_id, :name], unique: true
  end
end
