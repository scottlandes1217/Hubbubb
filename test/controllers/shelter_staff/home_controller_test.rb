require "test_helper"

class ShelterStaff::HomeControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get shelter_staff_home_index_url
    assert_response :success
  end
end
