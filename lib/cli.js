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
    var hash_index = line.indexOf('#');
    if (hash_index >= 0) {
        line = line.substring(0, hash_index);
    }

    if (/^\s*$/.test(line)) {
        return;
    }

    var colon_index = line.indexOf(':');
    if (colon_index >= 0) {
        var targets = line.substring(0, colon_index).split(/\s+/);
        var prerequisites = line.substring(colon_index + 1).split(/\s+/);

        var i, j;
        for (i = 0; i < targets.length; i++) {
            if (0 === targets[i].length) {
                next;
            }

            if ('.PHONY' === targets[i]) {
                for (j = 0; j < prerequisites.length; j++) {
                    if (0 === prerequisites.length[j]) {
                        next;
                    }

                    rules[prerequisites[j]] = rules[prerequisites[j]] || {};
                    rules[prerequisites[j]].phony = true;
                }
            }
            else {
                rules[targets[i]] = rules[targets[i]] || {};
                rules[targets[i]].prerequisites = rules[targets[i]].prerequisites || [];

                for (j = 0; j < prerequisites.length; j++) {
                    if (0 === prerequisites.length[j]) {
                        next;
                    }

                    rules[targets[i]].prerequisites.push(prerequisites[j]);
                }
            }
        }
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
