/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

var fs = require('fs'), recipe_run = require('./recipe').run;

exports.process = function (rules, goal, callback) {
    /*
     * Process the next target.
     */
    function step () {
        var next_target_name = find_next_target_to_process(goal);
        if (!next_target_name) {
            return callback(true);
        }

        if (rules[next_target_name]) {
            process_target(next_target_name);
        }
        else {
            process_simple_target(next_target_name);
        }
    }

    /*
     * Keep track of the targets that have already been processed.
     */
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

    /*
     * Handle a target which exists in the rules.
     */
    function process_target (target_name) {
        /*
         * Helper function to handle running the next step.
         */
        function next_step (success) {
            if (success) {
                processed_targets[target_name] = true;
                step();
            }
            else {
                callback(false);
            }
        }

        /*
         * Pull the target rules.
         */
        var target = rules[target_name];

        /*
         * If the target has no recipe, consider it successfully run.
         */
        var recipe = target.recipe;
        if (!recipe || (0 === recipe.length)) {
            return next_step(true);
        }

        function run_recipe () {
            recipe_run(target_name, recipe, next_step);
        }

        /*
         * If the target if phony, always run the recipe.
         */
        if (target.phony) {
            return run_recipe();
        }

        /*
         * Check if the target exists on the file system. If not, run the recipe.
         */
        fs.stat(target_name, function (target_err, target_stats) {
            if (target_err) {
                return run_recipe();
            }

            /*
             * If the target exists and there are no prerequisites, we're done.
             */
            var prereqs = target.prerequisites;
            if (!prereqs || (0 === prereqs.length)) {
                return next_step(true);
            }

            /*
             * Check each of the prerequisites.
             */
            function check_prereq (i) {
                /*
                 * Did we check all the prerequisites?
                 */
                if (i >= prereqs.length) {
                    return next_step(true);
                }

                /*
                 * If the prerequisite is phony, run the recipe.
                 */
                if (rules[prereqs[i]] && rules[prereqs[i]].phony) {
                    return run_recipe();
                }

                /*
                 * Check the modified time on the recipe. If it's newer, run the recipe.
                 */
                fs.stat(prereqs[i], function (prereq_err, prereq_stats) {
                    if (prereq_err) {
                        run_recipe();
                    }
                    else if (prereq_stats.mtime.getTime() > target_stats.mtime.getTime()) {
                        run_recipe();
                    }
                    else {
                        check_prereq(i + 1);
                    }
                });
            }

            check_prereq(0);
        });
    }

    /*
     * If there is no rule for a target, just check that it exists.
     */
    function process_simple_target (target_name) {
        fs.exists(target_name, function (exists) {
            if (exists) {
                processed_targets[target_name] = true;
                step();
            }
            else {
                console.error('neumake: *** Required target `' + target_name + '\' not found.');
                callback(false);
            }
        });
    }

    /*
     * Start stepping.
     */
    process.nextTick(step);
};
