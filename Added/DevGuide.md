# Notes for developers

## We are now using Rails 5.2.2.

The big upgrade from Rails 2.3.2 was done.

* Rails is available through gems. There is no longer a panoptes-rails/vendor directory with rails stuff in it.
* In the installer, gems are now handled using bundler using a Gemfile.
* The panoptes-rails app itself has another Gemfile, so bundler has to be run if you are adding new gems there.
  * The app only loads gems in that Gemfile.
  * So, in a sense, the installer/Gemfile is more for other modules, such as the watchdogd. There might be some duplication.

## Development

There are 3 ways of running the app:
* You can run the server using 'bin/rails s' in development mode. Port 3000 gets used by default.
* You can also run it it production mode.
* You can also run it under apacge/httpd using phusion passenger. This is how the app runs on a production panoptes unit.

There are some handy shell scripts that make the first 2 cases.

You can run the console using 'bin/rails c' in devlopment or production mode, similarly, in development or production.

Also...
* To reduce confusion, only one database is supported, the 'fotechdev_production' production database.
* Tests have not been ported to new rails.
* We do not use "turbolinks", so that has been disabled.
* We use symbolic links to refer to other areas outside of this module. This is useful for development mode and builds.

## For the record
* The new rails modules/web app was created using 'rails new' in the modules directory, using this command:
  /usr/local/Fotech/vendor/bin/rails new web -d postgresql --skip-yarn --skip-coffee --skip-sprockets
* Prototyping was done.
* The contents of the old modules/panoptes-rails app was replaced by the contents of the new modules/web app (which was then deleted).
* The old test directory was also kept intact, as some effort needs to be put in to reinstate our tests.
  * The new tests.rails522 directory was the one created for the new rails app.
* The --skip-sprockets part was a late addition to disable asset pipelining.
** This then broke some unobtrusive-javascript functionality that required rails-ujs.js in the frontend.
** This was done using npm install rails-ujs; this is in the node_modules directory.
*** A link from public/javascripts for development mode to work and a Makefile change for deployment purposes was done.

