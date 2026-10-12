-- Валовая выручка по неделям (JOIN заказов и платежей, К-03)
SELECT date_trunc('week', o.created_at) AS week,
       SUM(p.amount) AS revenue
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE o.created_at >= '2025-11-01' AND p.status = 'paid'
GROUP BY 1 ORDER BY 1;

-- Средний чек заказа (только оплаченные платежи)
SELECT AVG(p.amount) AS avg_check, COUNT(DISTINCT o.id) AS orders_count
FROM orders o
JOIN payments p ON p.order_id = o.id
WHERE p.status = 'paid';

-- Отменённые заказы по неделям, превью 500 строк
SELECT date_trunc('week', o.cancelled_at) AS week, COUNT(*) AS cancelled
FROM orders o
WHERE o.status = 'cancelled' AND o.cancelled_at >= '2025-11-01'
GROUP BY 1 ORDER BY 1 LIMIT 500;