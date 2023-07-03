# Describes a single email list notification description.

class NotificationEmailList < FotechActiveRecord
    belongs_to :organization, foreign_key: :organization_id

    # Update a single field of the given record.
    def self.update_field(listId, user, fieldName, value)
        if fieldName == 'is_active'
            valstr = (value == '1' ? 'true' : 'false')
        else
            raise "You cannot modify the field #{fieldName}."
        end

        sql = "
            UPDATE notification_email_lists
            SET #{fieldName} = #{valstr},
                updated_at = now() at time zone 'UTC'
            WHERE id = #{listId}
            "

        update_one(listId, user, "notification email list", sql)
    end
end
