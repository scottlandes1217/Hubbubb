module FeedHelper
  # Interleaves eligible ads into the posts array every N posts
  def interleave_ads_with_posts(posts, user)
    eligible_ads = Ad.where(status: 'active')
                    .where('start_at IS NULL OR start_at <= ?', Time.current)
                    .where('end_at IS NULL OR end_at >= ?', Time.current)
                    .order('RANDOM()')

    # Filter ads by user targeting (location, pet_types, etc.)
    eligible_ads = eligible_ads.select do |ad|
      # --- Structured location targeting ---
      user_location = user
      matches_state = ad.target_states.blank? || (user_location.state.present? && ad.target_states.map(&:downcase).include?(user_location.state.downcase))
      matches_county = ad.target_counties.blank? || (user_location.county.present? && ad.target_counties.map(&:downcase).include?(user_location.county.downcase))
      matches_city = ad.target_cities.blank? || (user_location.city.present? && ad.target_cities.map(&:downcase).include?(user_location.city.downcase))
      matches_zip = ad.target_zip_codes.blank? || (user_location.zip_code.present? && ad.target_zip_codes.include?(user_location.zip_code))

      # --- Radius-based targeting ---
      in_radius = true
      if ad.target_latitude.present? && ad.target_longitude.present? && ad.target_radius_miles.present? && user_location.latitude.present? && user_location.longitude.present?
        in_radius = haversine_distance(user_location.latitude, user_location.longitude, ad.target_latitude, ad.target_longitude) <= ad.target_radius_miles
      end

      # Show ad if matches any structured field or is in radius
      (matches_state && matches_county && matches_city && matches_zip) || in_radius
    end

    # Pet type targeting (simple example)
    eligible_ads = eligible_ads.select do |ad|
      ad.pet_types.blank? || (user.pets.any? && (ad.pet_types & user.pets.map(&:pet_type)).any?)
    end

    # Enforce per-user frequency and cooldown
    eligible_ads = eligible_ads.select do |ad|
      next true unless user # Allow for anonymous users for now
      impressions = AdImpression.where(ad: ad, user: user).order(created_at: :desc)
      max_impressions = ad.max_impressions_per_user.presence
      cooldown = ad.user_cooldown_seconds.presence
      # Check max impressions
      if max_impressions && impressions.count >= max_impressions.to_i
        next false
      end
      # Check cooldown
      if cooldown && impressions.exists?
        last_seen = impressions.first.created_at
        if last_seen > cooldown.to_i.seconds.ago
          next false
        end
      end
      true
    end

    # Demographic targeting
    eligible_ads = eligible_ads.select do |ad|
      # User age
      user_age = user.age if user.respond_to?(:age)
      min_age_ok = ad.min_age.blank? || (user_age && user_age >= ad.min_age)
      max_age_ok = ad.max_age.blank? || (user_age && user_age <= ad.max_age)
      # User gender
      gender_ok = ad.target_genders.blank? || ad.target_genders.include?(user.gender)
      min_age_ok && max_age_ok && gender_ok
    end

    # Pet breed/age targeting
    eligible_ads = eligible_ads.select do |ad|
      next true if ad.target_pet_breeds.blank? && ad.min_pet_age.blank? && ad.max_pet_age.blank?
      user_pets = user.pets if user.respond_to?(:pets)
      next false unless user_pets&.any?
      breed_ok = ad.target_pet_breeds.blank? || user_pets.any? { |pet| (pet.breed & ad.target_pet_breeds).any? }
      min_pet_age_ok = ad.min_pet_age.blank? || user_pets.any? { |pet| pet.age && pet.age >= ad.min_pet_age }
      max_pet_age_ok = ad.max_pet_age.blank? || user_pets.any? { |pet| pet.age && pet.age <= ad.max_pet_age }
      breed_ok && min_pet_age_ok && max_pet_age_ok
    end

    # Budget/cap enforcement
    eligible_ads = eligible_ads.select do |ad|
      under_impression_cap = ad.impression_cap.blank? || ad.impressions_count < ad.impression_cap
      under_click_cap = ad.click_cap.blank? || ad.clicks_count < ad.click_cap
      under_budget = ad.budget_cents.blank? || ad.revenue_generated.to_i < ad.budget_cents
      under_impression_cap && under_click_cap && under_budget
    end

    # A/B testing: group ads by parent, pick one random variant (or parent) per campaign
    ab_ads = []
    campaigns = eligible_ads.group_by { |ad| ad.parent_ad_id || ad.id }
    campaigns.each_value do |ads|
      ab_ads << ads.sample
    end
    eligible_ads = ab_ads

    # Interleave ads every N posts (using the ad's global_frequency, default 5)
    result = []
    ad_index = 0
    posts.each_with_index do |post, i|
      result << post
      eligible_ads.each do |ad|
        freq = ad.global_frequency.presence || 5
        if (i + 1) % freq == 0
          result << ad
        end
      end
    end
    result
  end

  # Haversine formula for distance in miles
  def haversine_distance(lat1, lon1, lat2, lon2)
    rad_per_deg = Math::PI / 180
    rkm = 6371 # Earth radius in kilometers
    rm = rkm * 0.621371 # Radius in miles
    dlat_rad = (lat2 - lat1) * rad_per_deg
    dlon_rad = (lon2 - lon1) * rad_per_deg
    lat1_rad, lat2_rad = lat1 * rad_per_deg, lat2 * rad_per_deg
    a = Math.sin(dlat_rad / 2)**2 + Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(dlon_rad / 2)**2
    c = 2 * Math::atan2(Math::sqrt(a), Math::sqrt(1 - a))
    rm * c # Delta in miles
  end
end
