/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

'use strict';

var spawn = require('child_process').spawn;

/*
 * Run each command in a given recipe array. Stop at the first error.
 */
exports.run = function (target_name, recipe, callback) {
    function run_recipe_line (i) {
        /*
         * Did we run all the recipe lines?
         */
        if (i >= recipe.length) {
            return callback(true);
        }

        /*
         * Echo the recipe line.
         */
        console.log(recipe[i]);

        /*
         * Spawn the child shell to do the real work.
         */
        var child = spawn('/bin/sh', ['-c', recipe[i]], {
            env: process.env,
            stdio: ['ignore', process.stdout, process.stderr]
        });

        /*
         * On exit, check for errors. If none, run the next recipe line.
         */
        child.on('close',
                function (code, signal) {
                    if (signal) {
                        console.error('neumake: *** [' + target_name + '] Terminated by signal: '
                                + signal);
                        callback(false);
                    }
                    else if (0 === code) {
                        run_recipe_line(i + 1);
                    }
                    else {
                        console.error('neumake: *** [' + target_name + '] Error ' + code);
                        callback(false);
                    }
                });
    }

    run_recipe_line(0);
};
