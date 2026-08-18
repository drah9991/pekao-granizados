-- View to calculate customer loyalty metrics per store
CREATE OR REPLACE VIEW vw_customer_loyalty AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  o.store_id,
  COUNT(o.id) as purchase_count,
  SUM(o.total) as total_spent,
  MAX(o.created_at) as last_purchase,
  CASE 
    WHEN COUNT(o.id) >= 10 THEN 'VIP 🌟'
    WHEN COUNT(o.id) >= 3 THEN 'Recurrente'
    ELSE 'Nuevo'
  END as category
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.id, c.name, c.email, c.phone, o.store_id;

-- Grant permissions to authenticated users to select from this view
GRANT SELECT ON vw_customer_loyalty TO authenticated;
GRANT SELECT ON vw_customer_loyalty TO anon;
