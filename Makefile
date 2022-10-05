install:
	npm ci
publish:
	npm publish --dry-run
lint:
	npx eslint .
test:
	npm test
build:
	npx webpack --mode=production --node-env=production
serve:
	npx webpack serve
watch:
	npx webpack --watch

.PHONY: test