class CreateFlowJobs < ActiveRecord::Migration[7.1]
  def change
    create_table :flow_jobs do |t|
      t.bigint :flow_id, null: false
      t.references :organization, null: false, foreign_key: true
      t.string :status, default: 'pending', null: false
      t.string :job_id
      t.text :error_message
      t.datetime :started_at
      t.datetime :completed_at
      t.integer :retry_count, default: 0
      
      # Trigger information (what record triggered this flow)
      t.string :trigger_record_type
      t.bigint :trigger_record_id
      t.text :trigger_data

      t.timestamps
    end
    
    add_index :flow_jobs, [:flow_id, :status]
    add_index :flow_jobs, [:organization_id, :created_at]
    add_index :flow_jobs, [:trigger_record_type, :trigger_record_id]
    add_index :flow_jobs, :job_id
  end
end
