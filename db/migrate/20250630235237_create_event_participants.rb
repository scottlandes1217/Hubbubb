class CreateEventParticipants < ActiveRecord::Migration[7.1]
  def change
    create_table :event_participants do |t|
      t.references :event, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :role, default: 'attendee'
      t.string :status, default: 'pending'
      t.string :response, default: 'no_response'

      t.timestamps
    end
    
    add_index :event_participants, [:event_id, :user_id], unique: true
    add_index :event_participants, [:user_id, :status]
  end
end
