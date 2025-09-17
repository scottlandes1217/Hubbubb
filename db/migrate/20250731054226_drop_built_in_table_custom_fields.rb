class DropBuiltInTableCustomFields < ActiveRecord::Migration[7.1]
  def change
    drop_table :built_in_table_custom_fields, if_exists: true
  end
end
