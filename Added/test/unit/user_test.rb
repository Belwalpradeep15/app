# FILENAME:     user_test.rb
# AUTHOR:       Karina Simard
# CREATED ON:   2009-12-08
# 
# DESCRIPTION:  User unit tests.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


require 'test_helper'

class UserTest < ActiveSupport::TestCase

	should validate_uniqueness_of(:loginname)
	
	context "Deleting a user" do
		context "that has not created a fibre" do
			should "be deleted outright" do
			end
			should "no longer be associated to any organization" do
			end
		end
		context "that has created a fibre" do
			should "be marked as deleted" do
			end
			should "no longer be associated to any organization" do
			end
		end
        context "that has responded to an alert" do
            should "be marked as deleted" do
                @user = User.find(users(:alert_user).id)
                @user.delete_with_dependancies
                @user = User.find(users(:alert_user).id)
                assert_not_nil @user.deleted_at
            end
        end
		context "based on organization id" do
			context "and user also belongs to another organization" do
				should "only the user-organization association is deleted outright" do
				end
			end
			context "and user only belongs to this one organization" do
				context "and user has created a fibre line" do
					should "mark the user as deleted" do
					end
				end
				context "and user has not created a fibre" do
					should "delete the user outright" do
					end
				end
			end
		end
	end
end