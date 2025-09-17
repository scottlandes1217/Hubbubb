class RenameFormsToSites < ActiveRecord::Migration[7.1]
  def change
    # Rename forms table to sites
    rename_table :forms, :sites

    # Rename form_submissions to site_submissions
    rename_table :form_submissions, :site_submissions

    # Handle the form_id to site_id column rename and index management
    # First, check if the old index exists
    if index_name_exists?(:site_submissions, 'index_form_submissions_on_form_id')
      # Rename the index first
      rename_index :site_submissions, 'index_form_submissions_on_form_id', 'index_site_submissions_on_form_id'
      # Rename the column
      rename_column :site_submissions, :form_id, :site_id
      # Remove the old index and add the new one
      remove_index :site_submissions, name: 'index_site_submissions_on_form_id'
      add_index :site_submissions, :site_id
    else
      # If the old index doesn't exist, just rename the column
      rename_column :site_submissions, :form_id, :site_id
      # Only add the new index if it doesn't already exist
      unless index_name_exists?(:site_submissions, 'index_site_submissions_on_site_id')
        add_index :site_submissions, :site_id
      end
    end

    # Handle the sites table index
    if index_name_exists?(:sites, 'index_forms_on_organization_id')
      remove_index :sites, name: 'index_forms_on_organization_id'
    end
    unless index_name_exists?(:sites, 'index_sites_on_organization_id')
      add_index :sites, :organization_id
    end

    # Update foreign keys - only if they exist
    if foreign_key_exists?(:site_submissions, :forms)
      remove_foreign_key :site_submissions, :forms
    end
    unless foreign_key_exists?(:site_submissions, :sites)
      add_foreign_key :site_submissions, :sites
    end
    
    if foreign_key_exists?(:sites, :organizations)
      remove_foreign_key :sites, :organizations
    end
    unless foreign_key_exists?(:sites, :organizations)
      add_foreign_key :sites, :organizations
    end
  end
end 