/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

var make = require('../../neumake'), DataReader = require('buffered-reader').DataReader;

/*
 * Check for a goal passed on the command line. If none, default to 'all'.
 */
var goal = 'all';
if (process.argv.length > 2) {
    goal = process.argv[2];
}

var rules = {};

function handle_line (line) {
    if (/^\s*$/.test(line)) {
        return;
    }
    
    var colon_index = line.indexOf(':');
    if (colon_index >= 0) {
        var targets = line.substring(0, colon_index).split(/\s+/);
        var prerequisites = line.substring(colon_index + 1).split(/\s+/);
    }

    console.error('neumake: *** Unrecognized syntax: ' + line);
    process.exit(1);
}

/*
 * Create a DataReader and hook up the event handlers.
 */

var reader = new DataReader('Makefile', {
    encoding: 'utf8'
});

reader.on('error', function (error) {
    console.error('neumake: *** ' + error);
    process.exit(1);
});

reader.on('line', function (line, next_byte_offset) {
    handle_line(line);
});

reader.on('end', function () {
    /*
     * Get to work!
     */
    make.process(rules, goal, function (success) {
        process.exit(success ? 0 : 1);
    });
});

/*
 * Start line-by-line reading of the Makefile.
 */
reader.read();

/*
 * all: main
 * 
 * main: main.o gcc main.o -o main
 * 
 * main.o: main.c gcc -c main.c -o main.o
 * 
 * .PHONY: clean clean: rm -f main rm -f main.o
 * 
 * var rules = { 'all': { prerequisites: ['main'], phony: true }, 'main': { prerequisites:
 * ['main.o'], recipe: ['gcc main.o -o main'] }, 'main.o': { prerequisites: ['main.c'], recipe:
 * ['gcc -c main.c -o main.o'] }, 'clean': { phony: true, recipe: ['rm -f main', 'rm -f main.o'] } };
 */
