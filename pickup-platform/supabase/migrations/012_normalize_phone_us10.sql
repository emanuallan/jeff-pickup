-- Store participant phones as 10-digit US numbers (no formatting).

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  with digits as (
    select nullif(regexp_replace(trim(p_phone), '\D', '', 'g'), '') as d
  ),
  normalized as (
    select case
      when d is null then null
      when length(d) = 11 and left(d, 1) = '1' then right(d, 10)
      else d
    end as n
    from digits
  )
  select case when length(n) = 10 then n else null end from normalized;
$$;
