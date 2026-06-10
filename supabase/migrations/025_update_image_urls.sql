-- ================================================================
-- 025_update_image_urls.sql  (2026-06-10)
-- 실제 업로드된 이미지로 image_url 교체
--
-- ▶ 실행 전: 아래 두 줄의 URL을 본인 프로젝트로 교체하세요
--   Dashboard → Settings → API → Project URL
-- ================================================================

DO $$
DECLARE
  t text := 'https://cnjykhdvbvewagfbbxwr.supabase.co/storage/v1/object/public/treatments/';
  d text := 'https://cnjykhdvbvewagfbbxwr.supabase.co/storage/v1/object/public/devices/';
BEGIN

  -- ── 시술 (treatments) ──────────────────────────────────────────
  UPDATE treatments SET image_url = t||'thermage-flx.jpg'      WHERE id = 'ccbbbbbb-0000-0000-0000-000000000001';
  UPDATE treatments SET image_url = t||'oligio.jpg'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000002';
  UPDATE treatments SET image_url = t||'tentherm.jpg'          WHERE id = 'ccbbbbbb-0000-0000-0000-000000000003';
  UPDATE treatments SET image_url = t||'potenza.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000004';
  UPDATE treatments SET image_url = t||'volnuma.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000005';
  UPDATE treatments SET image_url = t||'vro-lifting.jpg'       WHERE id = 'ccbbbbbb-0000-0000-0000-000000000006';
  UPDATE treatments SET image_url = t||'ulthera.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000007';
  UPDATE treatments SET image_url = t||'shrink-universe.jpg'   WHERE id = 'ccbbbbbb-0000-0000-0000-000000000008';
  UPDATE treatments SET image_url = t||'lineage.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000009';
  UPDATE treatments SET image_url = t||'titanium-lifting.jpg'  WHERE id = 'ccbbbbbb-0000-0000-0000-000000000010';
  UPDATE treatments SET image_url = t||'inmode.jpg'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000011';
  UPDATE treatments SET image_url = t||'ldm-lifting.jpg'       WHERE id = 'ccbbbbbb-0000-0000-0000-000000000012';
  UPDATE treatments SET image_url = t||'rejuran-healer.jpg'    WHERE id = 'ccbbbbbb-0000-0000-0000-000000000013';
  UPDATE treatments SET image_url = t||'juvelook.jpg'          WHERE id = 'ccbbbbbb-0000-0000-0000-000000000014';
  UPDATE treatments SET image_url = t||'exosome.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000015';
  UPDATE treatments SET image_url = t||'retidge-collagen.jpg'  WHERE id = 'ccbbbbbb-0000-0000-0000-000000000016';
  UPDATE treatments SET image_url = t||'mirajet.jpg'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000017';
  UPDATE treatments SET image_url = t||'water-glow.jpg'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000018';
  UPDATE treatments SET image_url = t||'botox-jaw.jpg'         WHERE id = 'ccbbbbbb-0000-0000-0000-000000000019';
  UPDATE treatments SET image_url = t||'botox-forehead.jpg'    WHERE id = 'ccbbbbbb-0000-0000-0000-000000000020';
  UPDATE treatments SET image_url = t||'skin-botox.jpg'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000021';
  UPDATE treatments SET image_url = t||'aquapeel.jpg'          WHERE id = 'ccbbbbbb-0000-0000-0000-000000000022';
  UPDATE treatments SET image_url = t||'fraxel-repair.jpg'     WHERE id = 'ccbbbbbb-0000-0000-0000-000000000023';
  UPDATE treatments SET image_url = t||'pico-laser.jpg'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000024';
  UPDATE treatments SET image_url = t||'pico-toning.jpg'       WHERE id = 'ccbbbbbb-0000-0000-0000-000000000025';
  UPDATE treatments SET image_url = t||'laser-toning.jpg'      WHERE id = 'ccbbbbbb-0000-0000-0000-000000000026';
  UPDATE treatments SET image_url = t||'ipl-photo.jpg'         WHERE id = 'ccbbbbbb-0000-0000-0000-000000000027';
  UPDATE treatments SET image_url = t||'clarity-laser.jpg'     WHERE id = 'ccbbbbbb-0000-0000-0000-000000000028';
  UPDATE treatments SET image_url = t||'lip-filler.jpg'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000029';
  UPDATE treatments SET image_url = t||'sculptra.jpg'          WHERE id = 'ccbbbbbb-0000-0000-0000-000000000030';

  -- ── 기기 (devices) ─────────────────────────────────────────────
  UPDATE devices SET image_url = d||'medicube-age-r-ultra.jpg'     WHERE id = 'ddbbbbbb-0000-0000-0000-000000000001';
  UPDATE devices SET image_url = d||'silkn-facetite.jpg'           WHERE id = 'ddbbbbbb-0000-0000-0000-000000000002';
  UPDATE devices SET image_url = d||'yaman-photo-plus.jpg'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000003';
  UPDATE devices SET image_url = d||'zuskin-wh.jpg'                WHERE id = 'ddbbbbbb-0000-0000-0000-000000000004';
  UPDATE devices SET image_url = d||'nugen-rf.jpg'                 WHERE id = 'ddbbbbbb-0000-0000-0000-000000000005';
  UPDATE devices SET image_url = d||'sencia-rf.jpg'                WHERE id = 'ddbbbbbb-0000-0000-0000-000000000006';
  UPDATE devices SET image_url = d||'rookins-rf-hifu.jpg'          WHERE id = 'ddbbbbbb-0000-0000-0000-000000000007';
  UPDATE devices SET image_url = d||'dualsonic-maximum.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000008';
  UPDATE devices SET image_url = d||'rejuran-lift.jpg'             WHERE id = 'ddbbbbbb-0000-0000-0000-000000000009';
  UPDATE devices SET image_url = d||'ecodmlab-quadcera.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000010';
  UPDATE devices SET image_url = d||'dalba-olcera.jpg'             WHERE id = 'ddbbbbbb-0000-0000-0000-000000000011';
  UPDATE devices SET image_url = d||'attibeauty-homcera.jpg'       WHERE id = 'ddbbbbbb-0000-0000-0000-000000000012';
  UPDATE devices SET image_url = d||'lg-pral-liftup.jpg'           WHERE id = 'ddbbbbbb-0000-0000-0000-000000000013';
  UPDATE devices SET image_url = d||'medicube-booster-pro.jpg'     WHERE id = 'ddbbbbbb-0000-0000-0000-000000000014';
  UPDATE devices SET image_url = d||'madeca-prime.jpg'             WHERE id = 'ddbbbbbb-0000-0000-0000-000000000015';
  UPDATE devices SET image_url = d||'madeca-prime-max.jpg'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000016';
  UPDATE devices SET image_url = d||'vanav-up6.jpg'                WHERE id = 'ddbbbbbb-0000-0000-0000-000000000017';
  UPDATE devices SET image_url = d||'hitachi-hadacrie.jpg'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000018';
  UPDATE devices SET image_url = d||'ergobody-deshaper.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000019';
  UPDATE devices SET image_url = d||'nuface-mini-plus.jpg'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000020';
  UPDATE devices SET image_url = d||'mamicare-vthera.jpg'          WHERE id = 'ddbbbbbb-0000-0000-0000-000000000021';
  UPDATE devices SET image_url = d||'medicube-eye-shot.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000022';
  UPDATE devices SET image_url = d||'wel247-facetunefit.jpg'       WHERE id = 'ddbbbbbb-0000-0000-0000-000000000023';
  UPDATE devices SET image_url = d||'upitov-galvanic.jpg'          WHERE id = 'ddbbbbbb-0000-0000-0000-000000000024';
  UPDATE devices SET image_url = d||'oa-perfect-peel.jpg'          WHERE id = 'ddbbbbbb-0000-0000-0000-000000000025';
  UPDATE devices SET image_url = d||'panasonic-ion-effector.jpg'   WHERE id = 'ddbbbbbb-0000-0000-0000-000000000026';
  UPDATE devices SET image_url = d||'gloworks-4d.jpg'              WHERE id = 'ddbbbbbb-0000-0000-0000-000000000027';
  UPDATE devices SET image_url = d||'lg-pral-led-mask.jpg'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000028';
  UPDATE devices SET image_url = d||'cellreturn-led-platinum.jpg'  WHERE id = 'ddbbbbbb-0000-0000-0000-000000000029';
  UPDATE devices SET image_url = d||'philips-lumea-ipl.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000030';
  UPDATE devices SET image_url = d||'newa-rf-plus.jpg'             WHERE id = 'ddbbbbbb-0000-0000-0000-000000000031';
  UPDATE devices SET image_url = d||'tripollar-stop-vx2.jpg'       WHERE id = 'ddbbbbbb-0000-0000-0000-000000000032';
  UPDATE devices SET image_url = d||'medicube-high-focus-shot.jpg' WHERE id = 'ddbbbbbb-0000-0000-0000-000000000033';
  UPDATE devices SET image_url = d||'foreo-bear2.jpg'              WHERE id = 'ddbbbbbb-0000-0000-0000-000000000034';
  UPDATE devices SET image_url = d||'ziip-halo.jpg'                WHERE id = 'ddbbbbbb-0000-0000-0000-000000000035';
  UPDATE devices SET image_url = d||'facegym-pro.jpg'              WHERE id = 'ddbbbbbb-0000-0000-0000-000000000036';
  UPDATE devices SET image_url = d||'arrivo-zeus2.jpg'             WHERE id = 'ddbbbbbb-0000-0000-0000-000000000037';
  UPDATE devices SET image_url = d||'yaman-medi-lift-eye.jpg'      WHERE id = 'ddbbbbbb-0000-0000-0000-000000000038';
  UPDATE devices SET image_url = d||'currentbody-led-mask.jpg'     WHERE id = 'ddbbbbbb-0000-0000-0000-000000000039';
  UPDATE devices SET image_url = d||'currentbody-neck-perfector.jpg' WHERE id = 'ddbbbbbb-0000-0000-0000-000000000040';
  UPDATE devices SET image_url = d||'omnilux-contour-face.jpg'     WHERE id = 'ddbbbbbb-0000-0000-0000-000000000041';
  UPDATE devices SET image_url = d||'theraface-wand.jpg'           WHERE id = 'ddbbbbbb-0000-0000-0000-000000000042';
  UPDATE devices SET image_url = d||'hairmax-laserband.jpg'        WHERE id = 'ddbbbbbb-0000-0000-0000-000000000043';
  UPDATE devices SET image_url = d||'cellreturn-hair-alpha.jpg'    WHERE id = 'ddbbbbbb-0000-0000-0000-000000000044';

END $$;
