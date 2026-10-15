-- Product detail view on the shop: a description per product and a picture per pack (what the customer receives).
alter table products add column description text check (char_length(description) <= 1000);
alter table product_packs add column image_url text check (char_length(image_url) <= 500);

update product_packs set image_url = case lower(name)
    when 'kg' then '/packs/kg.svg'
    when 'thùng' then '/packs/thung.svg'
    when 'bao' then '/packs/bao.svg'
    when 'túi' then '/packs/tui.svg'
  end
where image_url is null;

update products p set description = d.description
from (values
  ('Mì trứng', 'Mì trứng tươi làm từ bột mì và trứng gà, sợi vàng dai. Hợp xào, trụng nước lèo. Dùng trong 2 ngày, bảo quản mát.'),
  ('Mì vàng sợi nhỏ', 'Sợi mì vàng nhỏ, mềm, chín nhanh. Hợp mì nước, mì hoành thánh. Dùng trong 2 ngày, bảo quản mát.'),
  ('Hủ tiếu dai', 'Hủ tiếu bột gạo sợi dai, không bở khi trụng. Hợp hủ tiếu Nam Vang, hủ tiếu xào. Dùng trong 2 ngày, bảo quản mát.'),
  ('Bánh phở tươi', 'Bánh phở gạo tươi tráng mỗi sáng, sợi mềm. Hợp phở bò, phở gà, phở xào. Dùng trong 2 ngày, bảo quản mát.'),
  ('Bún tươi', 'Bún gạo tươi sợi vừa, trắng mềm. Hợp bún chả, bún thịt nướng, bún riêu. Dùng trong 2 ngày, bảo quản mát.'),
  ('Mì quảng', 'Sợi mì quảng bản to, màu vàng nghệ. Hợp mì quảng gà, tôm thịt. Dùng trong 2 ngày, bảo quản mát.')
) as d(name, description)
where p.name = d.name and p.description is null;
