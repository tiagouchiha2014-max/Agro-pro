-- Seed data: CEPEA prices for 2026-03-01
-- Execute AFTER cotacoes_diarias table creation

INSERT INTO public.cotacoes_diarias (commodity, preco, unidade, fonte, data) VALUES
  ('acucar', 98.59, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('algodao', 116.49, '@', 'CEPEA/Esalq', '2026-03-01'),
  ('arroz', 55.51, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('bezerro', 3224.18, 'cab', 'CEPEA/Esalq', '2026-03-01'),
  ('boi', 353.15, '@', 'CEPEA/Esalq', '2026-03-01'),
  ('cafe', 1797.61, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('feijao', 290.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01'),
  ('milho', 69.53, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('soja', 120.7, 'sc', 'CEPEA/Esalq', '2026-03-01'),
  ('sorgo', 45.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01'),
  ('trigo', 90.0, 'sc', 'CEPEA/Esalq (ref.)', '2026-03-01')
ON CONFLICT (commodity, data) DO UPDATE SET preco = EXCLUDED.preco, fonte = EXCLUDED.fonte;
