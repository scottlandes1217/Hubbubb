require "test_helper"

class OrganizationFieldsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get organization_fields_index_url
    assert_response :success
  end

  test "should get create" do
    get organization_fields_create_url
    assert_response :success
  end

  test "should get update" do
    get organization_fields_update_url
    assert_response :success
  end

  test "should get destroy" do
    get organization_fields_destroy_url
    assert_response :success
  end
end
