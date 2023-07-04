class DropBoreholeDisplayType < ActiveRecord::Migration[5.2]
    def up
        execute <<-sql
update fibre_lines
set display_type_id = (select id from display_types where name = 'map')
where display_type_id = (select id from display_types where name = 'borehole');

delete from display_types where name = 'borehole';
        sql
    end

    def down
        execute <<-sql
insert into display_types(name, description, created_at, updated_at) values ('borehole', 'Borehole display - possibly deviated', '2019-02-27 15:14:58.507873', null);
        sql

        # Ignoring fibre_file reverse update - We don't keep track of fibre_lines that were 'borehole' before the up ran.
    end
end
