require 'faker'

# Ensure the first user exists or create a new one
user = User.first || User.create!(email: "test@example.com", role: "admin", password: "password")

# Create 10 posts for the user
10.times do
  post = user.posts.create!(body: "This is a test post #{Faker::Lorem.sentence}")

  3.times do
    attachment = post.post_attachments.create!
    attachment.file.attach(
      io: File.open(Rails.root.join("/Users/scottlandes/Downloads/bordercollie.webp")),
      filename: "test_image.jpg",
      content_type: "image/jpeg"
    )
  end
end