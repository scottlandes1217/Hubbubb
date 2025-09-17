class AddIconAndPriorityToOrganizationFields < ActiveRecord::Migration[6.1]
  def change
    add_column :organization_fields, :icon, :string
    add_column :organization_fields, :priority, :integer
  end
end