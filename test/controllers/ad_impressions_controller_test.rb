require "test_helper"

class AdImpressionsControllerTest < ActionDispatch::IntegrationTest
  test "should get create" do
    get ad_impressions_create_url
    assert_response :success
  end
end
