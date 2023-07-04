# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2016 Fotech Solutions Ltd. All rights reserved.

# Adds the column `password` to the users table for future auth
class AddUserPassword < ActiveRecord::Migration[5.2]
  def self.up
    add_column :users, :password, :string, :length => 55, :null => true
  end

  def self.down
    remove_column :users, :password
  end
end
