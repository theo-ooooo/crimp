-- V202605010906: 개발용 암장 시드 데이터 (20곳)
--
-- ⚠️ 개발·데모 전용 데이터. 실제 서비스 오픈 전에는 모두 삭제하고
-- 관리자 큐레이션 통해 실제 암장 정보를 입력해야 한다.
--
-- 브랜드명·지점명·주소·좌표는 MVP 개발 및 UI 검증 목적의 대표 샘플.
-- 정확한 운영 정보는 각 암장 공식 채널에서 확인.

INSERT INTO gyms (ext_id, name, brand, address, lat, lng, phone, opening_hours, setting_cycle_days, features, status)
VALUES
  ('01HSEEDGYM0000000000000001', '더클라임 강남',      '더클라임',    '서울특별시 강남구 역삼동',       37.5008000, 127.0365000, NULL, JSON_OBJECT('mon-fri','10:00-23:00','sat-sun','10:00-22:00'), 14, JSON_OBJECT('bouldering',TRUE,'lead',FALSE),            1),
  ('01HSEEDGYM0000000000000002', '더클라임 홍대',      '더클라임',    '서울특별시 마포구 서교동',       37.5562000, 126.9233000, NULL, JSON_OBJECT('mon-fri','11:00-23:00','sat-sun','10:00-22:00'), 14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE),             1),
  ('01HSEEDGYM0000000000000003', '더클라임 성수',      '더클라임',    '서울특별시 성동구 성수동',       37.5446000, 127.0563000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       10, JSON_OBJECT('bouldering',TRUE,'moonboard',TRUE),        1),
  ('01HSEEDGYM0000000000000004', '더클라임 종로',      '더클라임',    '서울특별시 종로구 관철동',       37.5697000, 126.9866000, NULL, JSON_OBJECT('mon-sun','10:00-22:30'),                       14, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000005', '클라임웍스 강남',    '클라임웍스',  '서울특별시 강남구 논현동',       37.5121000, 127.0258000, NULL, JSON_OBJECT('mon-fri','10:00-23:00','sat','10:00-22:00'),   12, JSON_OBJECT('bouldering',TRUE,'kilterboard',TRUE),      1),
  ('01HSEEDGYM0000000000000006', '클라임웍스 신촌',    '클라임웍스',  '서울특별시 서대문구 창천동',     37.5589000, 126.9423000, NULL, JSON_OBJECT('mon-sun','11:00-23:00'),                       12, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000007', '클라임웍스 판교',    '클라임웍스',  '경기도 성남시 분당구 삼평동',    37.4016000, 127.1087000, NULL, JSON_OBJECT('mon-fri','10:00-23:00'),                       14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE),             1),
  ('01HSEEDGYM0000000000000008', '피커스 홍대',        '피커스',      '서울특별시 마포구 동교동',       37.5580000, 126.9257000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       10, JSON_OBJECT('bouldering',TRUE,'kilterboard',TRUE),      1),
  ('01HSEEDGYM0000000000000009', '피커스 건대',        '피커스',      '서울특별시 광진구 자양동',       37.5398000, 127.0690000, NULL, JSON_OBJECT('mon-sun','11:00-23:00'),                       10, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000010', '피커스 서면',        '피커스',      '부산광역시 부산진구 부전동',     35.1570000, 129.0596000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       14, JSON_OBJECT('bouldering',TRUE,'moonboard',TRUE),        1),
  ('01HSEEDGYM0000000000000011', '볼더리 합정',        '볼더리',      '서울특별시 마포구 합정동',       37.5496000, 126.9134000, NULL, JSON_OBJECT('mon-sun','11:00-23:00'),                       7,  JSON_OBJECT('bouldering',TRUE,'moonboard',TRUE),        1),
  ('01HSEEDGYM0000000000000012', '볼더리 잠실',        '볼더리',      '서울특별시 송파구 잠실동',       37.5133000, 127.1000000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       7,  JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000013', '자이언트 홍대',      '자이언트',    '서울특별시 마포구 서교동',       37.5509000, 126.9247000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE,'top_rope',TRUE), 1),
  ('01HSEEDGYM0000000000000014', '자이언트 강남',      '자이언트',    '서울특별시 강남구 신사동',       37.5170000, 127.0203000, NULL, JSON_OBJECT('mon-fri','10:00-23:00'),                       14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE),             1),
  ('01HSEEDGYM0000000000000015', '락드릴 이태원',      '락드릴',      '서울특별시 용산구 이태원동',     37.5345000, 126.9945000, NULL, JSON_OBJECT('mon-sun','12:00-23:00'),                       10, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000016', '락드릴 수원',        '락드릴',      '경기도 수원시 영통구 영통동',    37.2574000, 127.0671000, NULL, JSON_OBJECT('mon-sun','10:00-22:30'),                       14, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000017', '스탯 강남',          '스탯',        '서울특별시 강남구 대치동',       37.4993000, 127.0583000, NULL, JSON_OBJECT('mon-fri','10:00-23:00'),                       12, JSON_OBJECT('bouldering',TRUE,'moonboard',TRUE),        1),
  ('01HSEEDGYM0000000000000018', '스탯 구리',          '스탯',        '경기도 구리시 인창동',           37.6036000, 127.1402000, NULL, JSON_OBJECT('mon-sun','10:00-22:00'),                       14, JSON_OBJECT('bouldering',TRUE),                         1),
  ('01HSEEDGYM0000000000000019', '실내 암장 안양',     '크라임',      '경기도 안양시 동안구 관양동',    37.4010000, 126.9578000, NULL, JSON_OBJECT('mon-sun','10:00-22:30'),                       14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE),             1),
  ('01HSEEDGYM0000000000000020', '클라이밍 파크 인천', '클라이밍파크','인천광역시 연수구 송도동',       37.3832000, 126.6562000, NULL, JSON_OBJECT('mon-sun','10:00-23:00'),                       14, JSON_OBJECT('bouldering',TRUE,'lead',TRUE,'top_rope',TRUE), 1);
