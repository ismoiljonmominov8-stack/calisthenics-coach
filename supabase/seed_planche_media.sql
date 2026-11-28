-- =====================================================================
-- Planche yo'l xaritasi — har bir mashqqa animatsion video ulash
-- Avval seed_planche.sql ishga tushirilgan bo'lishi kerak.
-- Supabase → SQL Editor → New query → shu faylni qo'ying → Run.
--
-- * Videolar ilova bilan birga GitHub'da: media/planche/*.mp4 (har biri ~30 KB).
-- * O'zingiz yuklagan videoga TEGMAYDI: faqat bo'sh yoki shu skript qo'ygan videolar yangilanadi.
-- * Qayta ishga tushirish xavfsiz.
-- =====================================================================

update public.exercises e
set media_url = v.url, media_type = 'video/mp4'
from (values
  ('Planche 1 · Poydevor', 'Bilak tayyorlash (aylantirish, tayanib tebranish)', 'media/planche/1-1.mp4'),
  ('Planche 1 · Poydevor', 'Push-up', 'media/planche/1-2.mp4'),
  ('Planche 1 · Poydevor', 'Dips', 'media/planche/1-3.mp4'),
  ('Planche 1 · Poydevor', 'Hollow body hold', 'media/planche/1-4.mp4'),
  ('Planche 1 · Poydevor', 'Plank', 'media/planche/1-5.mp4'),
  ('Planche 2 · Protraksiya', 'Kurak push-up (scapular push-up)', 'media/planche/2-1.mp4'),
  ('Planche 2 · Protraksiya', 'Protraksiyali plank', 'media/planche/2-2.mp4'),
  ('Planche 2 · Protraksiya', 'Kurak dips (support hold, depressiya)', 'media/planche/2-3.mp4'),
  ('Planche 2 · Protraksiya', 'Serratus punch (rezina bilan)', 'media/planche/2-4.mp4'),
  ('Planche 2 · Protraksiya', 'Devorda serratus slide', 'media/planche/2-5.mp4'),
  ('Planche 3 · Planche lean', 'Planche lean', 'media/planche/3-1.mp4'),
  ('Planche 3 · Planche lean', 'Pseudo planche push-up (PPPU)', 'media/planche/3-2.mp4'),
  ('Planche 3 · Planche lean', 'Hollow body rock', 'media/planche/3-3.mp4'),
  ('Planche 4 · Frog stand → Tuck', 'Frog stand (crow)', 'media/planche/4-1.mp4'),
  ('Planche 4 · Frog stand → Tuck', 'Frog stand → tuck o''tishi', 'media/planche/4-2.mp4'),
  ('Planche 4 · Frog stand → Tuck', 'Tuck planche', 'media/planche/4-3.mp4'),
  ('Planche 4 · Frog stand → Tuck', 'PPPU (chuqurroq lean)', 'media/planche/4-4.mp4'),
  ('Planche 5 · Advanced tuck', 'Advanced tuck planche', 'media/planche/5-1.mp4'),
  ('Planche 5 · Advanced tuck', 'Tuck → advanced tuck o''tishi', 'media/planche/5-2.mp4'),
  ('Planche 5 · Advanced tuck', 'Tuck planche push-up', 'media/planche/5-3.mp4'),
  ('Planche 5 · Advanced tuck', 'Planche lean (25–30 sm)', 'media/planche/5-4.mp4'),
  ('Planche 6 · Straddle', 'Bir oyoqli / half lay planche', 'media/planche/6-1.mp4'),
  ('Planche 6 · Straddle', 'Straddle planche (rezina bilan)', 'media/planche/6-2.mp4'),
  ('Planche 6 · Straddle', 'Straddle → advanced tuck negativ', 'media/planche/6-3.mp4'),
  ('Planche 6 · Straddle', 'Pancake / straddle cho''zilishi', 'media/planche/6-4.mp4'),
  ('Planche 7 · Full planche', 'Full planche (rezina bilan)', 'media/planche/7-1.mp4'),
  ('Planche 7 · Full planche', 'Straddle → full yopish', 'media/planche/7-2.mp4'),
  ('Planche 7 · Full planche', 'Full planche negativ', 'media/planche/7-3.mp4'),
  ('Planche 7 · Full planche', 'Straddle planche ushlash', 'media/planche/7-4.mp4')
) as v(level_name, ex_name, url), public.levels l
where l.id = e.level_id
  and l.name = v.level_name
  and e.name = v.ex_name
  and (e.media_url is null or e.media_url like 'media/planche/%');
