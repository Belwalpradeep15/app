class Schedule < ApplicationRecord
    has_paper_trail
    has_many :exceptions, -> { where 'schedule_exceptions.end_time > now()' }, class_name: 'ScheduleException'
    has_many :regions, class_name: 'ScheduleRegion'
    default_scope { order "lower(name) ASC" }

    def is_suppressing?(alarm_type)
        (alarm_types || '').split(',').include? alarm_type
    end

    # determines if the incoming event is suppressed by
    def self.suppresses?(an_event)
        find_those_that_suppress(an_event).count > 0
    end

    def self.is_repeating?(is_repeating_val)
      return  is_repeating_val == "1" ? true : false
    end

    #grabs the actual schedules that suppress an event
    def self.find_those_that_suppress(an_event)
        sql = <<-SQL
            SELECT schedules.*
            FROM schedules
            JOIN events on events.id = #{an_event.id}
            JOIN tz_world on ST_CONTAINS(tz_world.the_geom, events.location)
            WHERE schedules.alarm_types like '%,#{an_event.event_type.name}_alert%'
            AND NOT exists (select * from schedule_exceptions
                            WHERE schedule_exceptions.schedule_id = schedules.id
                            AND events.time between schedule_exceptions.start_time and schedule_exceptions.end_time)
            AND exists (select * from schedule_regions
                        where schedule_regions.schedule_id = schedules.id
                        AND ST_CONTAINS(schedule_regions.geom, events.location))
            AND (
                 (schedules.is_repeating != 't'
                  AND timezone(tzid, timezone('UTC', events.time)) > (schedules.start_date || ' ' || schedules.start_time)::timestamp
                  AND timezone(tzid, timezone('UTC', events.time)) <= (schedules.end_date || ' ' || schedules.end_time)::timestamp
                 )
                 OR
                 (schedules.is_repeating = 't'
                  AND timezone(tzid, timezone('UTC', events.time))> schedules.start_date
                  AND (timezone(tzid, timezone('UTC', events.time)))::time between schedules.start_time and schedules.end_time
                  AND schedules.repeats_on like '%' || extract(dow from timezone(tzid, timezone('UTC', events.time))) || '%'
                  AND (schedules.repeat_ends_on IS NULL OR (timezone(tzid, timezone('UTC', events.time)) <= (schedules.repeat_ends_on || ' 23:59')::timestamp))
                 )
                );
        SQL
        self.find_by_sql sql
    end

    def is_currently_active?
        #if current time is within the time frame specified
        #can't really specify this until we can parse a timezone
    end
end
