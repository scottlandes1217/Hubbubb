class CreateEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :events do |t|
      t.string :title, null: false
      t.text :description
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.string :location
      t.references :organizer, null: false, foreign_key: { to_table: :users }
      t.references :calendar, null: false, foreign_key: true
      t.references :organization, null: false, foreign_key: true
      t.boolean :all_day, default: false
      t.string :recurrence_rule
      t.string :status, default: 'scheduled'
      t.string :priority, default: 'medium'
      t.string :event_type, default: 'general'

      t.timestamps
    end
    
    add_index :events, [:calendar_id, :start_time]
    add_index :events, [:organization_id, :start_time]
    add_index :events, [:organizer_id, :start_time]
  end
end
