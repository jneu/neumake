neumake
=======
The [make build utility](http://www.gnu.org/software/make/), written in node.js.

License
-------
[neumake](https://github.com/jneu/neumake/) is released under an MIT style license. Details are in the file [LICENSE.txt](https://raw.github.com/jneu/neumake/master/LICENSE.txt).

Install
-------
`npm install neumake`

Usage
-----
`neumake [-j<max number of jobs>] [-k] <goal>`  
Search the current directory for a file named Makefile. This file is read for rules which describe targets, their dependencies, and recipes to process.

Specifying `-j` followed by a number designates the maximum number of jobs to run simultaneously. The default is `-j1`.

By default, neumake exits on the first failed recipe. Specifying `-k` directs neumake to continue processing targets as long as possible despite errors.

On success, 0 is returned. On failure, 1 is returned.

Status
------
The [test](https://github.com/jneu/neumake/tree/master/test) directory contains an example Makefile which neumake successfully processes. However, neumake is not feature complete yet. Variables are not currently supported.
