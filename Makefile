all: build test

build:
	# Compile .coffee to .js
	coffee -o lib -c .
	pegjs grammar.peg
	cp grammar.js lib/

test:
	coffee tests/sub_command.coffee

objing: build
	coffee tests/objing.coffee
