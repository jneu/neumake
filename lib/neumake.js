/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

'use strict';

var fs = require('fs'), recipe_run = require('./recipe').run;

exports.process = function (rules, goal, options, callback) {
    /*
     * A marker object to designate targets currently being processed by live jobs.
     */
    var PROCESSING_MARKER = {};

    /*
     * Keep track of the targets that have already been processed, and those still running.
     */
    var processed_targets = {};

    /*
     * The number of live jobs.
     */
    var num_live_jobs = 0;

    /*
     * Process the next target. To keep the stack under control, call this function from
     * process.nextTick.
     */
    function step () {
        var next_target_name = find_next_target_to_process(goal);
        if (!next_target_name) {
            /*
             * There's nothing to do. We're done!
             */
            return callback(true);
        }
        else if (PROCESSING_MARKER === next_target_name) {
            /*
             * There's nothing to do but wait until the current jobs finish.
             */
            return;
        }

        /*
         * Claim a jobs slot.
         */
        num_live_jobs++;
        processed_targets[next_target_name] = PROCESSING_MARKER;

        /*
         * Choose how to process the target, depending on whether or not we have explicit rules.
         */
        if (rules[next_target_name]) {
            process_target(next_target_name);
        }
        else {
            process_simple_target(next_target_name);
        }

        /*
         * If we have jobs slots available, run again.
         */
        if (num_live_jobs < options.j) {
            process.nextTick(step);
        }
    }

    /*
     * Given the name of a target, find the name of the first target to process that has not already
     * been processed. This will return the input target if all prerequisites have been processed.
     * If the input target has already been processed, false is returned. If no target is available
     * and the input target or any of its prerequisites are being processed by other jobs, the
     * PROCESSING_MARKER is returned.
     */
    function find_next_target_to_process (target_name) {
        if (PROCESSING_MARKER === processed_targets[target_name]) {
            return PROCESSING_MARKER;
        }

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

        var has_processing_children = false;

        var i;
        for (i = 0; i < prereqs.length; i++) {
            var next_target = find_next_target_to_process(prereqs[i]);
            if (PROCESSING_MARKER === next_target) {
                has_processing_children = true;
            }
            else if (next_target) {
                return next_target;
            }
        }

        if (has_processing_children) {
            return PROCESSING_MARKER;
        }

        return target_name;
    }

    /*
     * When running more than one job, we need to keep track of any failures.
     */
    var already_got_an_error = false;

    /*
     * Helper function to handle running the next step.
     */
    function next_step (success) {
        num_live_jobs--;

        if (already_got_an_error) {
            if (success) {
                processed_targets[target_name] = true;
            }
            else {
                delete processed_targets[target_name];
            }

            if (0 == num_live_jobs) {
                callback(false);
            }
        }
        else {
            if (success) {
                processed_targets[target_name] = true;
                process.nextTick(step);
            }
            else {
                got_an_error = true;
                delete processed_targets[target_name];

                if (0 == num_live_jobs) {
                    callback(false);
                }
            }
        }
    }

    /*
     * Handle a target which exists in the rules.
     */
    function process_target (target_name) {
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
            if (!exists) {
                console.error('neumake: *** Required target `' + target_name + '\' not found.');
            }

            next_step(exists);
        });
    }

    /*
     * Start stepping.
     */
    process.nextTick(step);
};
