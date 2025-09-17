# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_08_11_080000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "action_text_rich_texts", force: :cascade do |t|
    t.string "name", null: false
    t.text "body"
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["record_type", "record_id", "name"], name: "index_action_text_rich_texts_uniqueness", unique: true
  end

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "ad_impressions", force: :cascade do |t|
    t.bigint "ad_id", null: false
    t.bigint "user_id"
    t.string "impression_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ad_id"], name: "index_ad_impressions_on_ad_id"
    t.index ["user_id"], name: "index_ad_impressions_on_user_id"
  end

  create_table "ads", force: :cascade do |t|
    t.string "title"
    t.text "body"
    t.integer "global_frequency"
    t.integer "max_impressions_per_user"
    t.integer "user_cooldown_seconds"
    t.text "include_locations"
    t.text "exclude_locations"
    t.decimal "revenue_generated", default: "0.0"
    t.decimal "revenue_share_percentage", default: "0.0"
    t.integer "impressions_count", default: 0
    t.integer "clicks_count", default: 0
    t.text "pet_types"
    t.string "status"
    t.datetime "start_at"
    t.datetime "end_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "url"
    t.text "target_states"
    t.text "target_counties"
    t.text "target_cities"
    t.text "target_zip_codes"
    t.float "target_latitude"
    t.float "target_longitude"
    t.float "target_radius_miles"
    t.integer "min_age"
    t.integer "max_age"
    t.text "target_genders"
    t.text "target_pet_breeds"
    t.integer "min_pet_age"
    t.integer "max_pet_age"
    t.integer "impression_cap"
    t.integer "click_cap"
    t.integer "budget_cents"
    t.integer "parent_ad_id"
  end

  create_table "calendar_shares", force: :cascade do |t|
    t.bigint "calendar_id", null: false
    t.bigint "user_id"
    t.string "permission", default: "view"
    t.string "email"
    t.string "status", default: "pending"
    t.string "invitation_token"
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["calendar_id", "email"], name: "index_calendar_shares_on_calendar_id_and_email", unique: true, where: "(email IS NOT NULL)"
    t.index ["calendar_id", "user_id"], name: "index_calendar_shares_on_calendar_id_and_user_id", unique: true, where: "(user_id IS NOT NULL)"
    t.index ["calendar_id"], name: "index_calendar_shares_on_calendar_id"
    t.index ["invitation_token"], name: "index_calendar_shares_on_invitation_token", unique: true
    t.index ["status"], name: "index_calendar_shares_on_status"
    t.index ["user_id"], name: "index_calendar_shares_on_user_id"
  end

  create_table "calendars", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.string "color", default: "#3788d8"
    t.boolean "is_public", default: false
    t.bigint "organization_id", null: false
    t.bigint "created_by_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_calendars_on_created_by_id"
    t.index ["organization_id", "name"], name: "index_calendars_on_organization_id_and_name", unique: true
    t.index ["organization_id"], name: "index_calendars_on_organization_id"
  end

  create_table "comment_reactions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "comment_id", null: false
    t.string "reaction_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["comment_id"], name: "index_comment_reactions_on_comment_id"
    t.index ["user_id", "comment_id"], name: "index_comment_reactions_on_user_id_and_comment_id", unique: true
    t.index ["user_id"], name: "index_comment_reactions_on_user_id"
  end

  create_table "comments", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "user_id", null: false
    t.bigint "post_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["post_id"], name: "index_comments_on_post_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "custom_field_values", force: :cascade do |t|
    t.bigint "custom_record_id", null: false
    t.bigint "custom_field_id", null: false
    t.text "value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["custom_field_id"], name: "index_custom_field_values_on_custom_field_id"
    t.index ["custom_record_id", "custom_field_id"], name: "index_custom_field_values_on_record_and_field", unique: true
    t.index ["custom_record_id"], name: "index_custom_field_values_on_custom_record_id"
  end

  create_table "custom_fields", force: :cascade do |t|
    t.bigint "custom_object_id", null: false
    t.string "name", null: false
    t.string "display_name", null: false
    t.string "api_name", null: false
    t.integer "field_type", default: 0, null: false
    t.boolean "required", default: false, null: false
    t.boolean "unique", default: false, null: false
    t.boolean "active", default: true, null: false
    t.boolean "hidden", default: false, null: false
    t.boolean "read_only", default: false, null: false
    t.text "picklist_values"
    t.text "formula"
    t.integer "lookup_table_id"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "table_type"
    t.integer "table_id"
    t.index ["custom_object_id", "api_name"], name: "index_custom_fields_on_custom_object_id_and_api_name", unique: true
    t.index ["custom_object_id", "name"], name: "index_custom_fields_on_custom_object_id_and_name", unique: true
    t.index ["custom_object_id"], name: "index_custom_fields_on_custom_object_id"
    t.index ["field_type"], name: "index_custom_fields_on_field_type"
    t.index ["table_type", "table_id"], name: "index_custom_fields_on_table_type_and_table_id"
  end

  create_table "custom_objects", force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.string "name", null: false
    t.string "api_name", null: false
    t.boolean "active", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "icon"
    t.boolean "add_to_navigation", default: false, null: false
    t.string "icon_type", default: "font_awesome", null: false
    t.string "font_awesome_icon", default: "fas fa-database"
    t.index ["organization_id", "api_name"], name: "index_custom_objects_on_organization_id_and_api_name", unique: true
    t.index ["organization_id", "name"], name: "index_custom_objects_on_organization_id_and_name", unique: true
    t.index ["organization_id"], name: "index_custom_objects_on_organization_id"
  end

  create_table "custom_records", force: :cascade do |t|
    t.bigint "custom_object_id", null: false
    t.string "name", null: false
    t.string "external_id"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["custom_object_id", "external_id"], name: "index_custom_records_on_custom_object_id_and_external_id", unique: true
    t.index ["custom_object_id"], name: "index_custom_records_on_custom_object_id"
    t.index ["name"], name: "index_custom_records_on_name"
  end

  create_table "event_participants", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.bigint "user_id", null: false
    t.string "role", default: "attendee"
    t.string "status", default: "pending"
    t.string "response", default: "no_response"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "user_id"], name: "index_event_participants_on_event_id_and_user_id", unique: true
    t.index ["event_id"], name: "index_event_participants_on_event_id"
    t.index ["user_id", "status"], name: "index_event_participants_on_user_id_and_status"
    t.index ["user_id"], name: "index_event_participants_on_user_id"
  end

  create_table "event_tasks", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.bigint "task_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "task_id"], name: "index_event_tasks_on_event_id_and_task_id", unique: true
    t.index ["event_id"], name: "index_event_tasks_on_event_id"
    t.index ["task_id"], name: "index_event_tasks_on_task_id"
  end

  create_table "events", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.datetime "start_time", null: false
    t.datetime "end_time", null: false
    t.string "location"
    t.bigint "organizer_id", null: false
    t.bigint "calendar_id", null: false
    t.bigint "organization_id", null: false
    t.boolean "all_day", default: false
    t.string "recurrence_rule"
    t.string "status", default: "scheduled"
    t.string "priority", default: "medium"
    t.string "event_type", default: "general"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["calendar_id", "start_time"], name: "index_events_on_calendar_id_and_start_time"
    t.index ["calendar_id"], name: "index_events_on_calendar_id"
    t.index ["organization_id", "start_time"], name: "index_events_on_organization_id_and_start_time"
    t.index ["organization_id"], name: "index_events_on_organization_id"
    t.index ["organizer_id", "start_time"], name: "index_events_on_organizer_id_and_start_time"
    t.index ["organizer_id"], name: "index_events_on_organizer_id"
  end

  create_table "flow_blocks", force: :cascade do |t|
    t.bigint "flow_id", null: false
    t.string "block_type", null: false
    t.string "name", null: false
    t.integer "position_x", null: false
    t.integer "position_y", null: false
    t.text "config_data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["flow_id", "block_type"], name: "index_flow_blocks_on_flow_id_and_block_type"
    t.index ["flow_id"], name: "index_flow_blocks_on_flow_id"
    t.index ["position_x", "position_y"], name: "index_flow_blocks_on_position_x_and_position_y"
  end

  create_table "flow_executions", force: :cascade do |t|
    t.bigint "flow_id", null: false
    t.bigint "user_id"
    t.string "status", default: "pending", null: false
    t.string "execution_type", null: false
    t.text "input_data"
    t.text "output_data"
    t.text "error_data"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_flow_executions_on_created_at"
    t.index ["flow_id", "status"], name: "index_flow_executions_on_flow_id_and_status"
    t.index ["flow_id"], name: "index_flow_executions_on_flow_id"
    t.index ["user_id", "created_at"], name: "index_flow_executions_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_flow_executions_on_user_id"
  end

  create_table "flows", force: :cascade do |t|
    t.string "name", null: false
    t.string "status", default: "draft", null: false
    t.bigint "organization_id", null: false
    t.text "layout_data"
    t.text "connections_data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_flows_on_organization_id"
    t.index ["status"], name: "index_flows_on_status"
  end

  create_table "organization_assets", force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_organization_assets_on_organization_id"
  end

  create_table "organization_users", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "organization_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_organization_users_on_organization_id"
    t.index ["user_id"], name: "index_organization_users_on_user_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "name"
    t.string "street_address"
    t.string "city"
    t.string "state"
    t.string "zip"
    t.string "country"
    t.string "phone"
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "organizations_users", id: false, force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.bigint "user_id", null: false
    t.index ["organization_id", "user_id"], name: "index_organizations_users_on_organization_id_and_user_id"
    t.index ["user_id", "organization_id"], name: "index_organizations_users_on_user_id_and_organization_id"
  end

  create_table "pets", force: :cascade do |t|
    t.string "name"
    t.json "breed"
    t.integer "age"
    t.text "description"
    t.bigint "organization_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "sex", default: 2, null: false
    t.string "species"
    t.json "color"
    t.integer "coat_type"
    t.integer "size"
    t.float "weight_lbs"
    t.float "weight_oz"
    t.date "entered_shelter"
    t.date "left_shelter"
    t.string "unit"
    t.string "location"
    t.date "date_of_birth"
    t.boolean "dob_estimated", default: false
    t.string "microchip"
    t.date "dod"
    t.integer "mother_id"
    t.integer "father_id"
    t.json "flags"
    t.bigint "owner_id"
    t.index ["organization_id"], name: "index_pets_on_organization_id"
    t.index ["owner_id"], name: "index_pets_on_owner_id"
  end

  create_table "pinned_tabs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "tabable_type", null: false
    t.bigint "tabable_id", null: false
    t.string "title"
    t.string "url"
    t.string "tab_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "position"
    t.index ["tabable_type", "tabable_id"], name: "index_pinned_tabs_on_tabable"
    t.index ["user_id"], name: "index_pinned_tabs_on_user_id"
  end

  create_table "post_attachments", force: :cascade do |t|
    t.bigint "post_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["post_id"], name: "index_post_attachments_on_post_id"
  end

  create_table "posts", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "user_id"
    t.bigint "organization_id"
    t.bigint "pet_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_posts_on_organization_id"
    t.index ["pet_id"], name: "index_posts_on_pet_id"
    t.index ["user_id"], name: "index_posts_on_user_id"
  end

  create_table "reactions", force: :cascade do |t|
    t.string "reaction_type", null: false
    t.bigint "user_id", null: false
    t.bigint "post_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["post_id"], name: "index_reactions_on_post_id"
    t.index ["user_id", "post_id", "reaction_type"], name: "index_reactions_on_user_id_and_post_id_and_reaction_type", unique: true
    t.index ["user_id"], name: "index_reactions_on_user_id"
  end

  create_table "record_layouts", force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.string "table_type", null: false
    t.bigint "table_id"
    t.text "layout_html"
    t.text "layout_css"
    t.text "layout_js"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "table_type", "table_id"], name: "index_record_layouts_on_org_and_table", unique: true
    t.index ["organization_id"], name: "index_record_layouts_on_organization_id"
  end

  create_table "site_submissions", force: :cascade do |t|
    t.bigint "site_id", null: false
    t.jsonb "data"
    t.datetime "submitted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["site_id"], name: "index_site_submissions_on_site_id"
  end

  create_table "sites", force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.string "name"
    t.text "description"
    t.jsonb "form_data"
    t.boolean "is_active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "site_data"
    t.index ["organization_id"], name: "index_sites_on_organization_id"
  end

  create_table "studio_blocks", force: :cascade do |t|
    t.bigint "studio_id", null: false
    t.string "block_type", null: false
    t.string "name", null: false
    t.integer "position_x", null: false
    t.integer "position_y", null: false
    t.text "config_data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["position_x", "position_y"], name: "index_studio_blocks_on_position_x_and_position_y"
    t.index ["studio_id", "block_type"], name: "index_studio_blocks_on_studio_id_and_block_type"
    t.index ["studio_id"], name: "index_studio_blocks_on_studio_id"
  end

  create_table "studio_executions", force: :cascade do |t|
    t.bigint "studio_id", null: false
    t.bigint "user_id"
    t.string "status", default: "pending", null: false
    t.string "execution_type", null: false
    t.text "input_data"
    t.text "output_data"
    t.text "error_data"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_studio_executions_on_created_at"
    t.index ["studio_id", "status"], name: "index_studio_executions_on_studio_id_and_status"
    t.index ["studio_id"], name: "index_studio_executions_on_studio_id"
    t.index ["user_id", "created_at"], name: "index_studio_executions_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_studio_executions_on_user_id"
  end

  create_table "studios", force: :cascade do |t|
    t.string "name", null: false
    t.string "studio_type", null: false
    t.string "status", default: "draft", null: false
    t.bigint "organization_id", null: false
    t.text "layout_data"
    t.text "connections_data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "studio_type"], name: "index_studios_on_organization_id_and_studio_type"
    t.index ["organization_id"], name: "index_studios_on_organization_id"
    t.index ["status"], name: "index_studios_on_status"
  end

  create_table "tasks", force: :cascade do |t|
    t.string "status", default: "Scheduled", null: false
    t.string "subject", null: false
    t.text "description"
    t.bigint "pet_id"
    t.datetime "completed_at"
    t.datetime "start_time"
    t.integer "duration_minutes"
    t.string "task_type"
    t.string "flag_list", default: [], array: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "organization_id"
    t.index ["organization_id"], name: "index_tasks_on_organization_id"
    t.index ["pet_id"], name: "index_tasks_on_pet_id"
  end

  create_table "user_ad_rewards", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "ad_id", null: false
    t.decimal "amount", default: "0.0"
    t.boolean "donated", default: false
    t.string "donated_to"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ad_id"], name: "index_user_ad_rewards_on_ad_id"
    t.index ["user_id"], name: "index_user_ad_rewards_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "role", default: 0
    t.bigint "organization_id"
    t.string "first_name"
    t.string "last_name"
    t.integer "impersonated_by_id"
    t.integer "sign_in_count"
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "state"
    t.string "county"
    t.string "city"
    t.string "zip_code"
    t.float "latitude"
    t.float "longitude"
    t.date "birthdate"
    t.integer "gender"
    t.boolean "can_post_as_organization", default: false, null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["organization_id"], name: "index_users_on_organization_id"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "ad_impressions", "ads"
  add_foreign_key "ad_impressions", "users"
  add_foreign_key "calendar_shares", "calendars"
  add_foreign_key "calendar_shares", "users"
  add_foreign_key "calendars", "organizations"
  add_foreign_key "calendars", "users", column: "created_by_id"
  add_foreign_key "comment_reactions", "comments"
  add_foreign_key "comment_reactions", "users"
  add_foreign_key "comments", "posts"
  add_foreign_key "comments", "users"
  add_foreign_key "custom_field_values", "custom_fields"
  add_foreign_key "custom_field_values", "custom_records"
  add_foreign_key "custom_fields", "custom_objects"
  add_foreign_key "custom_objects", "organizations"
  add_foreign_key "custom_records", "custom_objects"
  add_foreign_key "event_participants", "events"
  add_foreign_key "event_participants", "users"
  add_foreign_key "event_tasks", "events"
  add_foreign_key "event_tasks", "tasks"
  add_foreign_key "events", "calendars"
  add_foreign_key "events", "organizations"
  add_foreign_key "events", "users", column: "organizer_id"
  add_foreign_key "flow_blocks", "flows"
  add_foreign_key "flow_executions", "flows"
  add_foreign_key "flow_executions", "users"
  add_foreign_key "flows", "organizations"
  add_foreign_key "organization_assets", "organizations"
  add_foreign_key "organization_users", "organizations"
  add_foreign_key "organization_users", "users"
  add_foreign_key "pets", "organizations"
  add_foreign_key "pets", "users", column: "owner_id"
  add_foreign_key "pinned_tabs", "users"
  add_foreign_key "post_attachments", "posts"
  add_foreign_key "posts", "organizations"
  add_foreign_key "posts", "pets"
  add_foreign_key "posts", "users"
  add_foreign_key "reactions", "posts"
  add_foreign_key "reactions", "users"
  add_foreign_key "record_layouts", "organizations"
  add_foreign_key "site_submissions", "sites"
  add_foreign_key "sites", "organizations"
  add_foreign_key "studio_blocks", "studios"
  add_foreign_key "studio_executions", "studios"
  add_foreign_key "studio_executions", "users"
  add_foreign_key "studios", "organizations"
  add_foreign_key "tasks", "organizations"
  add_foreign_key "tasks", "pets"
  add_foreign_key "user_ad_rewards", "ads"
  add_foreign_key "user_ad_rewards", "users"
  add_foreign_key "users", "organizations"
end
