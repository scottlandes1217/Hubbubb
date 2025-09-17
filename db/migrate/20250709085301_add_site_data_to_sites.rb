class AddSiteDataToSites < ActiveRecord::Migration[7.1]
  def change
    add_column :sites, :site_data, :jsonb
  end
end
