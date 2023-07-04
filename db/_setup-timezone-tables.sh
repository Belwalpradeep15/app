#!/bin/bash
set -e
#
# Script that sets up the timezones in the database.
#
# Updating timezone tables sql file
#
# To update the timezone tables you will need to:
# 1) download the tz_world.zip file from http://efele.net/maps/tz/world/
# 2) unzip it and find the tz_world.shp file
# 3) use the following command (this will have to be done on a machine where postgis is installed)
#    shp2pgsql -D tz_world.shp > tz_world_<newdatehere>.sql
# 4) Update the filename in this script accordingly.
# 5) Run this script so that it updates the database.

dbname='fotechdev_production'

echo "Using dbname=$dbname"

echo "Checking for timezone file..."
tz_filename=tz_world_20160528.sql
tar xvzf $tz_filename.tar.gz -C /tmp
tz_filepath=/tmp/$tz_filename

do_update=1

echo "Checking for db timezone tz_world table..."
if psql --dbname $dbname --username "fotech" -qc "\\dt tz_world" | grep tz_world; then
    echo "Checking for db timezone version..."
    if psql --dbname $dbname --username "fotech" -tc "select value from system_preferences where key = 'tz_world_version'" | grep $tz_filename; then
        do_update=0
    fi
fi

if [ $do_update -eq 1 ]; then
   echo "Updating, this may take a while..."
   psql --dbname $dbname --username "fotech" -qc "DROP TABLE IF EXISTS tz_world"
   psql --dbname $dbname --username "fotech" -qf $tz_filepath 2> /dev/null
   psql --dbname $dbname --username "fotech" -c "CREATE INDEX tz_world_geom_index ON tz_world USING GIST ( the_geom );"
   psql --dbname $dbname --username "fotech" -c "delete from system_preferences where key = 'tz_world_version'"
   psql --dbname $dbname --username "fotech" -c "insert into system_preferences(created_at,key,value) VALUES (now(),'tz_world_version','$tz_filename')"
fi

