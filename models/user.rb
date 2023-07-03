# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

class User < ApplicationRecord
    include Memoizer

    has_and_belongs_to_many :roles
    has_and_belongs_to_many :organizations, -> { where("organizations.deleted_at IS NULL").order(:name) }
    has_many :alert_responses

    default_scope { order "users.fullname ASC" }
    scope :not_deleted, -> { where deleted_at: nil }

    validates_uniqueness_of :loginname

    def role_symbols
        (roles || []).map {|r| r.title.to_sym}
    end

    memoize :role_symbols

    def set_password password
        self.password = Authentication.generate_password(self.loginname, password)
        self
    end

    def self.user_name_exists?(user_name)
        user_name.nil? ? false : exists?(["loginname = ? ", user_name])
    end

    # attempt to physically delete the user, otherwise mark as deleted
    def delete_with_dependancies
        # Set deleted_at if the user created or updated fibre_lines
        count = User.where("id = #{self.id} AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM fibre_lines WHERE #{self.id} in (created_by, updated_by))")
                    .update_all("deleted_at = now() at time zone 'UTC', updated_at = now() at time zone 'UTC'")

        # If not marked as deleted, set deleted_at if the user has any alert responses.
        if count == 0
              count = User.where("id = #{self.id} AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM alert_responses WHERE user_id = #{self.id} )")
                          .update_all("deleted_at = now() at time zone 'UTC', updated_at = now() at time zone 'UTC'")
        end

        #if successfully marked as deleted, remove all organization associations
        if count == 1
            self.organizations.clear
            self.roles.clear
            self.save
            return 1
        end

        # If nothing was updated then destroy (this will automatically get rid of organization and role associations)
        self.destroy
    end

    # Check if the user only belongs to this organization and attempt to delete.
    def self.mark_as_deleted_by_organization(organizationId)
        organization = Organization.find(organizationId)
        organization.users.each do |user|
            #if this is their only organization attempt to delete user
            if user.organizations.length == 1 and user.organizations.first == organization and !(user.is_a? :system_admin)
                user.delete_with_dependancies
            else
                #otherwise just delete association
                user.organizations.delete(organization)
            end
        end
    end

    def is_a? role
        return self.role_symbols.include? role if role.is_a? Symbol
        super
    end
end
