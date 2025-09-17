class Organization < ApplicationRecord
    has_many :organization_users, dependent: :destroy
    has_many :users, through: :organization_users
    has_many :pets, dependent: :destroy
    has_many :custom_objects, dependent: :destroy
    has_many :custom_fields, through: :custom_objects
    has_many :sites, dependent: :destroy
    has_many :posts
    has_many :calendars, dependent: :destroy
    has_many :events, dependent: :destroy
    has_many :organization_assets, dependent: :destroy
    has_many :flows, dependent: :destroy
    has_many :tasks, dependent: :destroy
  
    validates :name, :street_address, :city, :state, :zip, :country, presence: true
    validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  end  