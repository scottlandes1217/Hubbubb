class CreateStudioExecutions < ActiveRecord::Migration[7.1]
  def change
    create_table :studio_executions do |t|
      t.references :studio, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.string :status, null: false, default: 'pending'
      t.string :execution_type, null: false
      t.text :input_data
      t.text :output_data
      t.text :error_data
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps
    end
    
    add_index :studio_executions, [:studio_id, :status]
    add_index :studio_executions, [:user_id, :created_at]
    add_index :studio_executions, :created_at
  end
end
