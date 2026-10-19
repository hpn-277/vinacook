-- Products are tied to one factory, so there is nothing to balance against a daily capacity.
alter table factories drop column capacity_kg_per_day;
