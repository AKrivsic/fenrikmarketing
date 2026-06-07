-- Run only in authenticated user context.
-- auth.uid() must not be NULL.

insert into projects (
  owner_id,
  name,
  type,
  language,
  market_scope,
  target_audience,
  goal_type,
  product_is,
  product_is_not,
  product_strengths,
  pain_points,
  forbidden_claims,
  tone_of_voice,
  platforms,
  publishing_rules,
  default_cta
)
values
(
  auth.uid(),
  'Úklidy Praha',
  'local_service',
  'cs',
  'local',
  '{"segments":["domácnosti","SVJ","malé kanceláře"],"location":"Praha","decision_makers":["majitel bytu","office manager"]}',
  'lead_generation',
  array['úklidová služba v Praze','pravidelný i jednorázový úklid'],
  array['nejsme franšíza','negarantujeme nemožné termíny'],
  array['rychlá domluva','lokální dostupnost','spolehlivost'],
  array['nedostatek času','nespolehlivé úklidové služby','stres před návštěvou'],
  array['100% odstranění všech skvrn','nejlevnější v Praze'],
  '{"style":"praktický, důvěryhodný, lokální","avoid":["agresivní prodej","přehnané sliby"]}',
  array['instagram','facebook','blog']::platform_type[],
  '{"frequency":"3x týdně","best_times":["08:00","18:00"],"content_mix":{"tips":40,"proof":30,"offer":30}}',
  'Objednat nezávaznou poptávku'
),
(
  auth.uid(),
  'AI Chatbot',
  'saas',
  'cs',
  'national',
  '{"segments":["malé firmy","e-shopy","servisní týmy"],"decision_makers":["founder","sales manager","support lead"]}',
  'activation',
  array['AI chatbot pro zákaznickou komunikaci','automatizace FAQ a lead capture'],
  array['nenahrazuje celý support tým','není univerzální AGI'],
  array['rychlé nasazení','nižší zátěž supportu','lepší dostupnost odpovědí'],
  array['opakující se dotazy','pomalé reakce','ztracené leady'],
  array['garance 100% přesnosti','plná náhrada člověka'],
  '{"style":"jasný, expertní, konkrétní","avoid":["buzzwordy","přehnaný hype"]}',
  array['linkedin','blog','email']::platform_type[],
  '{"frequency":"4x týdně","best_times":["09:00","14:00"],"content_mix":{"education":50,"case_use":30,"offer":20}}',
  'Vyzkoušet demo'
),
(
  auth.uid(),
  'Community Manager',
  'community_service',
  'cs',
  'national',
  '{"segments":["tvůrci","zakladatelé komunit","malé značky"],"decision_makers":["founder","marketing manager","creator"]}',
  'awareness',
  array['služba pro správu a růst online komunit','moderace a obsahová aktivace'],
  array['není placený spam','není nákup followerů'],
  array['konzistentní komunikace','aktivace členů','cit pro tón značky'],
  array['nízká aktivita komunity','chaos v komunikaci','málo času na moderaci'],
  array['garance virality','garance konkrétního počtu členů'],
  '{"style":"lidský, aktivní, komunitní","avoid":["korporátní fráze","umělá autenticita"]}',
  array['linkedin','facebook','instagram']::platform_type[],
  '{"frequency":"5x týdně","best_times":["10:00","19:00"],"content_mix":{"conversation":40,"education":30,"proof":20,"offer":10}}',
  'Domluvit konzultaci'
);

insert into evergreen_topics (project_id, title, pillar, keywords)
select id, 'Jak poznat spolehlivou úklidovou službu', 'trust', array['úklid Praha','spolehlivost','checklist']
from projects
where name = 'Úklidy Praha'
  and owner_id = auth.uid();

insert into evergreen_topics (project_id, title, pillar, keywords)
select id, 'Kdy se firmě vyplatí AI chatbot', 'education', array['AI chatbot','automatizace','support']
from projects
where name = 'AI Chatbot'
  and owner_id = auth.uid();

insert into evergreen_topics (project_id, title, pillar, keywords)
select id, 'Jak rozhýbat neaktivní komunitu', 'activation', array['community management','engagement','moderace']
from projects
where name = 'Community Manager'
  and owner_id = auth.uid();
