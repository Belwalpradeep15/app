# This file is used by Rack-based servers to start the application.

# Update the path so that custom ruby can be found while running bin/rails in the app.
ENV['PATH'] = '/opt/Fotech/common/ruby/bin:' + ENV['PATH']

require_relative 'config/environment'

run Rails.application
