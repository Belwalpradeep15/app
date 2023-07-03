# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights reserved.

class Preference < ApplicationRecord

    # Return all the preferences for the given user as a hash.
    def self.by_user(user)
        prefs = Preference.where(user_id: user.id)
        hash = {}
        if prefs
            prefs.each { |pref| hash[pref.key] = pref.value }
        end
        hash
    end

    # Field mappings for the search infrastructure.
    def self.field_mappings
        @@FIELD_MAPPINGS
    end

    # Field joins for the search infrastructure.
    def self.field_joins
        @@FIELD_JOINS
    end

    # Search callback for the search infrastructure.
    def self.do_find(conditions, options, joins)
        where(conditions).joins(joins).order(options.order).limit(options.limit)
    end

    # XML callback for the search infrastructure.
    def to_xml(options = {})
        xml = options[:builder] ||= Builder::XmlMarkup.new(:indent => options[:indent])
        xml.Preference({"preference-id" => id, "key" => key}, value)
    end

    # Create or update a preference.
    def self.create_or_update(key, value, current_user)
        transaction do
            count = where("key = '#{key}' AND user_id = #{current_user.id}").update_all("value = '#{value}', updated_at = now() at time zone 'UTC'")
            if count == 0
                pref = Preference.new
                pref.key = key
                pref.value = value
                pref.user_id = current_user.id
                pref.save
            end
        end
    end

    private

    @@FIELD_MAPPINGS = {
        "PreferenceId"  => { :field => 'preferences.id' },
        "UserId"        => { :field => 'preferences.user_id' },
        "Key"           => { :field => 'preferences.key', :quoted => true },
        "Value"         => { :field => 'preferences.value', :quoted => true }
    }

    @@FIELD_JOINS = {}
end
