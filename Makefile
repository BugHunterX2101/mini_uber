build:
	docker-compose up --build

start:
	docker-compose up

stop:
	docker-compose down

clean:
	docker-compose down -v
	docker system prune -f

logs:
	docker-compose logs -f

.PHONY: build start stop clean logs