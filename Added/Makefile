# FILENAME:     Makefile
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-04-04
# 
# DESCRIPTION:  
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2011 Fotech Solutions Ltd. All rights reserved.

#TODO: I don't think we need this special handling, now that panoptes-rails has links directly into this.
ifndef ENVIRONMENT
	ENVIRONMENT=development
endif

UI=../../../common/apps/ui/

TARGET_DIRS = \
	log \
	tmp

TARGET_LINKS = \
	$(DEPLOY)/panoptes-rails

TARGET_CONFIGS = \
	config/application_config.yml


.PHONY: build
build: update_version_tag $(TARGET_DIRS) $(TARGET_CONFIGS) tmp/migrate $(TARGET_LINKS) 
	@touch tmp/restart.txt

.PHONY: clean
clean:
	-rm -rf $(TARGET_DIRS) $(TARGET_LINKS) $(TARGET_CONFIGS) tmp/migrate *~ public/applets

.PHONY: test
test:
	rake test

$(TARGET_DIRS):
	mkdir -p $@
    
$(DEPLOY)/panoptes-rails:
ifeq ($(ENVIRONMENT),development)
#	ln -s $(PWD) $@
else
	cp -R $(PWD) $@
	rm -f $@/log/*
	rm -rf $@/tmp/*
	rm -f $@/public/images/marker_type_icons
	rm -rf $@/public/fontawesome-free-5.0.6/advanced-options
	rm -rf $@/public/fontawesome-free-5.0.6/use-on-desktop
	# Remove all development mode links.
	find $@/app -type l -delete
	find $@/public -type l -delete
	cp $@/node_modules/rails-ujs/lib/assets/compiled/rails-ujs.js $@/public/javascripts/
	cp $(UI)/build/*.js $(UI)/build/*.js.map $@/public/javascripts/
	cp $(UI)/build/*.css $(UI)/build/*.css.map $@/public/stylesheets/
	mkdir -p $@/public/admin/assets/
	cp -r $(UI)/build/assets/* $@/public/admin/assets/
	mkdir -p $@/public/assets/
	cp -r $(UI)/build/assets/* $@/public/assets/
endif

config/application_config.yml: config/application_config_src.yml version.tag
ifeq ($(ENVIRONMENT),development)
#	sed -e "s/--VERSION--/$(PANOP_VERSION)/" \
#        -e "s/--AUTH_PROVIDER--/anonymous/" \
#		< config/application_config_src.yml > $@
else
	sed -e "s/--VERSION--/$(PANOP_VERSION)/" \
		-e "s/--AUTH_PROVIDER--/apache/" \
		-e 's/authentication: .*/authentication: Digest realm="Fotech Panoptes", domain="\/", algorithm="MD5", qop="auth"/' \
		-e "/portal:/{ N; s/portal: *\n *enabled: .*/simulator:NEWLINE    enabled: false/; }" \
		< config/application_config_src.yml \
		| awk '{ gsub(/NEWLINE/, "\n"); print $0; }' \
		> $@
endif

.PHONY: update_version_tag
update_version_tag:
	@./updateversiontag.sh $(PANOP_VERSION)
	
tmp/migrate: $(wildcard db/migrate/*)
ifeq ($(ENVIRONMENT),development)
#	rake db:migrate
endif
	touch tmp/migrate

