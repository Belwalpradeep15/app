-- This script contains DB items that we wish to run every time the software has been
-- upgraded (not every time the system is restarted).


-- Remove everything from our queuing tables. These are the tables used essentially
-- for inter-process communications rather than for maintaining the current state
-- of the world. These consist of the following tables:
--
-- controld_health_components/controld_health_properties - used for comms from controld to watchdog
-- delayed_jobs - used for comms providing hooks into the ruby code
-- health_components - used for comms from the watchdog to the rest of the system

DELETE FROM controld_health_properties;
DELETE FROM controld_health_components;
DELETE FROM delayed_jobs;
DELETE FROM health_components;


-- Remove all current browser sessions. In theory each browser should refresh after
-- a software upgrade, so no sessions should remain.
DELETE FROM sessions;
