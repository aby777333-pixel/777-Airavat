-- 0021: Website CMS (additive). Content pages ship from the code registry; this module lets authorised staff override
-- any page, manage the primary menu, heroes, FAQs, media and SEO with versions, editorial/compliance approval,
-- scheduled publishing and audit, reusing the article_status workflow semantics.

create table site_pages (
  id bigserial primary key,
  path text not null unique,
  group_label text not null default 'Company',
  title text not null,
  h1 text not null,
  dek text,
  intro text,
  keywords text[] not null default '{}',
  hero text not null default 'legal',
  availability text not null default 'info' check (availability in ('sandbox','soon','research','info')),
  availability_note text,
  sections jsonb not null default '[]',
  eligibility text[] default null,
  risks text[] default null,
  costs text[] default null,
  tools jsonb not null default '[]',
  faqs jsonb not null default '[]',
  ctas jsonb not null default '[]',
  related text[] not null default '{}',
  requires_compliance boolean not null default false,  -- product/availability claims need compliance review
  status article_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  version int not null default 1,
  created_by uuid, updated_by uuid, reviewed_by uuid, compliance_reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table site_page_versions (
  id bigserial primary key,
  page_id bigint not null references site_pages(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create table site_page_transitions (
  id bigserial primary key,
  page_id bigint not null references site_pages(id) on delete cascade,
  from_status article_status, to_status article_status not null,
  actor_id uuid, note text, created_at timestamptz not null default now()
);
create table site_menus (
  key text primary key,                 -- 'primary' | 'utility' | 'footer'
  structure jsonb not null,
  status article_status not null default 'draft',
  version int not null default 1,
  updated_by uuid, published_at timestamptz,
  updated_at timestamptz not null default now()
);
create table site_menu_versions (
  id bigserial primary key, menu_key text not null references site_menus(key) on delete cascade, version int not null, structure jsonb not null, changed_by uuid, created_at timestamptz not null default now()
);
create table site_heroes (
  path text primary key,
  variant text not null,
  headline text, intro text,
  status article_status not null default 'draft',
  updated_by uuid, updated_at timestamptz not null default now()
);
create table site_faqs (
  id bigserial primary key,
  path text not null,
  question text not null, answer text not null,
  position int not null default 0,
  status article_status not null default 'draft',
  updated_by uuid, updated_at timestamptz not null default now()
);
create table site_media (
  id bigserial primary key,
  url text not null,
  alt text not null,
  kind text not null default 'image',    -- image | document | video
  width int, height int, bytes int,
  tags text[] not null default '{}',
  uploaded_by uuid, created_at timestamptz not null default now()
);
create table site_settings (
  key text primary key, value jsonb not null, updated_by uuid, updated_at timestamptz not null default now()
);
insert into site_settings(key, value) values
 ('seo_defaults', '{"title_suffix":" · AIRAVAT","description":"Independent Indian stock broker technology, built in the open (sandbox)."}'),
 ('product_availability', '{"stocks":"sandbox","mutual_funds":"soon","etfs":"sandbox","ipo":"sandbox","bonds":"soon","reits":"sandbox","gold":"research","fo":"research","currency":"research","commodity":"research"}')
on conflict do nothing;

alter table site_pages enable row level security;
alter table site_page_versions enable row level security;
alter table site_page_transitions enable row level security;
alter table site_menus enable row level security;
alter table site_menu_versions enable row level security;
alter table site_heroes enable row level security;
alter table site_faqs enable row level security;
alter table site_media enable row level security;
alter table site_settings enable row level security;
create policy "site pages public" on site_pages for select using (status = 'published' or is_staff());
create policy "site page versions staff" on site_page_versions for select using (is_staff());
create policy "site page transitions staff" on site_page_transitions for select using (is_staff());
create policy "site menus public" on site_menus for select using (status = 'published' or is_staff());
create policy "site menu versions staff" on site_menu_versions for select using (is_staff());
create policy "site heroes public" on site_heroes for select using (status = 'published' or is_staff());
create policy "site faqs public" on site_faqs for select using (status = 'published' or is_staff());
create policy "site media public" on site_media for select using (true);
create policy "site settings public" on site_settings for select using (true);
revoke insert, update, delete on site_pages, site_page_versions, site_page_transitions, site_menus, site_menu_versions, site_heroes, site_faqs, site_media, site_settings from anon, authenticated;

create or replace function save_site_page(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare sp site_pages; v_id bigint;
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  if nullif(p->>'id','') is not null then
    select * into sp from site_pages where id = (p->>'id')::bigint;
    if sp.id is null then raise exception 'NOT_FOUND'; end if;
    insert into site_page_versions(page_id, version, snapshot, changed_by, note) values (sp.id, sp.version, to_jsonb(sp), auth.uid(), p->>'change_note');
    update site_pages set title = coalesce(p->>'title', title), h1 = coalesce(p->>'h1', h1), dek = coalesce(p->>'dek', dek), intro = coalesce(p->>'intro', intro),
      keywords = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'keywords') x), keywords), hero = coalesce(p->>'hero', hero),
      availability = coalesce(p->>'availability', availability), availability_note = coalesce(p->>'availability_note', availability_note),
      sections = coalesce(p->'sections', sections), eligibility = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'eligibility') x), eligibility),
      risks = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'risks') x), risks), costs = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'costs') x), costs),
      tools = coalesce(p->'tools', tools), faqs = coalesce(p->'faqs', faqs), ctas = coalesce(p->'ctas', ctas), related = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'related') x), related),
      requires_compliance = coalesce((p->>'requires_compliance')::boolean, requires_compliance), group_label = coalesce(p->>'group_label', group_label),
      status = case when status in ('approved','scheduled','published') then 'draft' else status end, version = version + 1, updated_by = auth.uid(), updated_at = now()
    where id = sp.id;
    v_id := sp.id;
  else
    insert into site_pages(path, group_label, title, h1, dek, intro, keywords, hero, availability, availability_note, sections, eligibility, risks, costs, tools, faqs, ctas, related, requires_compliance, created_by, updated_by)
    values (p->>'path', coalesce(p->>'group_label','Company'), p->>'title', coalesce(p->>'h1', p->>'title'), p->>'dek', p->>'intro', coalesce((select array_agg(x) from jsonb_array_elements_text(p->'keywords') x), '{}'), coalesce(p->>'hero','legal'),
      coalesce(p->>'availability','info'), p->>'availability_note', coalesce(p->'sections','[]'), (select array_agg(x) from jsonb_array_elements_text(p->'eligibility') x), (select array_agg(x) from jsonb_array_elements_text(p->'risks') x), (select array_agg(x) from jsonb_array_elements_text(p->'costs') x),
      coalesce(p->'tools','[]'), coalesce(p->'faqs','[]'), coalesce(p->'ctas','[]'), coalesce((select array_agg(x) from jsonb_array_elements_text(p->'related') x), '{}'), coalesce((p->>'requires_compliance')::boolean,false), auth.uid(), auth.uid())
    returning id into v_id;
    insert into site_page_transitions(page_id, from_status, to_status, actor_id, note) values (v_id, null, 'draft', auth.uid(), 'created');
  end if;
  perform audit('cms.site_page.saved','site_page',v_id::text,null,jsonb_build_object('path',coalesce(p->>'path', (select path from site_pages where id=v_id))));
  return v_id;
end $$;

create or replace function site_page_transition(p_id bigint, p_to article_status, p_note text default null, p_scheduled_for timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare sp site_pages; v_role app_role := current_app_role();
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  select * into sp from site_pages where id = p_id for update;
  if sp.id is null then raise exception 'NOT_FOUND'; end if;
  if p_to = 'in_review' then if sp.status <> 'draft' then raise exception 'INVALID_TRANSITION'; end if;
  elsif p_to = 'compliance_review' then if sp.status <> 'in_review' or v_role not in ('editor','admin','super_admin') then raise exception 'INVALID_TRANSITION'; end if;
  elsif p_to = 'approved' then
    if sp.requires_compliance then
      if sp.status <> 'compliance_review' or v_role not in ('compliance','super_admin') then raise exception 'COMPLIANCE_APPROVAL_REQUIRED'; end if;
      update site_pages set compliance_reviewed_by = auth.uid() where id = p_id;
    else
      if sp.status not in ('in_review','compliance_review') or v_role not in ('editor','compliance','admin','super_admin') then raise exception 'INVALID_TRANSITION'; end if;
    end if;
    if sp.updated_by = auth.uid() and v_role <> 'super_admin' then raise exception 'MAKER_CHECKER_VIOLATION: author cannot approve own page'; end if;
    update site_pages set reviewed_by = auth.uid() where id = p_id;
  elsif p_to = 'scheduled' then if sp.status <> 'approved' or p_scheduled_for is null then raise exception 'MUST_BE_APPROVED_WITH_SCHEDULE'; end if; update site_pages set scheduled_for = p_scheduled_for where id = p_id;
  elsif p_to = 'published' then if sp.status not in ('approved','scheduled') or v_role not in ('editor','admin','super_admin') then raise exception 'MUST_BE_APPROVED'; end if; update site_pages set published_at = now() where id = p_id;
  elsif p_to = 'archived' then if v_role not in ('editor','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  elsif p_to = 'draft' then null;
  else raise exception 'INVALID_TRANSITION'; end if;
  update site_pages set status = p_to, updated_at = now() where id = p_id;
  insert into site_page_transitions(page_id, from_status, to_status, actor_id, note) values (p_id, sp.status, p_to, auth.uid(), p_note);
  perform audit('cms.site_page.'||p_to::text,'site_page',p_id::text,jsonb_build_object('status',sp.status),jsonb_build_object('status',p_to,'note',p_note));
end $$;

create or replace function publish_scheduled_site_pages() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with u as (update site_pages set status='published', published_at = now(), updated_at = now() where status='scheduled' and scheduled_for <= now() returning id)
  select count(*) into n from u;
  return n;
end $$;

create or replace function save_site_menu(p_key text, p_structure jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m site_menus;
begin
  if current_app_role() not in ('editor','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_structure) <> 'array' then raise exception 'MENU_MUST_BE_ARRAY'; end if;
  select * into m from site_menus where key = p_key;
  if m.key is not null then insert into site_menu_versions(menu_key, version, structure, changed_by) values (m.key, m.version, m.structure, auth.uid()); end if;
  insert into site_menus(key, structure, status, version, updated_by, updated_at) values (p_key, p_structure, 'draft', 1, auth.uid(), now())
  on conflict (key) do update set structure = excluded.structure, status = 'draft', version = site_menus.version + 1, updated_by = auth.uid(), updated_at = now();
  perform audit('cms.menu.saved','site_menu',p_key,null,jsonb_build_object('groups', jsonb_array_length(p_structure)));
end $$;
create or replace function publish_site_menu(p_key text, p_publish boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m site_menus;
begin
  if current_app_role() not in ('editor','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  select * into m from site_menus where key = p_key;
  if m.key is null then raise exception 'NOT_FOUND'; end if;
  if p_publish and m.updated_by = auth.uid() and current_app_role() <> 'super_admin' then raise exception 'MAKER_CHECKER_VIOLATION: author cannot publish own menu'; end if;
  update site_menus set status = case when p_publish then 'published' else 'archived' end::article_status, published_at = case when p_publish then now() else published_at end where key = p_key;
  perform audit('cms.menu.'||case when p_publish then 'published' else 'archived' end,'site_menu',p_key,null,null);
end $$;
create or replace function save_site_hero(p_path text, p_variant text, p_headline text, p_intro text, p_publish boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  insert into site_heroes(path, variant, headline, intro, status, updated_by, updated_at) values (p_path, p_variant, p_headline, p_intro, case when p_publish then 'published' else 'draft' end::article_status, auth.uid(), now())
  on conflict (path) do update set variant = excluded.variant, headline = excluded.headline, intro = excluded.intro, status = excluded.status, updated_by = auth.uid(), updated_at = now();
  perform audit('cms.hero.saved','site_hero',p_path,null,jsonb_build_object('variant',p_variant,'published',p_publish));
end $$;
create or replace function save_site_faq(p_id bigint, p_path text, p_q text, p_a text, p_position int, p_status text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  if p_id is null then insert into site_faqs(path, question, answer, position, status, updated_by) values (p_path, p_q, p_a, coalesce(p_position,0), coalesce(p_status,'draft')::article_status, auth.uid()) returning id into v_id;
  else update site_faqs set path = p_path, question = p_q, answer = p_a, position = coalesce(p_position, position), status = coalesce(p_status, status::text)::article_status, updated_by = auth.uid(), updated_at = now() where id = p_id; v_id := p_id; end if;
  perform audit('cms.faq.saved','site_faq',v_id::text,null,jsonb_build_object('path',p_path));
  return v_id;
end $$;
create or replace function delete_site_faq(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$ begin if not is_editorial() then raise exception 'FORBIDDEN'; end if; delete from site_faqs where id = p_id; perform audit('cms.faq.deleted','site_faq',p_id::text,null,null); end $$;
create or replace function register_site_media(p_url text, p_alt text, p_kind text, p_tags text[]) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not is_editorial() then raise exception 'FORBIDDEN'; end if;
  if p_alt is null or length(trim(p_alt)) < 3 then raise exception 'ALT_TEXT_REQUIRED'; end if;
  insert into site_media(url, alt, kind, tags, uploaded_by) values (p_url, p_alt, coalesce(p_kind,'image'), coalesce(p_tags,'{}'), auth.uid()) returning id into v_id;
  perform audit('cms.media.registered','site_media',v_id::text,null,jsonb_build_object('url',p_url));
  return v_id;
end $$;
create or replace function save_site_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_app_role() not in ('editor','compliance','admin','super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_key = 'product_availability' and current_app_role() not in ('compliance','super_admin') then raise exception 'COMPLIANCE_APPROVAL_REQUIRED'; end if;
  insert into site_settings(key, value, updated_by) values (p_key, p_value, auth.uid()) on conflict (key) do update set value = excluded.value, updated_by = auth.uid(), updated_at = now();
  perform audit('cms.setting.saved','site_setting',p_key,null,p_value);
end $$;

revoke execute on function save_site_page(jsonb) from public, anon;
revoke execute on function site_page_transition(bigint, article_status, text, timestamptz) from public, anon;
revoke execute on function publish_scheduled_site_pages() from public, anon, authenticated;
revoke execute on function save_site_menu(text, jsonb) from public, anon;
revoke execute on function publish_site_menu(text, boolean) from public, anon;
revoke execute on function save_site_hero(text, text, text, text, boolean) from public, anon;
revoke execute on function save_site_faq(bigint, text, text, text, int, text) from public, anon;
revoke execute on function delete_site_faq(bigint) from public, anon;
revoke execute on function register_site_media(text, text, text, text[]) from public, anon;
revoke execute on function save_site_setting(text, jsonb) from public, anon;
select cron.schedule('airavat-publish-site-pages', '* * * * *', $$select public.publish_scheduled_site_pages()$$);

-- Media bucket for the CMS (public read; staff upload via the app with their session)
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true) on conflict (id) do nothing;
create policy "site media public read" on storage.objects for select using (bucket_id = 'site-media');
create policy "site media staff upload" on storage.objects for insert with check (bucket_id = 'site-media' and is_editorial());
create policy "site media staff update" on storage.objects for update using (bucket_id = 'site-media' and is_editorial());
