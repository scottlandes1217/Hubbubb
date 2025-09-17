require "test_helper"

class CalendarSharesControllerTest < ActionDispatch::IntegrationTest
  test "should get create" do
    get calendar_shares_create_url
    assert_response :success
  end

  test "should get destroy" do
    get calendar_shares_destroy_url
    assert_response :success
  end
end
