up:
	docker compose --env-file ./backend/.env -f docker-compose.yml up --build

up-local:
	docker compose --env-file ./backend/.env.local -f docker-compose.local.yml up --build

build-no-cache:
	docker compose --env-file ./backend/.env.local -f docker-compose.local.yml build --no-cache

down:
	docker compose -f docker-compose.yml down

down-local:
	docker compose -f docker-compose.local.yml down

logs:
	docker compose -f docker-compose.local.yml logs -f

restart-backend:
	docker compose -f docker-compose.local.yml restart backend

restart-frontend:
	docker compose -f docker-compose.local.yml restart frontend