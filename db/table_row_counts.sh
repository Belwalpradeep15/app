
PGCOMMAND=" psql -d fotechdev_production -At -c \"
            SELECT   table_name
            FROM     information_schema.tables
            WHERE    table_type='BASE TABLE'
            AND      table_schema='public'
            \""
TABLENAMES=$(eval "$PGCOMMAND")

for TABLENAME in $TABLENAMES; do
    PGCOMMAND=" psql -d fotechdev_production -At -c \"
                SELECT   '$TABLENAME',
                         count(*) 
                FROM     $TABLENAME
		HAVING count(*) > 0
                \""
    eval "$PGCOMMAND"
done

