-- AIRAVAT | Migration 0003: schedule the simulated market tick every minute (pg_cron)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
select cron.schedule('airavat-sim-tick', '* * * * *', $$select public.sim_tick()$$);
