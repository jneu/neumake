var fs = require('fs'), child_process = require('child_process');

exports.process = function (rules, goal, callback) {
    /*
     * Ensure we have sensible defaults.
     */
    callback = callback || function (success) {
        process.exit(success ? 0 : 1);
    };

    /*
     * Start processing the next target.
     */
    function step () {
        var next_target_name = find_next_target_to_process(goal);
        if (!next_target_name) {
            return callback(true);
        }

        var next_target = rules[next_target_name];
        if (next_target) {
            process_target(next_target_name);
        }
        else {
            /*
             * As a special case, process a target with no recipe or prerequisites.
             */
            process_simple_target(next_target_name);
        }
    }

    var processed_targets = {};

    /*
     * Given the name of a target, find the name of the first target to process that has not already
     * been processed. This will return the original target if all prerequisites have been
     * processed. If all targets have been processed, an empty string is returned.
     */
    function find_next_target_to_process (target_name) {
        if (processed_targets[target_name]) {
            return "";
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
     * If the target is not phony, only remake it if it doesn't exist or if it is older than its
     * prerequisites.
     */
    function process_target (target_name) {
        var target = rules[target_name];

        /*
         * If the target is phony, just run the recipe.
         */
        if (target.phony) {
            return process_recipe(target_name);
        }

        /*
         * Get the last modified time on the target. If there are any errors (e.g., it doesn't exit)
         * then run the recipe.
         */
        fs.stat(target_name, function (err, stats) {
            if (err) {
                process_recipe(target_name);
            }
            else {
                /*
                 * If any non-phony prereqs are newer, then run the recipe. Otherwise, mark the
                 * target as processed.
                 */

                var target_time = stats.mtime.getTime();

                var to_check = [], i;
                for (i = 0; i < target.prerequisites.length; i++) {
                    var prereq = target.prerequisites[i];
                    if (!rules[prereq] || !rules[prereq].phony) {
                        to_check.push(prereq);
                    }
                }

                function check_prereq () {
                    if (to_check.length > 0) {
                        var next_prereq = to_check.pop();

                        fs.stat(next_prereq, function (err, stats) {
                            if (err) {
                                console.error('*** stat failed for target "' + next_prereq + '".');
                                callback(false);
                            }
                            else {
                                if (stats.mtime.getTime() > target_time) {
                                    process_recipe(target_name);
                                }
                                else {
                                    check_prereq();
                                }
                            }
                        });
                    }
                    else {
                        processed_targets[target_name] = true;
                        step();
                    }
                }

                check_prereq();
            }
        });
    }

    /*
     * If there is no rule for a target, assume it's a file and check that it exists.
     */
    function process_simple_target (target_name) {
        fs.exists(target_name, function (exists) {
            if (exists) {
                processed_targets[target_name] = true;
                step();
            }
            else {
                console.error('*** Required target "' + target_name
                        + '" does not exist and no recipe is found to make it.');
                callback(false);
            }
        });
    }

    function process_recipe (target_name) {
        var target = rules[target_name];

        if (target.recipe) {
            function run_recipe_line (recipe, i) {
                if (i >= recipe.length) {
                    processed_targets[target_name] = true;
                    step();
                }
                else {
                    console.log(recipe[i]);

                    var child = child_process.spawn('/bin/sh', ['-c', recipe[i]], {
                        env: process.env,
                        stdio: 'inherit'
                    });

                    child.on('close', function (code, signal) {
                        if (0 == code) {
                            run_recipe_line(recipe, i + 1);
                        }
                        else {
                            console.error('*** Child process returned code: ' + code + '.');
                            callback(false);
                        }
                    });
                }
            }

            return run_recipe_line(target.recipe, 0);
        }

        processed_targets[target_name] = true;
        step();
    }

    /*
     * Start stepping.
     */
    process.nextTick(step);
};
