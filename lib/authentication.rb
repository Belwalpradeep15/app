# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.

require 'digest/md5'

module Authentication
  REALM = "Fotech Panoptes"

  def self.get_provider
    APP_CONFIG['monitor']['auth_provider']
  end

  def self.is_provider?(check)
    check == Authentication.get_provider
  end

  # Unfortunately this function has to store the current DB password into a file which `htpasswd` can read to do the verify
  # A custom version of the auth could be easily created but beyond the scope here
  def self.verify_password(u, password)
    raise "User is required" unless u.is_a?(User)
    raise "Cannot set empty password" unless password.length

    hash = Digest::MD5.hexdigest([u.loginname, self::REALM, password].join(':'))

    hash === u.password
  end

  def self.generate_password(username, password)
    raise "Username cannot be blank" unless username.length
    raise "Cannot set empty password" unless password.length

    Digest::MD5.hexdigest([username, self::REALM, password].join(':'))
  end
end