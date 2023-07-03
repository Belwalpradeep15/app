# FILENAME:     organization.rb
# AUTHOR:       Aaron Rustad <arustad@anassian.com>
# CREATED ON:   Sat  7 Mar 2009 11:15:20 MST
#
# DESCRIPTION:  Represents the organization.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.

class Organization < FotechActiveRecord
    has_and_belongs_to_many :users, -> { where "users.deleted_at IS NULL" }
    has_many :fibre_lines, foreign_key: :owner_id
    has_many :overview_diagrams
    has_many :alerts
    has_many :reference_points
    has_many :organization_preferences
    has_many :notification_email_lists
    has_many :markers

    scope :not_deleted, -> { where deleted_at: nil }
    # scope :ordered, lambda { |field|
    #   { :order => "upper(#{field})" }
    # }

    validates_presence_of :name

    # These are used to cache some values at the controller, to pass on to the view.
    attr_accessor :identity_preferences_cache
    attr_accessor :notification_preferences_cache
    attr_accessor :notification_email_lists_cache

    # Delete the given organization and all its dependants provided that it does not have any
    # fibre lines. If it does have fibre lines they, and the organization, are simply marked
    # as deleted.
    def self.delete_with_dependants(organizationId, userId)
        hasLines = FibreLine.exists?(:owner_id => organizationId)
        hasAlerts = Alert.exists?(:organization_id => organizationId)
        hasPrefs = OrganizationPreference.exists?(:organization_id => organizationId)
        hasMarkers = Marker.exists?(:organization_id => organizationId)

        NotificationEmailList.where(organization_id: organizationId).destroy_all
        User.mark_as_deleted_by_organization(organizationId)
        #    connection().execute("DELETE FROM organizations_users WHERE organization_id = #{organizationId}")
        if (hasLines or hasAlerts or hasPrefs or hasMarkers)
            FibreLine.mark_as_deleted_by_organization(organizationId, userId)
			      Organization.where("id = ?", organizationId).update_all("deleted_at = now() at time zone 'UTC', updated_at = now() at time zone 'UTC'")
        else
            ReferencePoint.where(organization_id: organizationId).destroy_all
            Organization.delete(organizationId);
        end
    end
end
