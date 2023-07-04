INSTRUCTIONS
============

Bear in mind, that these stored procedures go into the database.

So, when updating them, they need to be migrated in the database, and we keep the older ones so that we can rollback the database, should the need arise.

So, to make a change:
* Make a copy of the latest process_event.NN.sql, and call it process_event.MM.sql, where MM is one more than NN.
* Make your change to the process_event.MM.sql.
* Add a migration that will use process_event.MM.sql while migrating up and process_event.NN.sql while migrating down.

Follow the same process for fotech_config_changes_notifier.NN.sql

**Note: This scheme has recently changed. See #21941.**