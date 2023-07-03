class AlertMailer < ApplicationMailer
    helper :application

    default from: APP_CONFIG["repository"]["support_email"]

    def test_email
        @settings = params[:settings]
        mail(to: params[:recipients].split(';'), subject: 'Panoptes test email')
    end

    def alarm_notification_email
        setup_email(params[:alert], params[:org_prefs], params[:system_prefs], params[:subject], params[:reason])
        mail(to: params[:recipients].split(';'), subject: @subject)
    end

    def alarm_notification_sms
        setup_email(params[:alert], params[:org_prefs], params[:system_prefs], params[:subject], params[:reason])
        mail(to: params[:recipients].split(';'), subject: @subject)
    end

    def setup_email(alert, org_prefs, system_prefs, subject, reason)
        @alert = alert
        @subject= subject
        unless org_prefs['notifications_language'].blank? or org_prefs['notifications_language'].value.blank?
            I18n.locale = org_prefs['notifications_language'].value.to_sym
        end

        @timezonepref = org_prefs["notifications_timezone"]
        if @timezonepref
            if ActiveSupport::TimeZone::MAPPING.values.include? @timezonepref.value
                @timezone = @timezonepref.value
            else
                @timezone = 'Etc/UTC'
            end
        else
            @timezone = 'Etc/UTC'
        end
        @latlng_format = 'deg_dec'
        @latlng_format = org_prefs["notifications_latlng_format"].value if org_prefs['notifications_latlng_format']

        reasonstr = ''
        if reason == 'escalated'
            reasonstr = I18n.t("alert.response.escalate") + "/" + I18n.t("alert.threat_level.#{ alert.threat_level }")
        else
            reasonstr = I18n.t("alert.status.#{ alert.status }")
        end
        @subject += " - " +  I18n.t("alert.name.#{ alert.name }")
        @subject += " [ ##{alert.id} #{reasonstr} ]"

        @identity_hash = {}
        @identity_hash[:name] = system_prefs['identity_name'].value if system_prefs['identity_name']
        @identity_hash[:serial_number] = system_prefs['identity_serial_number'].value if system_prefs['identity_serial_number']
        @identity_hash[:uuid] = system_prefs['identity_uuid'].value if system_prefs['identity_uuid']
        @identity_hash[:custom_name] = org_prefs['identity_custom_name'].value if org_prefs['identity_custom_name']
        @identity_hash[:custom_id] = org_prefs['identity_custom_id'].value if org_prefs['identity_custom_id']
        @identity_hash[:version] = APP_CONFIG["monitor"]["version"]

        setup_preferences
    end

    def setup_preferences
        @preferences_hash = {}
        @preferences_hash["units-distance"] = "m"
        @preferences_hash["precision-distance"] = "0"
    end

end
