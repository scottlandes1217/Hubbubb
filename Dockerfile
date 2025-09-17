# syntax = docker/dockerfile:1

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version and Gemfile
ARG RUBY_VERSION=3.3.0
FROM registry.docker.com/library/ruby:$RUBY_VERSION-slim as base

# Rails app lives here
WORKDIR /rails

# Set development environment
ENV RAILS_ENV="development" \
    BUNDLE_PATH="/usr/local/bundle" \
    PATH="/usr/local/bundle/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

# Install packages needed for development
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    libpq-dev \
    libvips \
    pkg-config \
    postgresql-client \
    curl \
    nodejs \
    npm \
    netcat-traditional && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Configure non-root user and set up tmp directory
RUN useradd rails --create-home --shell /bin/bash && \
    mkdir -p /rails/tmp/cache && \
    chown -R rails:rails /rails && \
    chmod -R 755 /rails/tmp

# Fix permissions for bundle path
RUN chown -R rails:rails /usr/local/bundle

# Add a script to be executed every time the container starts
COPY bin/docker-entrypoint /usr/bin/
RUN chmod +x /usr/bin/docker-entrypoint

COPY bin/fix-bundle-permissions.sh /usr/bin/
RUN chmod +x /usr/bin/fix-bundle-permissions.sh

USER rails:rails

ENTRYPOINT ["/usr/bin/fix-bundle-permissions.sh", "docker-entrypoint"]

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["./bin/rails", "server"]
