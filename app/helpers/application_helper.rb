module ApplicationHelper
  # Helper methods for custom object paths using api_name
  def custom_object_records_index_path(organization, custom_object)
    "/organizations/#{organization.id}/#{custom_object.api_name}"
  end

  def custom_object_record_path(organization, custom_object, record)
    "/organizations/#{organization.id}/#{custom_object.api_name}/#{record.external_id}"
  end

  def new_custom_object_record_path(organization, custom_object)
    "/organizations/#{organization.id}/#{custom_object.api_name}/new"
  end

  def edit_custom_object_record_path(organization, custom_object, record)
    "/organizations/#{organization.id}/#{custom_object.api_name}/#{record.external_id}/edit"
  end

  # Global route helper for external_id
  def record_path(record)
    "/#{record.external_id}"
  end
end
