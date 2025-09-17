class Site < ApplicationRecord
  belongs_to :organization
  has_many :site_submissions, dependent: :destroy

  attribute :site_data, :json, default: {}

  def site_html
    site_data['html'] || ''
  end

  def site_css
    site_data['css'] || ''
  end

  def site_js
    site_data['js'] || ''
  end
end 