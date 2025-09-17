class RenameOrchestrationsToFlows < ActiveRecord::Migration[7.1]
  def change
    # Rename the main table
    rename_table :orchestrations, :flows
    
    # Rename foreign key columns in other tables
    rename_column :orchestration_blocks, :orchestration_id, :flow_id
    rename_column :orchestration_executions, :orchestration_id, :flow_id
    
    # Update indexes
    remove_index :orchestration_blocks, :orchestration_id if index_exists?(:orchestration_blocks, :orchestration_id)
    add_index :orchestration_blocks, :flow_id unless index_exists?(:orchestration_blocks, :flow_id)
    
    remove_index :orchestration_executions, :orchestration_id if index_exists?(:orchestration_executions, :orchestration_id)
    add_index :orchestration_executions, :flow_id unless index_exists?(:orchestration_executions, :flow_id)
    
    # Rename the related tables
    rename_table :orchestration_blocks, :flow_blocks
    rename_table :orchestration_executions, :flow_executions
  end
end
