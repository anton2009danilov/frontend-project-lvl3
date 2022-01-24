install:
	npm ci
publish:
	npm publish --dry-run
lint:
	npx eslint .
test:
	npm test
test-coverage:
	npm test -- --coverage --coverageProvider=v8
serve:
	webpack serve
watch:
	webpack --watch

.PHONY: test