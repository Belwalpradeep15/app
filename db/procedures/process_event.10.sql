/*
FILENAME:     process_event.sql
AUTHOR:       Steven Klassen
CREATED ON:   2010-08-21
LAST CHANGE:
  $Author: $
    $Date: $
     $Rev: $
     $URL: $

COPYRIGHT:
This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

This function performs processing on an event that should occur when a new event is
created (i.e. within the same transaction). Essentially it contains the business logic that
can be more efficiently handled in PL/pgSQL than in C.

*/

CREATE OR REPLACE FUNCTION fotech_process_event(eventId integer, uuidForEventTrack varchar)
RETURNS void AS $$

DECLARE
    event           record;
    trackingConfig  record;
    eventTrackId    integer;
    alertId         integer;
    eventTypeId     integer;
    alertsEnabled   varchar;
BEGIN

    -- Read the event record to ensure it exists and to obtain its current state.
    SELECT  e.*, 
            et.name AS event_type_name, 
            fl.owner_id AS organization_id
    INTO    event
    FROM    events e
    INNER JOIN event_types et ON et.id = e.event_type_id
    INNER JOIN fibre_lines fl ON fl.id = e.fibre_line_id
    WHERE   e.id = eventId;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'The event record for % could not be found.', eventId;
    END IF;
   
    -- Determine if this event is being suppressed by schedules
    UPDATE events e
    SET is_suppressed = EXISTS (
            SELECT schedules.* 
            FROM schedules
            INNER JOIN events on events.id = event.id
            INNER JOIN tz_world on ST_CONTAINS(tz_world.the_geom, events.location)
            WHERE schedules.alarm_types like '%,' || event.event_type_name || '_alert%'
            AND NOT exists (select * from schedule_exceptions
                            WHERE schedule_exceptions.schedule_id = schedules.id
                            AND events.time between schedule_exceptions.start_time and schedule_exceptions.end_time)
            AND exists (SELECT 1 FROM schedule_regions
                        INNER JOIN events e2 ON st_contains(schedule_regions.geom, e2.location)
                        WHERE schedule_regions.schedule_id = schedules.id
                        AND e2.id = events.id)
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
                )
             )
    WHERE e.id = event.id;

 
    -- Determine if the event should belong to a track, if it does not already.
    IF event.event_track_id IS NULL THEN
    
        SELECT  id
        INTO    eventTrackId
        FROM    event_tracks
        WHERE   uuid = uuidForEventTrack;
        
        IF NOT FOUND THEN
            INSERT INTO event_tracks(uuid, start_time, created_at, updated_at)
            VALUES (uuidForEventTrack, event.time, now() at time zone 'UTC', now() at time zone 'UTC')
            RETURNING id
            INTO eventTrackId;
        END IF;

        -- If a track was determined or created, we update the event and possibly the track type.
        -- Specifically if the track type has not been set and the event type is known, we set
        -- the track type to match. Or if the track type has been set and the event type is
        -- unknown we change the event type to match the track.
        IF eventTrackId IS NOT NULL THEN
        
            IF event.event_type_name = 'unknown' THEN
                SELECT event_type_id
                INTO   eventTypeId
                FROM   event_tracks
                WHERE  id = eventTrackId
                AND    event_type_id IS NOT NULL;

                IF FOUND THEN
                    UPDATE  events
                    SET     event_type_id = eventTypeId
                    WHERE   id = event.id;
                END IF;
            ELSE
                UPDATE event_tracks
                SET    event_type_id = event.event_type_id
                WHERE  id = eventTrackId
                AND    event_type_id IS NULL;
            END IF;
            
            UPDATE  events
            SET     event_track_id = eventTrackId
            WHERE   id = event.id;
        END IF;

    END IF;
    
    -- Add event tags for any regions that contain this event.
    INSERT INTO event_tags (event_id, key, value, units, created_at, updated_at, visible) 
    SELECT  event.id, 'in_region_' || frt.name, fr.description, NULL, now() at time zone 'UTC', now() at time zone 'UTC', TRUE 
    FROM    fibre_regions fr 
    INNER JOIN fibre_region_types frt ON frt.id = fr.fibre_region_type_id 
    WHERE  fr.fibre_line_id = event.fibre_line_id
    AND    fr.description IS NOT NULL
    AND    event.position BETWEEN fr.starting_position AND (fr.starting_position + fr.length);
    
    -- Add an event tag specifying the distance from the helios unit, if the helios unit position exists.
    INSERT INTO event_tags (event_id, key, value, units, created_at, updated_at, visible) 
    SELECT  e.id, 'distance_from_helios', st_distance_sphere(e.location, hu.location), 'distance', 
            now() at time zone 'UTC', now() at time zone 'UTC', TRUE 
    FROM    events e 
    INNER JOIN fibre_lines fl ON fl.id = e.fibre_line_id 
    LEFT OUTER JOIN helios_units hu ON hu.id = fl.helios_unit_id 
    WHERE   e.id = event.id AND hu.location IS NOT NULL;
END;
$$ LANGUAGE plpgsql;



