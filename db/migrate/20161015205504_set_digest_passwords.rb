# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

# Reads the existing apache auth file and moves their password to the DB
class SetDigestPasswords < ActiveRecord::Migration[5.2]
  def self.up
    accounts = nil
    if File.exists?('/opt/Fotech/panoptes/etc/web/apache-passwd.dat')
      accounts = File.readlines('/opt/Fotech/panoptes/etc/web/apache-passwd.dat').map do |line|
        line.strip.split(':').map
      end
    end

    if accounts.nil? or accounts.empty?
      accounts = [["admin", "", Authentication.generate_password("admin", "fotechf00")]]
    end

    accounts.each do |a|
      if user = User.not_deleted.find_by_loginname(a[0])
        user.password = a[2] # THIS IS THE HASHED PASSWORD!!
        user.save!
      end
    end
  end

  def self.down
    # No op
  end
end
