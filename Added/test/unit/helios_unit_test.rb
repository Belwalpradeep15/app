# FILENAME:     helios_unit_test.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-12-01
# 
# DESCRIPTION:  HeliosUnit unit tests.
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

class HeliosUnitTest < ActiveSupport::TestCase
    context "A helios unit" do
        setup do
            @id = helios_units(:h1).id
            @user = User.find(users(:system_admin).id)
        end
        
        # Basic modification tests.
        context "can modify its fields" do
            should "have the new name" do
                HeliosUnit.update_field(@id, @user, 'name', 'newname')
                @helios = HeliosUnit.find(@id)
                assert_equal @helios.name, 'newname'
            end
            
            should "have the new serial number" do
                HeliosUnit.update_field(@id, @user, 'serial_number', 'serial_no')
                @helios = HeliosUnit.find(@id)
                assert_equal @helios.serial_number, 'serial_no'
            end
            
            should "have the new host name" do
                HeliosUnit.update_field(@id, @user, 'host_name', 'myhost')
                @helios = HeliosUnit.find(@id)
                assert_equal @helios.host_name, 'myhost'
            end
            
            should "have the new port" do
                HeliosUnit.update_field(@id, @user, 'port', '1234')
                @helios = HeliosUnit.find(@id)
                assert_equal @helios.port, 1234
            end
        end
        
        # Exception generation tests.
        context "when failing" do
            should "throw an exception if the port number is invalid" do
                assert_raise ActiveRecord::StatementInvalid do
                    HeliosUnit.update_field(@id, @user, 'port', 'notanumber')
                end
            end
            
            should "throw an exception if the serial number already exists" do
                assert_raise ActiveRecord::StatementInvalid do
                    HeliosUnit.update_field(@id, @user, 'serial_number', 'h2')
                end
            end
            
            should "throw an exception if the field name is not valid" do
                assert_raise RuntimeError do
                    HeliosUnit.update_field(@id, @user, 'notafield', 'somevalue')
                end
            end
        end
    end
end

