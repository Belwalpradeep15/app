#!/usr/bin/bash

FOTECH_INSTALL_DIR=/opt/Fotech/panoptes
DEPLOYMENT="current"
LPATH=`pwd`
#"/home/fotech/sources/system/systems/panoptes"
SERVER=$1

echo "Clearing Javascripts and stylesheets"
#ssh root@${SERVER} rm -rf $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/*.js

echo "Syncing Ruby Components to ${SERVER} -> ${DEPLOYMENT}"
rsync -avz "${LPATH}/app/views/" root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/app/views/
rsync -avz "${LPATH}/app/controllers/" root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/app/controllers/
#rsync -avz "${LPATH}/app/models/" root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/app/models/
#rsync -avz "${LPATH}/Gemfile" root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/

echo "Syncing Javascript Components to ${SERVER} -> ${DEPLOYMENT}"
#rsync -avzL public/javascripts/ root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/

echo "Syncing asset pipeline"
ASSETS=`find public/javascripts public/stylesheets`

for ASSET in ${ASSETS}
do
	FILE=`echo ${ASSET} | cut -d'/' -f3-`
	echo -e "\tProcessing asset \e[34m${FILE}\e[0m"
	EXT="${FILE##*.}"
    NAME="${FILE%.*}"
	if [ "${FILE}" = "application.js" ]; then
		echo -e "\t\t\e[33mApplication.JS\e[0m causes problems"
		continue
	fi

	if [ -n "${EXT}" ] && ( [ "${EXT}" = "js" ] || [ "${EXT}" = "css" ] || [ "${EXT}" = "map" ] ); then
		echo -e "\t\tAsset decoded \e[93m${NAME}\e[0m\e[34m.\e[0m\e[93m${EXT}\e[0m"
		RAWDEPLOYDIR="$FOTECH_INSTALL_DIR/web/current/panoptes-rails/"
		DEPLOYDIR="$FOTECH_INSTALL_DIR/web/current/panoptes-rails/public/assets/"
	    echo -e "\t\tAsset discovery \"\e[34mssh root@${SERVER} ls ${DEPLOYDIR}${NAME}*${EXT}\e[0m\""
	    FILENAME=`ssh root@${SERVER} ls "${DEPLOYDIR}${NAME}-*${EXT}" 2>/dev/null`
	    if [ -n "${FILENAME}" ]; then
		    echo -e "\t\tSyncing asset \e[34m${FILENAME}\e[0m"
	        echo -e "\t\tAsset source: \e[34m${ASSET}\e[0m"
			scp "${ASSET}" "root@${SERVER}:${FILENAME}"
	        echo -e "\t\tRaw Asset source: \e[34m${RAWDEPLOYDIR}${ASSET}\e[0m"
			scp "${ASSET}" "root@${SERVER}:${RAWDEPLOYDIR}${ASSET}"
		fi
	fi
done

echo "Syncing Mapping System"
#ssh root@${SERVER} mkdir -p $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/mapping/
#rsync -avz ${LPATH}/modules/mapping/public/javascripts/pub root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/mapping/
#rsync -avz ${LPATH}/modules/mapping/public/javascripts/*.js root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/mapping/
#rsync -avz ${LPATH}/modules/mapping/lib/* root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/vendor/plugins/fotech_mapping/lib/

echo "Syncing Common Utils"
#ssh root@${SERVER} mkdir -p $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/common_util/
#rsync -avz ${LPATH}/modules/common_util/public/javascripts/* root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/common_util/
#
echo "Syncing Common UI"
#ssh root@${SERVER} mkdir -p $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/common_gui/
#rsync -avz ${LPATH}/modules/common_gui/public/javascripts/* root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/common_gui/


echo "Syncing Fibre"
#ssh root@${SERVER} mkdir -p $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/fibre/
#rsync -avz ${LPATH}/modules/fibre/public/javascripts/*.js root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/fotech/fibre/

echo "Copying routing information to ${SERVER} -> ${DEPLOYMENT}"
#rsync "${LPATH}/modules/panoptes-rails/config/routes.rb" root@${SERVER}:$FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/config/

echo "resetting permissions"
#ssh root@${SERVER} chmod o+w $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/javascripts/
#ssh root@${SERVER} chmod o+w $FOTECH_INSTALL_DIR/web/${DEPLOYMENT}/panoptes-rails/public/stylesheets/

if [ $2 ] && [ $2 == "restart"  ]; then
	echo "Restarting Panoptes HTTP Server"
	ssh root@${SERVER} service httpd restart
fi

if [ $2 ] && [ $2 == "reload"  ]; then
	echo "Restarting HTTP Server"
	ssh root@${SERVER} service httpd reload
fi

