namespace :admin do
  desc "Create an admin user"
  task create_admin: :environment do
    User.create!(
      email: 'scottandvega@gmail.com',
      password: 'password123',
      role: 2,  # Use the integer value directly (2 = admin)
      first_name: 'Scott',
      last_name: 'Landes'
    )
    puts "Admin user created successfully!"
  end
end 