/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

'use strict';

var make = require('../../neumake'), DataReader = require('buffered-reader').DataReader, GetOpt = require('node-getopt');

var goal = 'all';
var max_number_of_jobs = 1;

var opts = new GetOpt([['j', '='], ['k']]).parseSystem();

if (opts.argv && (opts.argv.length > 0)) {
    goal = opts.argv[0];
}

var options = opts.options || {};

if (undefined === options.j) {
    options.j = 1;
}

var rules = {};
var current_rule = null;

function handle_line (line) {
    var i, j;

    if (current_rule) {
        if ('\t' === line.charAt(0)) {
            current_rule.recipe.push(line.substring(1));
            return;
        }
        else {
            for (i = 0; i < current_rule.targets.length; i++) {
                rules[current_rule.targets[i]].recipe = current_rule.recipe;
            }

            current_rule = null;
        }
    }

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

        current_rule = {
            targets: [],
            recipe: []
        };

        for (i = 0; i < targets.length; i++) {
            if (0 === targets[i].length) {
                continue;
            }

            if ('.PHONY' === targets[i]) {
                for (j = 0; j < prerequisites.length; j++) {
                    if (0 === prerequisites[j].length) {
                        continue;
                    }

                    rules[prerequisites[j]] = rules[prerequisites[j]] || {};
                    rules[prerequisites[j]].phony = true;
                }
            }
            else {
                current_rule.targets.push(targets[i]);

                rules[targets[i]] = rules[targets[i]] || {};
                rules[targets[i]].prerequisites = rules[targets[i]].prerequisites || [];

                for (j = 0; j < prerequisites.length; j++) {
                    if (0 === prerequisites[j].length) {
                        continue;
                    }

                    rules[targets[i]].prerequisites.push(prerequisites[j]);
                }
            }
        }

        if (0 === current_rule.targets.length) {
            current_rule = null;
        }

        return;
    }

    console.error('neumake: *** Unrecognized syntax: ' + line);
    process.exit(1);
}

function handle_end () {
    if (current_rule) {
        var i;

        for (i = 0; i < current_rule.targets.length; i++) {
            rules[current_rule.targets[i]].recipe = current_rule.recipe;
        }

        current_rule = null;
    }
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
    handle_end();

    /*
     * Get to work!
     */
    make.process(rules, goal, options, function (success) {
        process.exit(success ? 0 : 1);
    });
});

/*
 * Start line-by-line reading of the Makefile.
 */
reader.read();
