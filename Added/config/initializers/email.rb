# FILENAME:     email.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-12-21
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.



# Loads action_mailer settings from email.yml
# and turns deliveries on if configuration file is found. (Based on code found in Redmine.)

filename = File.join(File.dirname(__FILE__), '..', 'email.yml')
if File.file?(filename)
  mailconfig = YAML::load_file(filename)

  overrides_file = '/opt/Fotech/panoptes/etc/email.yml'
  overrides = {}
  if File.file?(overrides_file)
    overrides = YAML::load_file(overrides_file)
  end

  if mailconfig.is_a?(Hash)
    config = overrides[Rails.env] || mailconfig[Rails.env] || {}

    config.each do |k, v|
      v.symbolize_keys! if v.respond_to?(:symbolize_keys!)
      ActionMailer::Base.send("#{k}=", v)
    end
  end
end

Mail.register_interceptor(FilenameChangeMailInterceptor)

