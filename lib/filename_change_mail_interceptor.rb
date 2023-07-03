
class FilenameChangeMailInterceptor
    def self.delivering_email(message)
        message.perform_deliveries = false

        File.open("/opt/Fotech/panoptes/etc/web/mail/#{UUIDTools::UUID.timestamp_create.to_s}.eml", "w") { |f| f.write(message.to_s) }
    end
end
