class AdImpressionsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create]

  def create
    ad = Ad.find_by(id: params[:ad_id])
    impression_type = params[:impression_type] || 'view'
    if ad
      AdImpression.create!(ad: ad, user: current_user, impression_type: impression_type)
      if impression_type == 'click'
        ad.increment!(:clicks_count)
      else
        ad.increment!(:impressions_count)
      end
    end
    head :ok
  end
end
