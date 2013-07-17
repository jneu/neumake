/*
 * Copyright (c) 2013 Joshua Neuheisel
 * This software is distributed under the license detailed in the file LICENSE.txt.
 */

var make = require('./neumake');

var rules = {
    'all': {
        prerequisites: ['main'],
        phony: true
    },
    'main': {
        prerequisites: ['main.o'],
        recipe: ['gcc main.o -o main']
    },
    'main.o': {
        prerequisites: ['main.c'],
        recipe: ['gcc -c main.c -o main.o']
    },
    'clean': {
        phony: true,
        recipe: ['rm -f main', 'rm -f main.o']
    }
};

make.process(rules, 'all');
