all: build test

build:
	pegjs grammar.peg parser.js

test:
	coffee tests/sub_command.coffee

objing: build
	coffee tests/objing.coffee
