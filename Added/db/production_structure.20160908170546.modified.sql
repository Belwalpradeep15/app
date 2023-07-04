--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;


--
-- Name: fotech_process_event(integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION fotech_process_event(eventid integer, uuidforeventtrack character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$

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
                  AND (events.time)::timestamp > (schedules.start_date || ' ' || schedules.start_time)::timestamp
                  AND (events.time)::timestamp <= (schedules.end_date || ' ' || schedules.end_time)::timestamp
                 )
                 OR
                 (schedules.is_repeating = 't'
                  AND (events.time)::timestamp > (schedules.start_date || ' ' || schedules.start_time)::timestamp
                  AND ( CASE WHEN schedules.start_time < schedules.end_time
                            THEN  (events.time)::time between schedules.start_time and schedules.end_time
                            ELSE  (events.time)::time NOT between schedules.end_time and schedules.start_time
                        END
                      )
                  AND ( CASE WHEN (schedules.start_time > schedules.end_time AND (events.time)::time between '00:00' and schedules.end_time  )
                               THEN schedules.repeats_on like '%' || extract(dow from (events.time)::timestamp - INTERVAL '1 day')  || '%'
                             ELSE
                                    schedules.repeats_on like '%' || extract(dow from (events.time)::timestamp) || '%'
                             END
                       )
                  AND (schedules.repeat_ends_on IS NULL OR ( (events.time)::timestamp <= (schedules.repeat_ends_on || ' 23:59')::timestamp ))
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
$$;


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: alert_configurations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE alert_configurations (
    id integer NOT NULL,
    alert_type character varying(255) NOT NULL,
    key character varying(255) NOT NULL,
    value character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: alert_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE alert_configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE alert_configurations_id_seq OWNED BY alert_configurations.id;


--
-- Name: alert_details; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE alert_details (
    id integer NOT NULL,
    alert_id integer NOT NULL,
    key character varying(255) NOT NULL,
    value character varying(255),
    visible boolean DEFAULT true NOT NULL
);


--
-- Name: alert_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE alert_details_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE alert_details_id_seq OWNED BY alert_details.id;


--
-- Name: alert_maintainers; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE alert_maintainers (
    id integer NOT NULL,
    name character varying(25) NOT NULL,
    description character varying(255) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: alert_maintainers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE alert_maintainers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_maintainers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE alert_maintainers_id_seq OWNED BY alert_maintainers.id;


--
-- Name: alert_responses; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE alert_responses (
    id integer NOT NULL,
    alert_id integer NOT NULL,
    user_id integer,
    "time" timestamp without time zone NOT NULL,
    response character varying(255) NOT NULL,
    comments text
);


--
-- Name: alert_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE alert_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alert_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE alert_responses_id_seq OWNED BY alert_responses.id;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE alerts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    comments text,
    "time" timestamp without time zone NOT NULL,
    time_acknowledged timestamp without time zone,
    time_resolved timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    organization_id integer,
    is_suppressed boolean DEFAULT false NOT NULL,
    threat_level character varying(10),
    notification_pending boolean DEFAULT false NOT NULL,
    notification_pending2 boolean DEFAULT false NOT NULL,
    alert_maintainer_id integer NOT NULL,
    CONSTRAINT valid_threat_level CHECK (((threat_level IS NULL) OR ((threat_level)::text = ANY ((ARRAY['clear'::character varying, 'green'::character varying, 'amber'::character varying, 'red'::character varying])::text[]))))
);


--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE alerts_id_seq OWNED BY alerts.id;


--
-- Name: apps; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE apps (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(80),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE applications_id_seq OWNED BY apps.id;


--
-- Name: apps_event_categories; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE apps_event_categories (
    event_category_id integer NOT NULL,
    app_id integer NOT NULL
);


--
-- Name: calibrations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE calibrations (
    id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    parent_point integer NOT NULL,
    distance double precision NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: calibrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE calibrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calibrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE calibrations_id_seq OWNED BY calibrations.id;


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE channels (
    id integer NOT NULL,
    channel_number integer NOT NULL,
    helios_unit_id integer NOT NULL,
    property_group_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    fibre_line_id integer
);


--
-- Name: channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE channels_id_seq OWNED BY channels.id;


--
-- Name: colour_maps; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE colour_maps (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    organization_id integer NOT NULL,
    colours text NOT NULL,
    created_by character varying(255) NOT NULL,
    updated_by character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    is_default boolean DEFAULT false
);


--
-- Name: colour_maps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE colour_maps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: colour_maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE colour_maps_id_seq OWNED BY colour_maps.id;


--
-- Name: configurations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE configurations (
    id integer NOT NULL,
    name character varying(255),
    fibre_line_id integer,
    helios_unit_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    uuid character varying(36) NOT NULL
);


--
-- Name: configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE configurations_id_seq OWNED BY configurations.id;


--
-- Name: configurations_property_groups; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE configurations_property_groups (
    configuration_id integer NOT NULL,
    property_group_id integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: controld_health_components; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE controld_health_components (
    id integer NOT NULL,
    component character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    is_healthy boolean NOT NULL,
    message character varying(255),
    statuses character varying(255)
);


--
-- Name: controld_health_components_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE controld_health_components_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: controld_health_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE controld_health_components_id_seq OWNED BY controld_health_components.id;


--
-- Name: controld_health_properties; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE controld_health_properties (
    id integer NOT NULL,
    controld_health_component_id integer NOT NULL,
    key character varying(255) NOT NULL,
    value character varying(255)
);


--
-- Name: controld_health_properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE controld_health_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: controld_health_properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE controld_health_properties_id_seq OWNED BY controld_health_properties.id;


--
-- Name: db_files; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE db_files (
    id integer NOT NULL,
    data bytea NOT NULL
);


--
-- Name: db_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE db_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: db_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE db_files_id_seq OWNED BY db_files.id;


--
-- Name: delayed_jobs; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE delayed_jobs (
    id integer NOT NULL,
    priority integer DEFAULT 0,
    attempts integer DEFAULT 0,
    handler text,
    last_error text,
    run_at timestamp without time zone,
    locked_at timestamp without time zone,
    failed_at timestamp without time zone,
    locked_by character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE delayed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE delayed_jobs_id_seq OWNED BY delayed_jobs.id;


--
-- Name: display_types; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE display_types (
    id integer NOT NULL,
    name character varying(15) NOT NULL,
    description character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: display_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE display_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: display_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE display_types_id_seq OWNED BY display_types.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE documents (
    id integer NOT NULL,
    description text,
    size integer,
    content_type character varying(255) NOT NULL,
    filename character varying(255),
    db_file_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    is_overview boolean DEFAULT false,
    organization_id integer
);


--
-- Name: documents_fibre_lines; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE documents_fibre_lines (
    document_id integer NOT NULL,
    fibre_line_id integer NOT NULL
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE documents_id_seq OWNED BY documents.id;


--
-- Name: documents_reference_points; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE documents_reference_points (
    id integer NOT NULL,
    document_id integer NOT NULL,
    reference_point_id integer NOT NULL,
    x_offset double precision NOT NULL,
    y_offset double precision NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: documents_reference_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE documents_reference_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_reference_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE documents_reference_points_id_seq OWNED BY documents_reference_points.id;


--
-- Name: event_categories; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE event_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(80),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: event_categories_fibre_lines; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE event_categories_fibre_lines (
    event_category_id integer NOT NULL,
    fibre_line_id integer NOT NULL
);


--
-- Name: event_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE event_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE event_categories_id_seq OWNED BY event_categories.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE events (
    id integer NOT NULL,
    "position" double precision NOT NULL,
    event_type_id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    amplitude double precision NOT NULL,
    "time" timestamp without time zone NOT NULL,
    confidence double precision NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    location geometry NOT NULL,
    event_track_id integer,
    width double precision DEFAULT 1.0 NOT NULL,
    velocity double precision DEFAULT 0.0 NOT NULL,
    acceleration double precision DEFAULT 0.0 NOT NULL,
    is_suppressed boolean DEFAULT false NOT NULL,
    alert_id integer,
    CONSTRAINT enforce_dims_location CHECK ((st_ndims(location) = 2)),
    CONSTRAINT enforce_geotype_location CHECK (((geometrytype(location) = 'POINT'::text) OR (location IS NULL))),
    CONSTRAINT enforce_srid_location CHECK ((st_srid(location) = (-1))),
    CONSTRAINT events_geometry CHECK (st_isvalid(location))
);


--
-- Name: event_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE event_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE event_logs_id_seq OWNED BY events.id;


--
-- Name: event_tags; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE event_tags (
    id integer NOT NULL,
    event_id integer NOT NULL,
    key character varying(40) NOT NULL,
    value character varying(255) NOT NULL,
    units character varying(10),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    visible boolean DEFAULT false NOT NULL
);


--
-- Name: event_tracks; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE event_tracks (
    id integer NOT NULL,
    uuid character varying(36) NOT NULL,
    start_time timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    event_type_id integer,
    alert_id integer
);


--
-- Name: event_tracks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE event_tracks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_tracks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE event_tracks_id_seq OWNED BY event_tracks.id;


--
-- Name: event_types; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE event_types (
    id integer NOT NULL,
    event_category_id integer NOT NULL,
    name character varying(15) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    clearing_interval integer
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE events_id_seq OWNED BY event_types.id;


--
-- Name: fibre_line_properties; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_line_properties (
    id integer NOT NULL,
    fibre_line_properties_group_id integer,
    key character varying(255),
    value character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: fibre_line_properties_groups; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_line_properties_groups (
    id integer NOT NULL,
    fibre_line_id integer,
    name character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: fibre_line_properties_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_line_properties_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_line_properties_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_line_properties_groups_id_seq OWNED BY fibre_line_properties_groups.id;


--
-- Name: fibre_line_properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_line_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_line_properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_line_properties_id_seq OWNED BY fibre_line_properties.id;


--
-- Name: fibre_lines; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_lines (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    owner_id bigint NOT NULL,
    geom geometry,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    display_type_id integer NOT NULL,
    deleted_at timestamp without time zone,
    updated_by integer,
    created_by integer,
    helios_unit_id integer,
    properties_synced_at timestamp without time zone,
    uuid character varying(36) NOT NULL,
    break_position double precision,
    redundancy_offset double precision DEFAULT 0 NOT NULL,
    zero_point double precision DEFAULT 0.0 NOT NULL,
    length double precision DEFAULT 1000.0 NOT NULL,
    helios_channel integer DEFAULT 1,
    CONSTRAINT enforce_dims_geom CHECK ((st_ndims(geom) = 2)),
    CONSTRAINT enforce_geotype_geom CHECK (((geometrytype(geom) = 'LINESTRING'::text) OR (geom IS NULL))),
    CONSTRAINT enforce_srid_geom CHECK ((st_srid(geom) = (-1))),
    CONSTRAINT fibre_lines_geometry CHECK (st_isvalid(geom))
);


--
-- Name: fibre_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_lines_id_seq OWNED BY fibre_lines.id;


--
-- Name: fibre_redundancies; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_redundancies (
    id integer NOT NULL,
    fibre_id integer NOT NULL,
    redundant_fibre_id integer NOT NULL,
    relation character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: fibre_redundancies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_redundancies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_redundancies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_redundancies_id_seq OWNED BY fibre_redundancies.id;


--
-- Name: fibre_region_types; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_region_types (
    id integer NOT NULL,
    name character varying(15) NOT NULL,
    description character varying(255) NOT NULL,
    symbol_name character varying(15),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: fibre_region_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_region_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_region_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_region_types_id_seq OWNED BY fibre_region_types.id;


--
-- Name: fibre_regions; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_regions (
    id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    fibre_region_type_id integer NOT NULL,
    starting_position double precision NOT NULL,
    length double precision NOT NULL,
    description character varying(255),
    symbol_name character varying(15),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    geom geometry,
    property_group_id integer,
    CONSTRAINT enforce_dims_geom CHECK ((st_ndims(geom) = 2)),
    CONSTRAINT enforce_srid_geom CHECK ((st_srid(geom) = (-1))),
    CONSTRAINT fibre_regions_geometry CHECK (st_isvalid(geom))
);


--
-- Name: fibre_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_regions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_regions_id_seq OWNED BY fibre_regions.id;


--
-- Name: fibre_shots; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE fibre_shots (
    id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    starting_position double precision NOT NULL,
    bin_size double precision NOT NULL,
    number_of_bins integer NOT NULL,
    "time" timestamp without time zone NOT NULL,
    amplitudes double precision[] NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    event_id integer
);


--
-- Name: fibre_shots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fibre_shots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fibre_shots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fibre_shots_id_seq OWNED BY fibre_shots.id;


SET default_with_oids = false;

--
-- Name: health_components; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE health_components (
    id integer NOT NULL,
    component character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    is_healthy boolean NOT NULL,
    message character varying(255),
    statuses character varying(255),
    CONSTRAINT health_components_component CHECK (((component)::text = ANY ((ARRAY['cabinet'::character varying, 'panoptes'::character varying, 'helios'::character varying, 'comms'::character varying, 'relay'::character varying, 'cable'::character varying])::text[])))
);


--
-- Name: health_components_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE health_components_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE health_components_id_seq OWNED BY health_components.id;


--
-- Name: helios_section_locations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE helios_section_locations (
    id integer NOT NULL,
    helios_unit_id integer,
    document_id integer,
    x_offset double precision,
    y_offset double precision,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: helios_section_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE helios_section_locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helios_section_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE helios_section_locations_id_seq OWNED BY helios_section_locations.id;


--
-- Name: helios_units; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE helios_units (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    serial_number character varying(50) NOT NULL,
    host_name character varying(50) NOT NULL,
    port integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    uuid character varying(36) NOT NULL,
    location geometry,
    channel_count integer DEFAULT 1 NOT NULL,
    CONSTRAINT enforce_dims_location CHECK ((st_ndims(location) = 2)),
    CONSTRAINT enforce_geotype_location CHECK (((geometrytype(location) = 'POINT'::text) OR (location IS NULL))),
    CONSTRAINT enforce_srid_location CHECK ((st_srid(location) = (-1))),
    CONSTRAINT helios_units_geometry CHECK (st_isvalid(location))
);


--
-- Name: helios_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE helios_units_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helios_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE helios_units_id_seq OWNED BY helios_units.id;


--
-- Name: notification_email_lists; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE notification_email_lists (
    id integer NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    name character varying(255) NOT NULL,
    recipients character varying(255),
    subject character varying(255),
    monday boolean DEFAULT false NOT NULL,
    tuesday boolean DEFAULT false NOT NULL,
    wednesday boolean DEFAULT false NOT NULL,
    thursday boolean DEFAULT false NOT NULL,
    friday boolean DEFAULT false NOT NULL,
    saturday boolean DEFAULT false NOT NULL,
    sunday boolean DEFAULT false NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    include_event_alarms boolean DEFAULT false NOT NULL,
    event_alarm_levels character varying(255),
    include_system_alarms boolean DEFAULT false NOT NULL,
    organization_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: notification_email_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE notification_email_lists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_email_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE notification_email_lists_id_seq OWNED BY notification_email_lists.id;


--
-- Name: organization_preferences; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE organization_preferences (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value character varying(500),
    organization_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: organization_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE organization_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organization_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE organization_preferences_id_seq OWNED BY organization_preferences.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE organizations_id_seq OWNED BY organizations.id;


--
-- Name: organizations_users; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE organizations_users (
    organization_id integer NOT NULL,
    user_id integer NOT NULL
);


--
-- Name: path_segments; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE path_segments (
    id integer NOT NULL,
    path_id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    start_distance integer NOT NULL,
    end_distance integer NOT NULL,
    distance_from_marker integer NOT NULL,
    normalizer integer NOT NULL,
    segment_order integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: path_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE path_segments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: path_segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE path_segments_id_seq OWNED BY path_segments.id;


--
-- Name: paths; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE paths (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    marker_name character varying(255) NOT NULL,
    label_towards character varying(255) NOT NULL,
    label_away character varying(255) NOT NULL,
    organization_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    updated_by integer,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: paths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE paths_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE paths_id_seq OWNED BY paths.id;


--
-- Name: preferences; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE preferences (
    id integer NOT NULL,
    user_id integer,
    key character varying(255),
    value character varying(255),
    parent character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE preferences_id_seq OWNED BY preferences.id;


--
-- Name: prf_references; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE prf_references (
    id integer NOT NULL,
    prf double precision NOT NULL,
    filters double precision[] NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: prf_references_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE prf_references_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prf_references_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE prf_references_id_seq OWNED BY prf_references.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE properties (
    id integer NOT NULL,
    key character varying(255),
    value character varying(255),
    property_group_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE properties_id_seq OWNED BY properties.id;


--
-- Name: property_group_types; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE property_group_types (
    id integer NOT NULL,
    name character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: property_group_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE property_group_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_group_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE property_group_types_id_seq OWNED BY property_group_types.id;


--
-- Name: property_groups; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE property_groups (
    id integer NOT NULL,
    property_group_type_id integer,
    name character varying(255),
    uuid character varying(36) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: property_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE property_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE property_groups_id_seq OWNED BY property_groups.id;


--
-- Name: reference_points; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE reference_points (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    label character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    location geometry,
    CONSTRAINT enforce_dims_location CHECK ((st_ndims(location) = 2)),
    CONSTRAINT enforce_geotype_location CHECK (((geometrytype(location) = 'POINT'::text) OR (location IS NULL))),
    CONSTRAINT enforce_srid_location CHECK ((st_srid(location) = (-1))),
    CONSTRAINT reference_points_geometry CHECK (st_isvalid(location))
);


--
-- Name: reference_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE reference_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reference_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE reference_points_id_seq OWNED BY reference_points.id;


--
-- Name: refresh; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE refresh (
    id integer NOT NULL,
    action character varying(100) NOT NULL,
    name character varying(255),
    need_refresh boolean DEFAULT false NOT NULL,
    pass_info character varying(255)
);


--
-- Name: refresh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE refresh_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE refresh_id_seq OWNED BY refresh.id;


--
-- Name: region_properties; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE region_properties (
    id integer NOT NULL,
    fibre_region_id integer,
    key character varying(255),
    value character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: region_properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE region_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: region_properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE region_properties_id_seq OWNED BY region_properties.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE roles (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description character varying(255) NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE roles_id_seq OWNED BY roles.id;


--
-- Name: roles_users; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE roles_users (
    role_id integer NOT NULL,
    user_id integer NOT NULL
);


--
-- Name: schedule_exceptions; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE schedule_exceptions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    schedule_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: schedule_exceptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE schedule_exceptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_exceptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE schedule_exceptions_id_seq OWNED BY schedule_exceptions.id;


--
-- Name: schedule_regions; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE schedule_regions (
    id integer NOT NULL,
    schedule_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    geom geometry,
    CONSTRAINT enforce_dims_geom CHECK ((st_ndims(geom) = 2)),
    CONSTRAINT enforce_srid_geom CHECK ((st_srid(geom) = (-1))),
    CONSTRAINT schedule_regions_geometry CHECK (st_isvalid(geom))
);


--
-- Name: schedule_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE schedule_regions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE schedule_regions_id_seq OWNED BY schedule_regions.id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE schedules (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_date date,
    end_time time without time zone NOT NULL,
    is_repeating boolean DEFAULT false NOT NULL,
    repeats_on character varying(255) DEFAULT ''::character varying NOT NULL,
    repeat_ends_on date,
    alarm_types character varying(255) DEFAULT ''::character varying NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE schedules_id_seq OWNED BY schedules.id;


--
-- Name: section_calibrations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE section_calibrations (
    id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    document_id integer NOT NULL,
    fibre_distances double precision[],
    x_offsets double precision[],
    y_offsets double precision[],
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: section_calibrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE section_calibrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: section_calibrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE section_calibrations_id_seq OWNED BY section_calibrations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    data text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE sessions_id_seq OWNED BY sessions.id;


--
-- Name: system_preferences; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE system_preferences (
    id integer NOT NULL,
    key character varying(255),
    value character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: system_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE system_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE system_preferences_id_seq OWNED BY system_preferences.id;


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE tags_id_seq OWNED BY event_tags.id;


--
-- Name: threat_configurations; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE threat_configurations (
    id integer NOT NULL,
    event_type_id integer NOT NULL,
    alert_name character varying(55) NOT NULL,
    counting_width double precision NOT NULL,
    decrement_value integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_id integer NOT NULL,
    updated_by_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT negative_decrement CHECK ((decrement_value < 0)),
    CONSTRAINT positive_counting_width CHECK ((counting_width > (0)::double precision))
);


--
-- Name: threat_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE threat_configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE threat_configurations_id_seq OWNED BY threat_configurations.id;


--
-- Name: threat_increments; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE threat_increments (
    id integer NOT NULL,
    threat_configuration_id integer NOT NULL,
    name character varying(10) NOT NULL,
    sequence integer NOT NULL,
    threshold integer NOT NULL,
    increment_value integer NOT NULL,
    CONSTRAINT nonnegative_increment CHECK ((increment_value >= 0)),
    CONSTRAINT positive_threshold CHECK ((threshold >= 0)),
    CONSTRAINT valid_name CHECK (((name)::text = ANY ((ARRAY['hold'::character varying, 'low'::character varying, 'medium'::character varying, 'top'::character varying])::text[])))
);


--
-- Name: threat_increments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE threat_increments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_increments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE threat_increments_id_seq OWNED BY threat_increments.id;


--
-- Name: threat_thresholds; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE threat_thresholds (
    id integer NOT NULL,
    threat_configuration_id integer NOT NULL,
    name character varying(10) NOT NULL,
    sequence integer NOT NULL,
    threshold integer NOT NULL,
    clearance integer NOT NULL,
    hysteresis integer NOT NULL,
    CONSTRAINT clearance_less_threshold CHECK ((clearance <= threshold)),
    CONSTRAINT nonnegative_hysteresis CHECK ((hysteresis >= 0)),
    CONSTRAINT positive_threshold CHECK ((threshold > 0)),
    CONSTRAINT valid_name CHECK (((name)::text = ANY ((ARRAY['green'::character varying, 'amber'::character varying, 'red'::character varying])::text[])))
);


--
-- Name: threat_thresholds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE threat_thresholds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: threat_thresholds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE threat_thresholds_id_seq OWNED BY threat_thresholds.id;


--
-- Name: time_series; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE time_series (
    id integer NOT NULL,
    fibre_line_id integer NOT NULL,
    event_id integer,
    "time" timestamp without time zone NOT NULL,
    "position" double precision NOT NULL,
    bin_size double precision NOT NULL,
    sample_rate integer NOT NULL,
    amplitudes double precision[] NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: time_series_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE time_series_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_series_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE time_series_id_seq OWNED BY time_series.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE users (
    id integer NOT NULL,
    user_id integer,
    loginname character varying(255),
    fullname character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: versions; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE versions (
    id integer NOT NULL,
    item_type character varying(255) NOT NULL,
    item_id integer NOT NULL,
    event character varying(255) NOT NULL,
    whodunnit character varying(255),
    object text,
    created_at timestamp without time zone
);


--
-- Name: versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE versions_id_seq OWNED BY versions.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_configurations ALTER COLUMN id SET DEFAULT nextval('alert_configurations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_details ALTER COLUMN id SET DEFAULT nextval('alert_details_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_maintainers ALTER COLUMN id SET DEFAULT nextval('alert_maintainers_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_responses ALTER COLUMN id SET DEFAULT nextval('alert_responses_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY alerts ALTER COLUMN id SET DEFAULT nextval('alerts_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY apps ALTER COLUMN id SET DEFAULT nextval('applications_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY calibrations ALTER COLUMN id SET DEFAULT nextval('calibrations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY channels ALTER COLUMN id SET DEFAULT nextval('channels_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY colour_maps ALTER COLUMN id SET DEFAULT nextval('colour_maps_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY configurations ALTER COLUMN id SET DEFAULT nextval('configurations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY controld_health_components ALTER COLUMN id SET DEFAULT nextval('controld_health_components_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY controld_health_properties ALTER COLUMN id SET DEFAULT nextval('controld_health_properties_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY db_files ALTER COLUMN id SET DEFAULT nextval('db_files_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY delayed_jobs ALTER COLUMN id SET DEFAULT nextval('delayed_jobs_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY display_types ALTER COLUMN id SET DEFAULT nextval('display_types_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents ALTER COLUMN id SET DEFAULT nextval('documents_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents_reference_points ALTER COLUMN id SET DEFAULT nextval('documents_reference_points_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_categories ALTER COLUMN id SET DEFAULT nextval('event_categories_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_tags ALTER COLUMN id SET DEFAULT nextval('tags_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_tracks ALTER COLUMN id SET DEFAULT nextval('event_tracks_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_types ALTER COLUMN id SET DEFAULT nextval('events_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY events ALTER COLUMN id SET DEFAULT nextval('event_logs_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_line_properties ALTER COLUMN id SET DEFAULT nextval('fibre_line_properties_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_line_properties_groups ALTER COLUMN id SET DEFAULT nextval('fibre_line_properties_groups_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_lines ALTER COLUMN id SET DEFAULT nextval('fibre_lines_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_redundancies ALTER COLUMN id SET DEFAULT nextval('fibre_redundancies_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_region_types ALTER COLUMN id SET DEFAULT nextval('fibre_region_types_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_regions ALTER COLUMN id SET DEFAULT nextval('fibre_regions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_shots ALTER COLUMN id SET DEFAULT nextval('fibre_shots_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY health_components ALTER COLUMN id SET DEFAULT nextval('health_components_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY helios_section_locations ALTER COLUMN id SET DEFAULT nextval('helios_section_locations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY helios_units ALTER COLUMN id SET DEFAULT nextval('helios_units_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification_email_lists ALTER COLUMN id SET DEFAULT nextval('notification_email_lists_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY organization_preferences ALTER COLUMN id SET DEFAULT nextval('organization_preferences_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY organizations ALTER COLUMN id SET DEFAULT nextval('organizations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY path_segments ALTER COLUMN id SET DEFAULT nextval('path_segments_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY paths ALTER COLUMN id SET DEFAULT nextval('paths_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY preferences ALTER COLUMN id SET DEFAULT nextval('preferences_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY prf_references ALTER COLUMN id SET DEFAULT nextval('prf_references_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY properties ALTER COLUMN id SET DEFAULT nextval('properties_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY property_group_types ALTER COLUMN id SET DEFAULT nextval('property_group_types_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY property_groups ALTER COLUMN id SET DEFAULT nextval('property_groups_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY reference_points ALTER COLUMN id SET DEFAULT nextval('reference_points_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY refresh ALTER COLUMN id SET DEFAULT nextval('refresh_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY region_properties ALTER COLUMN id SET DEFAULT nextval('region_properties_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY schedule_exceptions ALTER COLUMN id SET DEFAULT nextval('schedule_exceptions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY schedule_regions ALTER COLUMN id SET DEFAULT nextval('schedule_regions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY schedules ALTER COLUMN id SET DEFAULT nextval('schedules_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY section_calibrations ALTER COLUMN id SET DEFAULT nextval('section_calibrations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY sessions ALTER COLUMN id SET DEFAULT nextval('sessions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY system_preferences ALTER COLUMN id SET DEFAULT nextval('system_preferences_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_configurations ALTER COLUMN id SET DEFAULT nextval('threat_configurations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_increments ALTER COLUMN id SET DEFAULT nextval('threat_increments_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_thresholds ALTER COLUMN id SET DEFAULT nextval('threat_thresholds_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY time_series ALTER COLUMN id SET DEFAULT nextval('time_series_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY versions ALTER COLUMN id SET DEFAULT nextval('versions_id_seq'::regclass);


--
-- Name: alert_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY alert_configurations
    ADD CONSTRAINT alert_configurations_pkey PRIMARY KEY (id);


--
-- Name: alert_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY alert_details
    ADD CONSTRAINT alert_details_pkey PRIMARY KEY (id);


--
-- Name: alert_maintainers_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY alert_maintainers
    ADD CONSTRAINT alert_maintainers_pkey PRIMARY KEY (id);


--
-- Name: alert_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY alert_responses
    ADD CONSTRAINT alert_responses_pkey PRIMARY KEY (id);


--
-- Name: alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY apps
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: apps_event_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY apps_event_categories
    ADD CONSTRAINT apps_event_categories_pkey PRIMARY KEY (event_category_id, app_id);


--
-- Name: calibrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY calibrations
    ADD CONSTRAINT calibrations_pkey PRIMARY KEY (id);


--
-- Name: channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: colour_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY colour_maps
    ADD CONSTRAINT colour_maps_pkey PRIMARY KEY (id);


--
-- Name: configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY configurations
    ADD CONSTRAINT configurations_pkey PRIMARY KEY (id);


--
-- Name: configurations_property_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY configurations_property_groups
    ADD CONSTRAINT configurations_property_groups_pkey PRIMARY KEY (configuration_id, property_group_id);


--
-- Name: controld_health_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY controld_health_components
    ADD CONSTRAINT controld_health_components_pkey PRIMARY KEY (id);


--
-- Name: controld_health_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY controld_health_properties
    ADD CONSTRAINT controld_health_properties_pkey PRIMARY KEY (id);


--
-- Name: db_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY db_files
    ADD CONSTRAINT db_files_pkey PRIMARY KEY (id);


--
-- Name: delayed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY delayed_jobs
    ADD CONSTRAINT delayed_jobs_pkey PRIMARY KEY (id);


--
-- Name: display_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY display_types
    ADD CONSTRAINT display_types_pkey PRIMARY KEY (id);


--
-- Name: documents_fibre_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY documents_fibre_lines
    ADD CONSTRAINT documents_fibre_lines_pkey PRIMARY KEY (document_id, fibre_line_id);


--
-- Name: documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents_reference_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY documents_reference_points
    ADD CONSTRAINT documents_reference_points_pkey PRIMARY KEY (id);


--
-- Name: event_categories_fibre_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY event_categories_fibre_lines
    ADD CONSTRAINT event_categories_fibre_lines_pkey PRIMARY KEY (event_category_id, fibre_line_id);


--
-- Name: event_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY event_categories
    ADD CONSTRAINT event_categories_pkey PRIMARY KEY (id);


--
-- Name: event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY events
    ADD CONSTRAINT event_logs_pkey PRIMARY KEY (id);


--
-- Name: event_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY event_tracks
    ADD CONSTRAINT event_tracks_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY event_types
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: fibre_line_properties_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_line_properties_groups
    ADD CONSTRAINT fibre_line_properties_groups_pkey PRIMARY KEY (id);


--
-- Name: fibre_line_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_line_properties
    ADD CONSTRAINT fibre_line_properties_pkey PRIMARY KEY (id);


--
-- Name: fibre_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_lines
    ADD CONSTRAINT fibre_lines_pkey PRIMARY KEY (id);


--
-- Name: fibre_redundancies_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_redundancies
    ADD CONSTRAINT fibre_redundancies_pkey PRIMARY KEY (id);


--
-- Name: fibre_region_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_region_types
    ADD CONSTRAINT fibre_region_types_pkey PRIMARY KEY (id);


--
-- Name: fibre_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_regions
    ADD CONSTRAINT fibre_regions_pkey PRIMARY KEY (id);


--
-- Name: fibre_shots_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY fibre_shots
    ADD CONSTRAINT fibre_shots_pkey PRIMARY KEY (id);


--
-- Name: health_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY health_components
    ADD CONSTRAINT health_components_pkey PRIMARY KEY (id);


--
-- Name: helios_section_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY helios_section_locations
    ADD CONSTRAINT helios_section_locations_pkey PRIMARY KEY (id);


--
-- Name: helios_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY helios_units
    ADD CONSTRAINT helios_units_pkey PRIMARY KEY (id);


--
-- Name: notification_email_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY notification_email_lists
    ADD CONSTRAINT notification_email_lists_pkey PRIMARY KEY (id);


--
-- Name: organization_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY organization_preferences
    ADD CONSTRAINT organization_preferences_pkey PRIMARY KEY (id);


--
-- Name: organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY organizations_users
    ADD CONSTRAINT organizations_users_pkey PRIMARY KEY (organization_id, user_id);


--
-- Name: path_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY path_segments
    ADD CONSTRAINT path_segments_pkey PRIMARY KEY (id);


--
-- Name: paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY paths
    ADD CONSTRAINT paths_pkey PRIMARY KEY (id);


--
-- Name: preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (id);


--
-- Name: prf_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY prf_references
    ADD CONSTRAINT prf_references_pkey PRIMARY KEY (id);


--
-- Name: properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_group_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY property_group_types
    ADD CONSTRAINT property_group_types_pkey PRIMARY KEY (id);


--
-- Name: property_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY property_groups
    ADD CONSTRAINT property_groups_pkey PRIMARY KEY (id);


--
-- Name: reference_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY reference_points
    ADD CONSTRAINT reference_points_pkey PRIMARY KEY (id);


--
-- Name: refresh_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY refresh
    ADD CONSTRAINT refresh_pkey PRIMARY KEY (id);


--
-- Name: region_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY region_properties
    ADD CONSTRAINT region_properties_pkey PRIMARY KEY (id);


--
-- Name: roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY roles_users
    ADD CONSTRAINT roles_users_pkey PRIMARY KEY (role_id, user_id);


--
-- Name: schedule_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_pkey PRIMARY KEY (id);


--
-- Name: schedule_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY schedule_regions
    ADD CONSTRAINT schedule_regions_pkey PRIMARY KEY (id);


--
-- Name: schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: section_calibrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY section_calibrations
    ADD CONSTRAINT section_calibrations_pkey PRIMARY KEY (id);


--
-- Name: sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: system_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY system_preferences
    ADD CONSTRAINT system_preferences_pkey PRIMARY KEY (id);


--
-- Name: tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY event_tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: threat_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY threat_configurations
    ADD CONSTRAINT threat_configurations_pkey PRIMARY KEY (id);


--
-- Name: threat_increments_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY threat_increments
    ADD CONSTRAINT threat_increments_pkey PRIMARY KEY (id);


--
-- Name: threat_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY threat_thresholds
    ADD CONSTRAINT threat_thresholds_pkey PRIMARY KEY (id);


--
-- Name: time_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY time_series
    ADD CONSTRAINT time_series_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY versions
    ADD CONSTRAINT versions_pkey PRIMARY KEY (id);


--
-- Name: alerts_by_notif2pending_by_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX alerts_by_notif2pending_by_id ON alerts USING btree (id) WHERE (notification_pending2 = true);


--
-- Name: alerts_by_notifpending_by_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX alerts_by_notifpending_by_id ON alerts USING btree (id) WHERE (notification_pending = true);


--
-- Name: alerts_by_time_and_name_idx; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX alerts_by_time_and_name_idx ON alerts USING btree ("time", name);


--
-- Name: alerts_by_updated_and_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX alerts_by_updated_and_id ON alerts USING btree (updated_at, id);


--
-- Name: event_tags_by_event_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX event_tags_by_event_id ON event_tags USING btree (event_id);


--
-- Name: events_by_event_track_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX events_by_event_track_id ON events USING btree (event_track_id);


--
-- Name: events_by_time; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX events_by_time ON events USING btree ("time");


--
-- Name: fibre_line_properties_unique_group_id_and_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX fibre_line_properties_unique_group_id_and_key ON fibre_line_properties USING btree (fibre_line_properties_group_id, key);


--
-- Name: fibre_shots_by_event_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX fibre_shots_by_event_id ON fibre_shots USING btree (event_id);


--
-- Name: helios_units_unique_serial_number; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX helios_units_unique_serial_number ON helios_units USING btree (serial_number);


--
-- Name: index_alert_configurations_on_alert_type_and_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_alert_configurations_on_alert_type_and_key ON alert_configurations USING btree (alert_type, key);


--
-- Name: index_alert_details_on_alert_id_and_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_alert_details_on_alert_id_and_key ON alert_details USING btree (alert_id, key);


--
-- Name: index_alerts_on_time_resolved_and_threat_level; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_alerts_on_time_resolved_and_threat_level ON alerts USING btree (time_resolved, threat_level);


--
-- Name: index_event_tracks_on_uuid; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_event_tracks_on_uuid ON event_tracks USING btree (uuid);


--
-- Name: index_events_by_created_at; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_events_by_created_at ON events USING btree (created_at);


--
-- Name: index_events_on_alert_id_and_time_and_is_suppressed; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_events_on_alert_id_and_time_and_is_suppressed ON events USING btree (alert_id, "time", is_suppressed);


--
-- Name: index_fibre_shots_on_fibre_line_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_fibre_shots_on_fibre_line_id ON fibre_shots USING btree (fibre_line_id);


--
-- Name: index_on_fibre_line_lower_name; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_on_fibre_line_lower_name ON fibre_lines USING btree (lower((name)::text));


--
-- Name: index_on_fibre_regions_lower_description; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_on_fibre_regions_lower_description ON fibre_regions USING btree (lower((description)::text));


--
-- Name: index_on_helios_units_lower_name; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_on_helios_units_lower_name ON helios_units USING btree (lower((name)::text));


--
-- Name: index_on_organizations_lower_name; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_on_organizations_lower_name ON organizations USING btree (lower((name)::text));


--
-- Name: index_organization_preferences_on_organization_id_and_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_organization_preferences_on_organization_id_and_key ON organization_preferences USING btree (organization_id, key);


--
-- Name: index_roles_on_title; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_roles_on_title ON roles USING btree (title);


--
-- Name: index_sessions_on_session_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_sessions_on_session_id ON sessions USING btree (session_id);


--
-- Name: index_sessions_on_updated_at; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_sessions_on_updated_at ON sessions USING btree (updated_at);


--
-- Name: index_system_preferences_on_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_system_preferences_on_key ON system_preferences USING btree (key);


--
-- Name: index_threat_configurations_on_alert_name; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_threat_configurations_on_alert_name ON threat_configurations USING btree (alert_name);


--
-- Name: index_threat_increments_on_threat_configuration_id_and_sequence; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_threat_increments_on_threat_configuration_id_and_sequence ON threat_increments USING btree (threat_configuration_id, sequence);


--
-- Name: index_threat_thresholds_on_threat_configuration_id_and_sequence; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_threat_thresholds_on_threat_configuration_id_and_sequence ON threat_thresholds USING btree (threat_configuration_id, sequence);


--
-- Name: index_users_on_loginname; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX index_users_on_loginname ON users USING btree (loginname);


--
-- Name: index_versions_on_item_type_and_item_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX index_versions_on_item_type_and_item_id ON versions USING btree (item_type, item_id);


--
-- Name: properties_unique_group_id_and_key; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX properties_unique_group_id_and_key ON properties USING btree (property_group_id, key);


--
-- Name: responses_by_alert_and_response_idx; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX responses_by_alert_and_response_idx ON alert_responses USING btree (alert_id, response);


--
-- Name: schedules_idx; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX schedules_idx ON schedules USING btree (start_date, start_time, end_date, end_time, repeats_on, repeat_ends_on, alarm_types);


--
-- Name: section_calibrations_unique_fibre_line_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE UNIQUE INDEX section_calibrations_unique_fibre_line_id ON section_calibrations USING btree (fibre_line_id);


--
-- Name: time_series_by_event_id; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX time_series_by_event_id ON time_series USING btree (event_id);


--
-- Name: aec_apps_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY apps_event_categories
    ADD CONSTRAINT aec_apps_fk FOREIGN KEY (app_id) REFERENCES apps(id);


--
-- Name: aec_event_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY apps_event_categories
    ADD CONSTRAINT aec_event_categories_fk FOREIGN KEY (event_category_id) REFERENCES event_categories(id);


--
-- Name: calibrations_fibre_lines_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY calibrations
    ADD CONSTRAINT calibrations_fibre_lines_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: channel_helios_unit_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY channels
    ADD CONSTRAINT channel_helios_unit_id_fk FOREIGN KEY (helios_unit_id) REFERENCES helios_units(id);


--
-- Name: channels_fibre_lines_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_fibre_lines_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: configurations_fibre_line_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY configurations
    ADD CONSTRAINT configurations_fibre_line_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: configurations_helios_unit_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY configurations
    ADD CONSTRAINT configurations_helios_unit_fk FOREIGN KEY (helios_unit_id) REFERENCES helios_units(id);


--
-- Name: configurations_property_groups_configuration_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY configurations_property_groups
    ADD CONSTRAINT configurations_property_groups_configuration_fk FOREIGN KEY (configuration_id) REFERENCES configurations(id);


--
-- Name: configurations_property_groups_property_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY configurations_property_groups
    ADD CONSTRAINT configurations_property_groups_property_group_fk FOREIGN KEY (property_group_id) REFERENCES property_groups(id);


--
-- Name: ecfl_event_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_categories_fibre_lines
    ADD CONSTRAINT ecfl_event_categories_fk FOREIGN KEY (event_category_id) REFERENCES event_categories(id);


--
-- Name: ecfl_fibre_lines_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_categories_fibre_lines
    ADD CONSTRAINT ecfl_fibre_lines_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: event_types_event_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_types
    ADD CONSTRAINT event_types_event_categories_fk FOREIGN KEY (event_category_id) REFERENCES event_categories(id);


--
-- Name: events_event_tracks_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_event_tracks_fk FOREIGN KEY (event_track_id) REFERENCES event_tracks(id);


--
-- Name: events_event_types_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_event_types_fk FOREIGN KEY (event_type_id) REFERENCES event_types(id);


--
-- Name: events_fibre_lines_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_fibre_lines_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fibre_lines_display_types_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_lines
    ADD CONSTRAINT fibre_lines_display_types_fk FOREIGN KEY (display_type_id) REFERENCES display_types(id);


--
-- Name: fibre_regions_fibre_lines_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_regions
    ADD CONSTRAINT fibre_regions_fibre_lines_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fibre_regions_property_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_regions
    ADD CONSTRAINT fibre_regions_property_group_fk FOREIGN KEY (property_group_id) REFERENCES property_groups(id);


--
-- Name: fibre_regions_region_types_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_regions
    ADD CONSTRAINT fibre_regions_region_types_fk FOREIGN KEY (fibre_region_type_id) REFERENCES fibre_region_types(id);


--
-- Name: fibre_shot_fibre_line_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_shots
    ADD CONSTRAINT fibre_shot_fibre_line_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fibre_shots_events_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_shots
    ADD CONSTRAINT fibre_shots_events_fk FOREIGN KEY (event_id) REFERENCES events(id);


--
-- Name: fk_alert_details_alert_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_details
    ADD CONSTRAINT fk_alert_details_alert_id FOREIGN KEY (alert_id) REFERENCES alerts(id);


--
-- Name: fk_alert_responses_alert_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_responses
    ADD CONSTRAINT fk_alert_responses_alert_id FOREIGN KEY (alert_id) REFERENCES alerts(id);


--
-- Name: fk_alert_responses_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY alert_responses
    ADD CONSTRAINT fk_alert_responses_user_id FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: fk_alerts_alert_maintainer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY alerts
    ADD CONSTRAINT fk_alerts_alert_maintainer_id FOREIGN KEY (alert_maintainer_id) REFERENCES alert_maintainers(id);


--
-- Name: fk_alerts_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY alerts
    ADD CONSTRAINT fk_alerts_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_colour_maps_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY colour_maps
    ADD CONSTRAINT fk_colour_maps_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_controld_health_properties_controld_health_component_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY controld_health_properties
    ADD CONSTRAINT fk_controld_health_properties_controld_health_component_id FOREIGN KEY (controld_health_component_id) REFERENCES controld_health_components(id);


--
-- Name: fk_documents_fibre_lines_document_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents_fibre_lines
    ADD CONSTRAINT fk_documents_fibre_lines_document_id FOREIGN KEY (document_id) REFERENCES documents(id);


--
-- Name: fk_documents_fibre_lines_fibre_line_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents_fibre_lines
    ADD CONSTRAINT fk_documents_fibre_lines_fibre_line_id FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fk_documents_reference_points_document_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents_reference_points
    ADD CONSTRAINT fk_documents_reference_points_document_id FOREIGN KEY (document_id) REFERENCES documents(id);


--
-- Name: fk_documents_reference_points_reference_point_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents_reference_points
    ADD CONSTRAINT fk_documents_reference_points_reference_point_id FOREIGN KEY (reference_point_id) REFERENCES reference_points(id);


--
-- Name: fk_event_tracks_alert_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_tracks
    ADD CONSTRAINT fk_event_tracks_alert_id FOREIGN KEY (alert_id) REFERENCES alerts(id);


--
-- Name: fk_event_tracks_event_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_tracks
    ADD CONSTRAINT fk_event_tracks_event_type_id FOREIGN KEY (event_type_id) REFERENCES event_types(id);


--
-- Name: fk_events_alert_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT fk_events_alert_id FOREIGN KEY (alert_id) REFERENCES alerts(id);


--
-- Name: fk_fibre_line_properties_fibre_line_properties_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_line_properties
    ADD CONSTRAINT fk_fibre_line_properties_fibre_line_properties_group_id FOREIGN KEY (fibre_line_properties_group_id) REFERENCES fibre_line_properties_groups(id);


--
-- Name: fk_fibre_line_properties_groups_fibre_line_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_line_properties_groups
    ADD CONSTRAINT fk_fibre_line_properties_groups_fibre_line_id FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fk_fibre_lines_helios_unit_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_lines
    ADD CONSTRAINT fk_fibre_lines_helios_unit_id FOREIGN KEY (helios_unit_id) REFERENCES helios_units(id);


--
-- Name: fk_fibre_lines_owner_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fibre_lines
    ADD CONSTRAINT fk_fibre_lines_owner_id FOREIGN KEY (owner_id) REFERENCES organizations(id);


--
-- Name: fk_notification_email_lists_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification_email_lists
    ADD CONSTRAINT fk_notification_email_lists_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_organization_preferences_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY organization_preferences
    ADD CONSTRAINT fk_organization_preferences_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_organizations_users_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY organizations_users
    ADD CONSTRAINT fk_organizations_users_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_organizations_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY organizations_users
    ADD CONSTRAINT fk_organizations_users_user_id FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: fk_path_segments_fibre_line_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY path_segments
    ADD CONSTRAINT fk_path_segments_fibre_line_id FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fk_path_segments_path_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY path_segments
    ADD CONSTRAINT fk_path_segments_path_id FOREIGN KEY (path_id) REFERENCES paths(id);


--
-- Name: fk_paths_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY paths
    ADD CONSTRAINT fk_paths_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_reference_points_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY reference_points
    ADD CONSTRAINT fk_reference_points_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id);


--
-- Name: fk_region_properties_fibre_region_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY region_properties
    ADD CONSTRAINT fk_region_properties_fibre_region_id FOREIGN KEY (fibre_region_id) REFERENCES fibre_regions(id);


--
-- Name: fk_roles_users_role_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY roles_users
    ADD CONSTRAINT fk_roles_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id);


--
-- Name: fk_roles_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY roles_users
    ADD CONSTRAINT fk_roles_users_user_id FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: fk_section_calibrations_document_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY section_calibrations
    ADD CONSTRAINT fk_section_calibrations_document_id FOREIGN KEY (document_id) REFERENCES documents(id);


--
-- Name: fk_section_calibrations_fibre_line_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY section_calibrations
    ADD CONSTRAINT fk_section_calibrations_fibre_line_id FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- Name: fk_threat_configurations_created_by_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_configurations
    ADD CONSTRAINT fk_threat_configurations_created_by_id FOREIGN KEY (created_by_id) REFERENCES users(id);


--
-- Name: fk_threat_configurations_event_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_configurations
    ADD CONSTRAINT fk_threat_configurations_event_type_id FOREIGN KEY (event_type_id) REFERENCES event_types(id);


--
-- Name: fk_threat_configurations_updated_by_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_configurations
    ADD CONSTRAINT fk_threat_configurations_updated_by_id FOREIGN KEY (updated_by_id) REFERENCES users(id);


--
-- Name: fk_threat_increments_threat_configuration_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_increments
    ADD CONSTRAINT fk_threat_increments_threat_configuration_id FOREIGN KEY (threat_configuration_id) REFERENCES threat_configurations(id);


--
-- Name: fk_threat_thresholds_threat_configuration_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY threat_thresholds
    ADD CONSTRAINT fk_threat_thresholds_threat_configuration_id FOREIGN KEY (threat_configuration_id) REFERENCES threat_configurations(id);


--
-- Name: preferences_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY preferences
    ADD CONSTRAINT preferences_users_fk FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: properties_property_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY properties
    ADD CONSTRAINT properties_property_group_fk FOREIGN KEY (property_group_id) REFERENCES property_groups(id);


--
-- Name: property_groups_property_group_type_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY property_groups
    ADD CONSTRAINT property_groups_property_group_type_fk FOREIGN KEY (property_group_type_id) REFERENCES property_group_types(id);


--
-- Name: schedule_regions_schedule_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY schedule_regions
    ADD CONSTRAINT schedule_regions_schedule_fk FOREIGN KEY (schedule_id) REFERENCES schedules(id);


--
-- Name: tags_event_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_tags
    ADD CONSTRAINT tags_event_fk FOREIGN KEY (event_id) REFERENCES events(id);


--
-- Name: time_series_event_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY time_series
    ADD CONSTRAINT time_series_event_fk FOREIGN KEY (event_id) REFERENCES events(id);


--
-- Name: time_series_fibre_line_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY time_series
    ADD CONSTRAINT time_series_fibre_line_fk FOREIGN KEY (fibre_line_id) REFERENCES fibre_lines(id);


--
-- PostgreSQL database dump complete
--
