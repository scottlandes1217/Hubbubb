class CreateTasks < ActiveRecord::Migration[7.0]
  def change
    create_table :tasks do |t|
      t.string :status, null: false, default: "Scheduled"
      t.string :subject, null: false
      t.text :description
      t.references :pet, null: false, foreign_key: true
      t.datetime :completed_at
      t.datetime :start_time
      t.integer :duration_minutes
      t.string :task_type
      t.string :flag_list, array: true, default: []

      t.timestamps
    end
  end
end