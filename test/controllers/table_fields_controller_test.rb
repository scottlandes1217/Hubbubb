require "test_helper"

class TableFieldsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get table_fields_index_url
    assert_response :success
  end
end
