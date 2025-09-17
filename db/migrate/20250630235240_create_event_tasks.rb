class CreateEventTasks < ActiveRecord::Migration[7.1]
  def change
    create_table :event_tasks do |t|
      t.references :event, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: true

      t.timestamps
    end
    
    add_index :event_tasks, [:event_id, :task_id], unique: true
  end
end
