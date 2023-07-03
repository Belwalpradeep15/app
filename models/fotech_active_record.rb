# FILENAME:     fotech_active_record.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-12-19
#
# DESCRIPTION:  Active record extensions useful throughout Fotech applications.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.
require 'uuidtools'

# Fotech based active record extensions. This adds a number of methods we find
# generally useful.
class FotechActiveRecord < ApplicationRecord
    before_create :assign_uuid

    self.abstract_class = true

    # Perform a database vacuum. Typically we want this to be automatic, but at times
    # when we know we have done a significant bulk change (like after the purge) we
    # should run this to ensure that things remain efficient. Note that this is
    # Postgres specific.
    def self.vacuum
        conn = connection()
        conn.execute "VACUUM ANALYZE;"
    end

    # Returns true if the given sql returns one or more records and false otherwise.
    # This should be used when exists? does not provide enought power to handle
    # your query. This is typically the case if you need to join tables.
    def self.record_exists?(sql)
        res = find_by_sql(sql)
        return !res.empty?
    end

    # Escape any SQL reserved characters. Note that this changes the input string as well
    # as returns it. If you do not want the original string to be changed you can call it
    # using
    #   str2 = escape_sql(str.dup)
    def self.escape_sql(str)
        str.gsub!(/[\']/) do | match |      # ' get around xcode parsing problem
            case match
            when "\\" then "\\\\"
            when "'" then "''"
            end
        end
        return str
    end

    # Execute a command that will update exactly one record. Throws an exception if the SQL
    # does not update exactly one record.
    def self.update_one(id, user, objectName, sql)
        count = ActiveRecord::Base.connection.update(sql)
        raise "The user #{user.fullname} does not have permission to change the #{objectName} #{id}." \
            if count != 1
    end

    def assign_uuid
        if self.respond_to? :uuid and self.uuid.nil?
            self.uuid = UUIDTools::UUID.timestamp_create.to_s
        end
    end

end
