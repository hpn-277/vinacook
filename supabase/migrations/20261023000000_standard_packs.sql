-- Every product sells the same packs: Cây 5 kg, Bao 30 kg, Thùng 5/10/15 kg. Kg and Túi stop selling; old orders keep their snapshot.
-- One name can come in several sizes (Thùng 5/10/15 kg), so a pack is unique by name and size.
alter table product_packs
  drop constraint product_packs_product_id_name_key,
  add constraint product_packs_product_id_name_kg_key unique (product_id, name, kg_per_unit);

update product_packs set active = false where name in ('Kg', 'Túi');
update product_packs set kg_per_unit = 30 where name = 'Bao';

insert into product_packs (product_id, name, kg_per_unit, image_url)
select p.id, pk.name, pk.kg, pk.image_url
from products p
cross join (values
  ('Cây', 5, '/packs/cay.svg'), ('Bao', 30, '/packs/bao.svg'),
  ('Thùng', 5, '/packs/thung.svg'), ('Thùng', 10, '/packs/thung.svg'), ('Thùng', 15, '/packs/thung.svg')
) as pk(name, kg, image_url)
on conflict (product_id, name, kg_per_unit) do update set active = true;
