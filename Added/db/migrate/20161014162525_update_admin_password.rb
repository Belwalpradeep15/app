# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

# Sets the password to `fotechf00` for the `admin` user
class UpdateAdminPassword < ActiveRecord::Migration[5.2]
  def self.up
    user = User.not_deleted.find_by_loginname("admin")
    user.set_password "fotechf00"
    user.save!

  end

  # No DOWN
  def self.down
  end
end
