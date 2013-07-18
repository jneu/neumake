neumake
=======
The [make build utility](http://www.gnu.org/software/make/), written in node.js.

License
-------
[neumake](https://github.com/jneu/neumake/) is released under an MIT style license. Details are in the file [LICENSE.txt](https://raw.github.com/jneu/neumake/master/LICENSE.txt).

Status
======
Ultimately, neumake will be feature-rich enough to replace the standard make utility: `alias make='node neumake.js'`. Currently, the dependency engine and child process spawning are implemented. Next will come Makefile parsing, then `make -k` and `make -j2` support.

Known differences with GNU make
-------------------------------
1.	Failed targets are not pruned.
2.	Logging messages are different.
