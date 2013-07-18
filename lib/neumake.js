/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

var fs = require('fs'), child_process = require('child_process');

exports.process = function (rules, goal, callback) {
    /*
     * Ensure we have sensible defaults.
     */
    callback = callback || function (success) {
        process.exit(success ? 0 : 1);
    };

    /*
     * Process the next target.
     */
    function step () {
        var next_target_name = find_next_target_to_process(goal);
        if (!next_target_name) {
            return callback(true);
        }

        if (rules[next_target_name]) {
            process_goal(next_target_name);
        }
        else {
            process_simple_goal(next_target_name);
        }
    }

    var processed_targets = {};

    /*
     * Given the name of a target, find the name of the first target to process that has not already
     * been processed. This will return the original target if all prerequisites have been
     * processed. If all targets have been processed, false is returned.
     */
    function find_next_target_to_process (target_name) {
        if (processed_targets[target_name]) {
            return false;
        }

        var target = rules[target_name];
        if (!target) {
            return target_name;
        }

        var prereqs = target.prerequisites;
        if (!prereqs) {
            return target_name;
        }

        var i;
        for (i = 0; i < prereqs.length; i++) {
            var next_target = find_next_target_to_process(prereqs[i]);
            if (next_target) {
                return next_target;
            }
        }

        return target_name;
    }

    function process_goal (target_name) {
        var target = rules[target_name];

        var recipe = target.recipe;
        if (!recipe || (0 === recipe.length)) {
            processed_targets[target_name] = true;
            return step();
        }

        function run_recipe_line (i) {
            console.log(recipe[i]);

            var child = child_process.spawn('/bin/sh', ['-c', recipe[i]], {
                env: process.env,
                stdio: 'inherit'
            });

            child.on('close', function (code, signal) {
                if (signal) {
                    console.log('neumake: *** [' + target_name + '] Terminated by signal: '
                            + signal);
                    callback(false);
                }
                else if (0 === code) {
                    if (i >= (recipe.length - 1)) {
                        processed_targets[target_name] = true;
                        step();
                    }
                    else {
                        run_recipe_line(i + 1);
                    }
                }
                else {
                    console.log('make: *** [' + target_name + '] Error ' + code);
                    callback(false);
                }
            });
        }

        /*
         * If the target if phony, always run the recipe.
         */
        if (target.phony) {
            return run_recipe_line(0);
        }

        fs.stat(target_name, function (target_err, target_stats) {
            if (target_err) {
                run_recipe_line(0);
            }
            else {
                var prereqs = target.prerequisites;

                if (!prereqs || (0 === prereqs.length)) {
                    processed_targets[target_name] = true;
                    step();
                }
                else {
                    function check_prereq (i) {
                        if (rules[prereqs[i]] && rules[prereqs[i]].phony) {
                            return run_recipe_line(0);
                        }

                        fs.stat(prereqs[i], function (prereq_err, prereq_stats) {
                            if (prereq_err) {
                                run_recipe_line(0);
                            }
                            else {
                                if (prereq_stats.mtime.getTime() > target_stats.mtime.getTime()) {
                                    run_recipe_line(0);
                                }
                                else {
                                    if (i >= (prereqs.length - 1)) {
                                        processed_targets[target_name] = true;
                                        step();
                                    }
                                    else {
                                        check_prereq(i + 1);
                                    }
                                }
                            }
                        });
                    }

                    check_prereq(0);
                }
            }
        });
    }

    /*
     * If there is no rule for a goal, just check that it exists.
     */
    function process_simple_goal (target_name) {
        fs.exists(target_name, function (exists) {
            if (exists) {
                processed_targets[target_name] = true;
                step();
            }
            else {
                console.log('neumake: *** Required target `' + target_name + '\' not found.');
                callback(false);
            }
        });
    }

    /*
     * Start stepping.
     */
    process.nextTick(step);
};
