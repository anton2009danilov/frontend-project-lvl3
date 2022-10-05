install:
	npm ci
publish:
	npm publish --dry-run
lint:
	npx eslint .
test:
	npm test
test-coverage:
	npm test -- --coverage
build:
	npx webpack --mode=production --node-env=production
serve:
	npx webpack serve
watch:
	npx webpack --watch

.PHONY: test