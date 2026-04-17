-- 초기 컨테이너 최초 기동 시 1회 실행. `crimp` 유저에게 DB 전체 권한 부여.
GRANT ALL PRIVILEGES ON `crimp`.* TO 'crimp'@'%';
GRANT RELOAD, PROCESS, SHOW DATABASES ON *.* TO 'crimp'@'%';
FLUSH PRIVILEGES;
