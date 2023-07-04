In order to clear up our stale stash of migrations, the following was done:

* Database was reset. Then migrated to 20160908170546_create_notification_email_lists.rb. This is the version just before the first v14 release.
* A structure dump was then taken. This was saved to production_structure.20160908170546.sql.
* This was then modified to remove any postgis related bits. This was saved to production_structure.20160908170546.modified.sql.
* A data dump using pgadmin3 was also taken. This was saved to fotechdev_production.backup.

The above was done before upgrading rails.

Then the following was done on a new app, with new version of rails:
* All migrations 20160908170546_create_notification_email_lists.rb and before were deleted.
* Two new migrations for the structure and data were created.
** 20160908170545_recreate_structure.rb
*** This simply creates the new structure through production_structure.20160908170546.modified.sql.
** 20160908170546_recreate_data.rb
*** This simply inserts the initial data.
*** It was built from the INSERT and setval (for SEQUENCES) statements in fotechdev_production.backup.
* An empty schema.rb with version 20160908170544 was created.

Note that the version of create_notification_email_lists matches with recreate_data.
And the schema version is a second before version of recreate_structure, which is a second before recreate_data.

This is how we effectively squash ~200 migrations into a structure and data migrations. Remaining migrations (which need to work with new rails) can then be applied on top of that.

Note that seeds.rb is/was not used.

Note the table_row_counts.sh script was added to count the rows of all the tables to ensure the databases are simimlar.
The original_table_row_counts.txt are the counts on old rails till the 20160908170546_create_notification_email_lists.rb migration.
The new_table_row_counts.txt are the counts on new rails till the 20160908170546_recreate_data.rb migration.


See #21881 for more.
