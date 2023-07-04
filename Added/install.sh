#!/bin/sh
# Script to install panoptes-rails and other modules that it needs, from the codebase to $FOTECH_INSTALL_DIR/web/current/.
#
# This is to be used by developers and is similar to what ./deploybuild.sh (and top-level Makefile) gives you.
set -e

FOTECH_INSTALL_DIR=/opt/Fotech/panoptes
VERSION=`cat ../../REVISION`

export DEPLOY=$FOTECH_INSTALL_DIR/web/current/
export ENVIRONMENT=production
export PANOP_VERSION=$VERSION

rm -rf $DEPLOY/panoptes-rails

make

# This places more files into the panoptes-rails dir.
(cd ../common_util; make)
(cd ../common_gui; make)
(cd ../fibre; make)
(cd ../mapping; make)

chown -R apache:apache $DEPLOY/panoptes-rails/

echo "Now you should restart httpd."
