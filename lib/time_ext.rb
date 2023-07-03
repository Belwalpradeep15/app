
class Time

  def self.tz_offset_mins_to_hhmm(tz_offset_mins)
    ActiveSupport::TimeZone.seconds_to_utc_offset(60 * (tz_offset_mins.nil?? 0 : tz_offset_mins))
  end

  def xmlschema_in_tz_offset(tz_offset_mins)
    t = getutc + 60 * tz_offset_mins
    t.strftime('%Y-%m-%dT%H:%M:%S') + self.class.tz_offset_mins_to_hhmm(tz_offset_mins)
  end

  def to_default_s_in_tz_offset(tz_offset_mins)
    t = getutc + 60 * tz_offset_mins
    t.strftime('%Y-%m-%d %H:%M:%S ') + self.class.tz_offset_mins_to_hhmm(tz_offset_mins)
  end

  def Time.convert_local_to_UTC_time(date, time)
    Time.parse("#{date}" + " " + "#{time}" ) - Time.zone.utc_offset
  end

  def Time.convert_UTC_to_local_time(date, time)
    Time.parse("#{date}" + " " + "#{time.strftime("%H:%M")}") + Time.zone.utc_offset
  end

  def Time.convert_UTC_alarm_repeating_days_into_local(local_time, date_time_UTC, repeating_days)
     if local_time != date_time_UTC
                repeating_days_array = repeating_days.split(",")
                if local_time.to_date > date_time_UTC.to_date
                  repeating_days_array.each_with_index { |day,index|
                  repeating_days_array["#{index}".to_i] = day.to_i + 1 > 6 ? "0" : day.to_i + 1  unless  index == 0
                  }
                else
                  repeating_days_array.each_with_index { |day,index|
                  repeating_days_array["#{index}".to_i] = day.to_i - 1 < 0 ? "6" : day.to_i - 1  unless  index == 0
                  }
                end
                repeating_days =  repeating_days_array.join(",")
      end
      repeating_days
  end

  def Time.convert_local_time_zone_alarm_repeating_days_into_UTC(local_time, date_time_UTC, repeating_days_array)
     if local_time != date_time_UTC
                if local_time.to_date < date_time_UTC.to_date
                  repeating_days_array.each_with_index { |day,index|
                  repeating_days_array["#{index}".to_i] = day.to_i + 1 > 6 ? "0" : day.to_i + 1
                  }
                else
                  repeating_days_array.each_with_index { |day,index|
                  repeating_days_array["#{index}".to_i] = day.to_i - 1 < 0 ? "6" : day.to_i - 1
                  }
                end
      end
       repeating_days = ',' + repeating_days_array.join(',')
  end

end
