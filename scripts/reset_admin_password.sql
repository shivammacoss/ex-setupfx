-- Run on VPS if admin login returns 401 (password unknown or old seed hash).
-- Password after this update: PipHighAdmin2026!
-- docker compose exec -T postgres psql -U piphigh -d piphigh -f - < scripts/reset_admin_password.sql
UPDATE users
SET password_hash = '$2b$12$ZgUSt54zOtd8fTviaCCrl.ttfnqm83OKO0hgqFb3isHxyyckc8lJG'
WHERE email = 'admin@piphigh.com';
