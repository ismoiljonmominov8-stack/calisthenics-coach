-- =====================================================================
-- Planche yo'l xaritasi — 7 daraja, kunlik mashqlar va o'tish testlari
-- Supabase → SQL Editor → New query → shu faylni qo'ying → Run.
--
-- * Texnika → Planche → "VII · Yo'l xaritasi" bilan bir xil bosqichlar.
-- * Mavjud darajalaringizga tegmaydi: yangi darajalar ularning oxiriga qo'shiladi.
-- * Qayta ishga tushirsangiz, allaqachon bor darajani o'tkazib yuboradi.
-- * Videolar keyin: Murabbiy paneli → Mashqlar va darajalar → mashqni tahrirlash → media.
-- * Testlar bugundan 21 kun keyinga "kutilmoqda" holatida qo'yiladi —
--   talaba shu darajaga o'tkazilganda sanani o'zgartiring.
-- =====================================================================

do $$
declare
  stage    jsonb;
  ex       jsonb;
  te       jsonb;
  lvl_id   uuid;
  test_id  uuid;
  base     int;
  n        int := 0;
  k        int;
  stages   jsonb := $json$
[
 {"name":"Planche 1 · Poydevor",
  "desc":"Bilakni to'g'ri qo'lda yuk ko'tarishga tayyorlash, asosiy itarish kuchi va hollow tana.",
  "ex":[["Bilak tayyorlash (aylantirish, tayanib tebranish)",1,"3–5 daq","Bilak 90° bukilganda og'rimasligi kerak."],
        ["Push-up",3,"15–20","Tana to'g'ri chiziq, tirsak tanaga 45°."],
        ["Dips",3,"8–12","Yelka oldi kuchi va triceps."],
        ["Hollow body hold",3,"30 s","Bel polga yopishgan."],
        ["Plank",3,"45 s","Qorin va dumba tarang."]],
  "test":[["Push-up","20 ta"],["Dips","10 ta"],["Hollow body hold","30 s"]]},
 {"name":"Planche 2 · Protraksiya",
  "desc":"Kuraklarni oldinga surish va pastga tushirish: polni itarib yuboring, kuraklar bir-biridan uzoqlashadi, yelkalar quloqdan uzoq.",
  "ex":[["Kurak push-up (scapular push-up)",3,"12–15, tepada 2 s","Tirsak to'g'ri; faqat kuraklar harakatlanadi."],
        ["Protraksiyali plank",3,"30–45 s","To'g'ri qo'lda polni maksimal itarib turing."],
        ["Kurak dips (support hold, depressiya)",3,"20–30 s","Brusda to'g'ri qo'l, yelkalar pastda."],
        ["Serratus punch (rezina bilan)",3,"12 har qo'l","Qo'lni oldinga uring, kurak oldinga ketadi."],
        ["Devorda serratus slide",2,"10","Bilaklar devorda, kurak oldinga."]],
  "test":[["Kurak push-up","3 × 15"],["Protraksiyali plank","45 s"]]},
 {"name":"Planche 3 · Planche lean",
  "desc":"Yelkani kaftdan oldinga chiqarib, to'g'ri qo'l va protraksiya bilan yukni ko'tarish.",
  "ex":[["Planche lean",4,"20–30 s","Yelka kaftdan 10 sm dan 25 sm gacha oldinda. Tirsak qulflangan, protraksiya."],
        ["Pseudo planche push-up (PPPU)",3,"6–10","Lean holatida push-up; tepada protraksiya."],
        ["Hollow body rock",3,"15","Tana tarangligi."]],
  "test":[["Planche lean (yelka ~20 sm oldinda)","3 × 30 s"]]},
 {"name":"Planche 4 · Frog stand → Tuck",
  "desc":"Oyoqlarni poldan uzish: frog stand, keyin tizzalarni tirsakdan uzib tuck planche.",
  "ex":[["Frog stand (crow)",3,"20–30 s","Tizzalar tirsak orqasida; muvozanat barmoqlarda."],
        ["Frog stand → tuck o'tishi",5,"3–5 s","Qo'llarni to'g'rilab, tizzalarni tirsakdan uzing."],
        ["Tuck planche",7,"5–10 s","Kuraklar protraksiyada, orqa yumaloq."],
        ["PPPU (chuqurroq lean)",3,"6–8","Kuch zaxirasi uchun."]],
  "test":[["Tuck planche","3 × 10–15 s"]]},
 {"name":"Planche 5 · Advanced tuck",
  "desc":"Orqani tekislab tosni yelka balandligiga chiqarish — richag uzayadi.",
  "ex":[["Advanced tuck planche",6,"5–10 s","Orqa tekis, tos yelka balandligida."],
        ["Tuck → advanced tuck o'tishi",4,"3–5","Ushlab turgan holda orqani asta tekislang."],
        ["Tuck planche push-up",3,"3–5","To'g'ri qo'ldan bukilgan qo'l kuchiga."],
        ["Planche lean (25–30 sm)",3,"20 s","Lean chuqurligini oshiring."]],
  "test":[["Advanced tuck planche","3 × 10–15 s"]]},
 {"name":"Planche 6 · Straddle",
  "desc":"Oyoqlarni to'g'rilab keng ochish; oraliq: bir oyoqli va half lay planche.",
  "ex":[["Bir oyoqli / half lay planche",5,"5–8 s","Advanced tuck va straddle orasidagi ko'prik."],
        ["Straddle planche (rezina bilan)",5,"8–10 s","Rezinani asta ingichkaroqqa almashtiring."],
        ["Straddle → advanced tuck negativ",4,"3","Sekin tushish."],
        ["Pancake / straddle cho'zilishi",1,"5 daq","Keng ochilish uchun moslashuvchanlik."]],
  "test":[["Straddle planche (rezinasiz)","3 × 8–10 s"]]},
 {"name":"Planche 7 · Full planche",
  "desc":"Oyoqlar birlashgan, butun tana yelkadan to'piqqacha bitta gorizontal chiziq.",
  "ex":[["Full planche (rezina bilan)",5,"5–8 s","Rezinani asta kamaytiring."],
        ["Straddle → full yopish",4,"3–5 s","Straddledan oyoqlarni asta birlashtiring."],
        ["Full planche negativ",4,"3–5","Baland holatdan sekin tushish."],
        ["Straddle planche ushlash",3,"max","Kuch zaxirasini saqlash."]],
  "test":[["Full planche","5–10 s"]]}
]
$json$;
begin
  select coalesce(max(sort_order), 0) into base from public.levels;

  for stage in select * from jsonb_array_elements(stages) loop
    n := n + 1;
    if exists (select 1 from public.levels where name = stage->>'name') then
      raise notice 'O''tkazildi (allaqachon bor): %', stage->>'name';
      continue;
    end if;

    insert into public.levels (name, description, sort_order)
    values (stage->>'name', stage->>'desc', base + n)
    returning id into lvl_id;

    k := 0;
    for ex in select * from jsonb_array_elements(stage->'ex') loop
      k := k + 1;
      insert into public.exercises (level_id, name, sets, reps, days, note, sort_order)
      values (lvl_id, ex->>0, (ex->>1)::int, ex->>2, null, ex->>3, k);
    end loop;

    insert into public.tests (title, test_date, level_id, note, status)
    values ('O''tish testi · ' || (stage->>'name'), current_date + 21, lvl_id,
            'Sanani talaba shu darajaga o''tganda o''zgartiring.', 'upcoming')
    returning id into test_id;

    k := 0;
    for te in select * from jsonb_array_elements(stage->'test') loop
      k := k + 1;
      insert into public.test_exercises (test_id, name, target, sort_order)
      values (test_id, te->>0, te->>1, k);
    end loop;

    raise notice 'Qo''shildi: %', stage->>'name';
  end loop;
end $$;
