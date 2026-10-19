-- Referral codes come from a sequence, so a code is never handed out twice, even after its sale leaves or changes role
-- (an old /r/<code> link must never start crediting someone else).
create sequence staff_ref_seq;
select setval('staff_ref_seq', coalesce((select max(substring(ref_code from '^NVKD(\d+)$')::int) from staff), 0) + 1, false);

create function next_ref_code() returns text language sql as $$
  select 'NVKD' || lpad(nextval('staff_ref_seq')::text, 2, '0')
$$;

revoke execute on function next_ref_code() from public, anon, authenticated;
