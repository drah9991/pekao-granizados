-- Migration to fix product types for Sachets and Unit products saved inadvertently as granizado
UPDATE public.products
SET type = 'sachet'
WHERE (
    UPPER(name) LIKE '%SACHET%' 
    OR UPPER(category) LIKE '%SACHET%'
  )
  AND type = 'granizado';

UPDATE public.products
SET type = 'sweet'
WHERE (
    UPPER(name) LIKE '%DULCE%' 
    OR UPPER(category) LIKE '%DULCE%'
    OR UPPER(category) LIKE '%SNACK%'
  )
  AND type = 'granizado';

UPDATE public.products
SET type = 'topping'
WHERE (
    UPPER(name) LIKE '%TOPPING%' 
    OR UPPER(category) LIKE '%TOPPING%'
  )
  AND type = 'granizado';
