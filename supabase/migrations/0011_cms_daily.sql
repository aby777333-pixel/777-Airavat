-- AIRAVAT | Migration 0011: AIRAVAT DAILY — editorial CMS with workflow, revisions, compliance review,
-- scheduled publishing (pg_cron), newsletter opt-in, daily briefing. Strictly additive.

create type article_status as enum ('draft','in_review','compliance_review','approved','scheduled','published','archived');
create type article_classification as enum ('education','market_commentary','news_summary','research','tutorial','company_update');

create table article_categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0
);
insert into article_categories(slug,name,description,position) values
 ('market-brief','Market Brief','Morning and closing session summaries from the sandbox engine',1),
 ('equity-insights','Equity Insights','Company and sector education',2),
 ('derivatives','Derivatives Explained','Options, futures and risk',3),
 ('commodities','Commodities','MCX markets and physical delivery',4),
 ('fixed-income','Fixed Income','Bonds, G-Secs and yields',5),
 ('financial-literacy','Financial Literacy','Beginner guides',6),
 ('risk-management','Risk Management','Position sizing, stops and discipline',7),
 ('platform','Platform Tutorials','How AIRAVAT works',8),
 ('investing-history','Investing History','Market history and lessons',9),
 ('investor-protection','Investor Protection','Rights, grievances and safety',10);

create table articles (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  dek text,
  body_md text not null default '',
  category_id int references article_categories(id),
  author_id uuid references profiles(id),
  classification article_classification not null default 'education',
  status article_status not null default 'draft',
  language text not null default 'en',
  scheduled_for timestamptz,
  published_at timestamptz,
  reviewed_by uuid,
  compliance_reviewed_by uuid,
  seo_title text,
  seo_description text,
  cover_url text,
  reading_minutes int,
  sources jsonb not null default '[]',
  tags text[] not null default '{}',
  ai_assisted boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on articles(status, published_at desc);
create index on articles(category_id);
create table article_revisions (
  id bigserial primary key,
  article_id bigint not null references articles(id) on delete cascade,
  version int not null,
  title text not null,
  body_md text not null,
  changed_by uuid,
  change_note text,
  created_at timestamptz not null default now()
);
create table article_transitions (
  id bigserial primary key,
  article_id bigint not null references articles(id) on delete cascade,
  from_status article_status,
  to_status article_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create table newsletter_subscriptions (
  email text primary key,
  status text not null default 'pending',   -- pending | confirmed | unsubscribed
  token text not null default encode(gen_random_bytes(16),'hex'),
  topics text[] not null default '{daily}',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

create or replace function is_editorial() returns boolean
language sql stable set search_path = public as $$ select current_app_role() in ('editor','compliance','admin','super_admin') $$;

create or replace function slugify(p text) returns text
language sql immutable as $$ select trim(both '-' from regexp_replace(lower(p), '[^a-z0-9]+', '-', 'g')) $$;

create or replace function save_article(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; a articles; v_ver int;
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  if nullif(p->>'id','') is not null then
    select * into a from articles where id = (p->>'id')::bigint;
    if a.id is null then raise exception 'NOT_FOUND'; end if;
    if a.status in ('published','archived') and current_app_role() not in ('editor','admin','super_admin') then raise exception 'PUBLISHED_ARTICLES_EDITABLE_BY_EDITORS_ONLY'; end if;
    select coalesce(max(version),0) + 1 into v_ver from article_revisions where article_id = a.id;
    insert into article_revisions(article_id, version, title, body_md, changed_by, change_note) values (a.id, v_ver, a.title, a.body_md, auth.uid(), p->>'change_note');
    update articles set title = coalesce(p->>'title', title), dek = coalesce(p->>'dek', dek), body_md = coalesce(p->>'body_md', body_md),
      category_id = coalesce((p->>'category_id')::int, category_id), classification = coalesce((p->>'classification')::article_classification, classification),
      seo_title = coalesce(p->>'seo_title', seo_title), seo_description = coalesce(p->>'seo_description', seo_description), cover_url = coalesce(p->>'cover_url', cover_url),
      sources = coalesce(p->'sources', sources), tags = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'tags') x), tags),
      ai_assisted = coalesce((p->>'ai_assisted')::boolean, ai_assisted), reading_minutes = greatest(1, ceil(length(coalesce(p->>'body_md', body_md)) / 1100.0))::int,
      status = case when status in ('approved','scheduled') then 'draft' else status end, updated_at = now()
    where id = a.id;
    v_id := a.id;
  else
    insert into articles(slug, title, dek, body_md, category_id, author_id, classification, seo_title, seo_description, cover_url, sources, tags, ai_assisted, reading_minutes, created_by)
    values (slugify(p->>'title') || '-' || substr(md5(random()::text),1,5), p->>'title', p->>'dek', coalesce(p->>'body_md',''), (p->>'category_id')::int, auth.uid(),
            coalesce((p->>'classification')::article_classification,'education'), p->>'seo_title', p->>'seo_description', p->>'cover_url', coalesce(p->'sources','[]'::jsonb),
            coalesce((select array_agg(x) from jsonb_array_elements_text(p->'tags') x), '{}'), coalesce((p->>'ai_assisted')::boolean,false), greatest(1, ceil(length(coalesce(p->>'body_md',''))/1100.0))::int, auth.uid())
    returning id into v_id;
    insert into article_transitions(article_id, from_status, to_status, actor_id, note) values (v_id, null, 'draft', auth.uid(), 'created');
  end if;
  perform audit('cms.article.saved','article',v_id::text,null,jsonb_build_object('title',p->>'title'));
  return v_id;
end $$;

-- Workflow: draft -> in_review -> (compliance_review for market_commentary/research/news_summary) -> approved -> scheduled/published -> archived
create or replace function article_transition(p_id bigint, p_to article_status, p_note text default null, p_scheduled_for timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare a articles; v_role app_role := current_app_role(); v_needs_compliance boolean;
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  select * into a from articles where id = p_id for update;
  if a.id is null then raise exception 'NOT_FOUND'; end if;
  v_needs_compliance := a.classification in ('market_commentary','research','news_summary');
  if p_to = 'in_review' then
    if a.status not in ('draft') then raise exception 'INVALID_TRANSITION'; end if;
  elsif p_to = 'compliance_review' then
    if a.status <> 'in_review' or v_role not in ('editor','admin','super_admin') then raise exception 'INVALID_TRANSITION'; end if;
  elsif p_to = 'approved' then
    if v_needs_compliance then
      if a.status <> 'compliance_review' or v_role not in ('compliance','super_admin') then raise exception 'COMPLIANCE_APPROVAL_REQUIRED'; end if;
      update articles set compliance_reviewed_by = auth.uid() where id = p_id;
    else
      if a.status not in ('in_review','compliance_review') or v_role not in ('editor','compliance','admin','super_admin') then raise exception 'INVALID_TRANSITION'; end if;
    end if;
    if a.author_id = auth.uid() and v_role <> 'super_admin' then raise exception 'MAKER_CHECKER_VIOLATION: author cannot approve own article'; end if;
    update articles set reviewed_by = auth.uid() where id = p_id;
  elsif p_to = 'scheduled' then
    if a.status <> 'approved' or p_scheduled_for is null then raise exception 'MUST_BE_APPROVED_WITH_SCHEDULE'; end if;
    update articles set scheduled_for = p_scheduled_for where id = p_id;
  elsif p_to = 'published' then
    if a.status not in ('approved','scheduled') or v_role not in ('editor','admin','super_admin') then raise exception 'MUST_BE_APPROVED'; end if;
    update articles set published_at = coalesce(published_at, now()) where id = p_id;
  elsif p_to = 'archived' then
    if v_role not in ('editor','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  elsif p_to = 'draft' then
    if a.status = 'published' then raise exception 'USE_ARCHIVE_FOR_PUBLISHED'; end if;
  else raise exception 'INVALID_TRANSITION'; end if;
  update articles set status = p_to, updated_at = now() where id = p_id;
  insert into article_transitions(article_id, from_status, to_status, actor_id, note) values (p_id, a.status, p_to, auth.uid(), p_note);
  perform audit('cms.article.'||p_to::text,'article',p_id::text,jsonb_build_object('status',a.status),jsonb_build_object('status',p_to,'note',p_note));
end $$;

create or replace function publish_scheduled_articles() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with u as (
    update articles set status='published', published_at = coalesce(published_at, now()), updated_at = now()
    where status='scheduled' and scheduled_for <= now() and reviewed_by is not null returning id
  ) insert into article_transitions(article_id, from_status, to_status, actor_id, note) select id, 'scheduled', 'published', null, 'scheduler' from u;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function publish_scheduled_articles() from public, anon, authenticated;

create or replace function subscribe_newsletter(p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  insert into newsletter_subscriptions(email) values (v_email) on conflict (email) do update set status = case when newsletter_subscriptions.status='unsubscribed' then 'pending' else newsletter_subscriptions.status end;
  return jsonb_build_object('status', 'pending', 'note', 'Double opt-in email delivery is not connected yet (no provider). Subscription recorded as pending.');
end $$;

-- Daily briefing (computed, source-stamped)
create or replace function daily_briefing() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'generated_at', now(), 'ist', now() at time zone 'Asia/Kolkata', 'market', market_status(), 'data_source', 'SIMULATED',
    'indices', (select jsonb_agg(jsonb_build_object('symbol', i.symbol, 'ltp', q.ltp, 'change_pct', round((q.ltp/nullif(q.prev_close,0)-1)*100,2)) order by i.symbol) from instruments i join quotes q on q.instrument_id=i.id where i.segment='INDEX'),
    'breadth', (select jsonb_build_object('up', count(*) filter (where q.ltp > q.prev_close), 'down', count(*) filter (where q.ltp < q.prev_close), 'flat', count(*) filter (where q.ltp = q.prev_close)) from instruments i join quotes q on q.instrument_id=i.id where i.segment='EQ' and i.tradable),
    'gainers', (select jsonb_agg(x) from (select jsonb_build_object('symbol', i.symbol, 'change_pct', round((q.ltp/nullif(q.prev_close,0)-1)*100,2)) x from instruments i join quotes q on q.instrument_id=i.id where i.segment='EQ' and i.tradable order by (q.ltp/nullif(q.prev_close,0)) desc limit 5) g),
    'losers', (select jsonb_agg(x) from (select jsonb_build_object('symbol', i.symbol, 'change_pct', round((q.ltp/nullif(q.prev_close,0)-1)*100,2)) x from instruments i join quotes q on q.instrument_id=i.id where i.segment='EQ' and i.tradable order by (q.ltp/nullif(q.prev_close,0)) asc limit 5) l),
    'sectors', (select jsonb_agg(jsonb_build_object('sector', s, 'avg_change_pct', a) order by a desc) from (select i.sector s, round(avg((q.ltp/nullif(q.prev_close,0)-1)*100),2) a from instruments i join quotes q on q.instrument_id=i.id where i.segment='EQ' and i.tradable group by i.sector) z),
    'scanner_highlights', (select coalesce(jsonb_agg(jsonb_build_object('scanner', s.name, 'symbol', i.symbol, 'at', r.matched_at) order by r.matched_at desc), '[]'::jsonb) from (select * from scanner_results where as_of_day=(now() at time zone 'Asia/Kolkata')::date order by matched_at desc limit 12) r join scanners s on s.id=r.scanner_id and s.kind='system' join instruments i on i.id=r.instrument_id),
    'upcoming_holidays', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'description', description) order by day), '[]'::jsonb) from market_holidays where day >= current_date and day <= current_date + 60),
    'commodities_fx', (select jsonb_agg(jsonb_build_object('symbol', i.symbol, 'ltp', q.ltp, 'change_pct', round((q.ltp/nullif(q.prev_close,0)-1)*100,2), 'segment', i.segment) order by i.segment, i.symbol) from instruments i join quotes q on q.instrument_id=i.id where i.segment in ('COMM','CDS')),
    'latest_articles', (select coalesce(jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'dek', a.dek, 'published_at', a.published_at, 'category', c.name, 'classification', a.classification) order by a.published_at desc), '[]'::jsonb) from (select * from articles where status='published' order by published_at desc limit 6) a left join article_categories c on c.id=a.category_id)
  ) into v;
  return v;
end $$;

alter table article_categories enable row level security;
alter table articles enable row level security;
alter table article_revisions enable row level security;
alter table article_transitions enable row level security;
alter table newsletter_subscriptions enable row level security;
create policy "public read categories" on article_categories for select using (true);
create policy "published or editorial" on articles for select using (status='published' or is_editorial());
create policy "revisions editorial" on article_revisions for select using (is_editorial());
create policy "transitions editorial" on article_transitions for select using (is_editorial());
create policy "newsletter none" on newsletter_subscriptions for select using (is_staff());
revoke insert, update, delete on article_categories, articles, article_revisions, article_transitions, newsletter_subscriptions from anon, authenticated;
revoke execute on function save_article(jsonb) from public, anon;
revoke execute on function article_transition(bigint, article_status, text, timestamptz) from public, anon;
-- subscribe_newsletter and daily_briefing remain callable by anon (public site)

select cron.schedule('airavat-publish-articles', '* * * * *', $$select public.publish_scheduled_articles()$$);
