require 'test_helper'

class OrganizationTest < ActiveSupport::TestCase
  context "An organization list" do
	should "be ordered" do
		
	end
  end
  
  context "Creating an organization" do
	should "succeed" do
		o = Organization.new
		o.name = "New Organization"
		assert o.save
	end
	
	should "fail because of empty name" do
		o = Organization.new
		assert !o.save
	end
  end
  
  context "Editing an organization" do
	should "save with no edits" do
		assert organizations(:fotech).save
	end
	
	should "not save when name cleared" do
		o = organizations(:fotech)
		o.name = ''
		assert !o.save
	end
  end
  
  context "Deleting an organization" do
	context "with no fibres and no users" do
		should "delete outright" do
			o = Organization.new
			o.name = "New Organization"
			if o.save
				Organization.delete_with_dependants o.id, users(:system_admin).id
				assert !Organization.exists?(o.id)
			else
				raise "new organization did not save properly"
			end
		end
	end

	context "with fibres and users" do
		should "mark the organization, users, fibre lines as deleted" do
			o = organizations(:fotech)
			Organization.delete_with_dependants o.id, users(:system_admin).id
			assert !Organization.find(o.id).deleted_at.nil?
			assert Organization.not_deleted.find_by_id(o.id).nil?
			assert FibreLine.not_deleted.find_by_owner_id(o.id).nil?
			assert Organization.find(o.id).users.count == 0
		end
	end
    
    context "with alerts" do
        should "mark the organization as deleted" do
            o = organizations(:alert_org)
			Organization.delete_with_dependants o.id, users(:system_admin).id
			assert !Organization.find(o.id).deleted_at.nil?
			assert Organization.not_deleted.find_by_id(o.id).nil?
            
            o = organizations(:alert_org2)
			Organization.delete_with_dependants o.id, users(:system_admin).id
			assert !Organization.find(o.id).deleted_at.nil?
			assert Organization.not_deleted.find_by_id(o.id).nil?
        end
    end
  end
end
