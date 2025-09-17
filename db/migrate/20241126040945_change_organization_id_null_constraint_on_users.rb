class ChangeOrganizationIdNullConstraintOnUsers < ActiveRecord::Migration[7.0]
  def change
    change_column_null :users, :organization_id, true
  end
end