class RemoveOrchestrationTypeFromOrchestrations < ActiveRecord::Migration[7.1]
  def change
    remove_column :orchestrations, :orchestration_type, :string
  end
end
