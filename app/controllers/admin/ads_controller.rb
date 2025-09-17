class Admin::AdsController < ApplicationController
  def index
    @ads = Ad.order(created_at: :desc)
  end

  def new
    @ad = Ad.new
  end

  def create
    @ad = Ad.new(ad_params)
    if @ad.save
      redirect_to admin_ads_path, notice: 'Ad was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @ad = Ad.find(params[:id])
    @variants = @ad.variants
    @parent_ad = @ad.parent_ad
  end

  def update
    @ad = Ad.find(params[:id])
    if @ad.update(ad_params)
      redirect_to admin_ads_path, notice: 'Ad was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @ad = Ad.find(params[:id])
    @ad.destroy
    redirect_to admin_ads_path, notice: 'Ad was successfully deleted.'
  end

  def create_variant
    parent = Ad.find(params[:id])
    variant = parent.dup
    variant.parent_ad_id = parent.id
    variant.title = "#{parent.title} (Variant)"
    if variant.save
      redirect_to edit_admin_ad_path(variant), notice: 'Variant created. Edit and save to activate.'
    else
      redirect_to edit_admin_ad_path(parent), alert: 'Could not create variant.'
    end
  end

  private

  def ad_params
    params.require(:ad).permit(:title, :body, :status, :global_frequency, :max_impressions_per_user, :user_cooldown_seconds, :revenue_generated, :revenue_share_percentage, :start_at, :end_at, :url, :target_latitude, :target_longitude, :target_radius_miles, :min_age, :max_age, :min_pet_age, :max_pet_age, :impression_cap, :click_cap, :budget_cents, include_locations: [], exclude_locations: [], pet_types: [], target_states: [], target_counties: [], target_cities: [], target_zip_codes: [], target_genders: [], target_pet_breeds: [], media: [])
  end
end
