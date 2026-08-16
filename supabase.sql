create table units (
  id text primary key,
  zone text,
  code text,
  size text,
  status text,
  tenant_name text,
  tenant_phone text,
  rent text,
  rent_type text,
  payments jsonb default '[]'::jsonb,
  seed boolean default false
);

create index if not exists idx_units_zone
  on units (zone);

create index if not exists idx_units_code
  on units (code);
