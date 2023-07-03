class AlertConfiguration < ApplicationRecord
    validates :key, uniqueness: { scope: :alert_type}

    def self.create_or_update(alert_type, key,value)
        conf = AlertConfiguration.where(alert_type: alert_type, key: key).first
        unless conf
            conf = AlertConfiguration.new :alert_type => alert_type, :key => key
        end
        conf.value = value
        conf.save
    end
end
