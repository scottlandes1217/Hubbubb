class AdImpression < ApplicationRecord
  belongs_to :ad
  belongs_to :user, optional: true

  enum impression_type: { view: 'view', click: 'click' }
end 