#!/bin/bash

#
# Handle all errors
#

set -e

#
# Create a test executable and clear out old tests
#

[[ -a neumake ]] || ln -s ../bin/cli.js neumake

BASEDIR=TESTS
rm -rf $BASEDIR

#
# Tests
#

function test_no_makefile {
	local TESTDIR="$BASEDIR/test_no_makefile"
	mkdir -p $TESTDIR
	(cd $TESTDIR && if ../../neumake 1>/dev/null 2>&1; then exit 1; fi)
	rm -rf $TESTDIR
}

function test_empty {
	local TESTDIR="$BASEDIR/test_empty"
	mkdir -p $TESTDIR
	cat /dev/null > $TESTDIR/Makefile
	(cd $TESTDIR && if ../../neumake 1>/dev/null 2>&1; then exit 1; fi)
	rm -rf $TESTDIR
}

function test_simple {
	local TESTDIR="$BASEDIR/test_simple"
	mkdir -p $TESTDIR
	echo "all:" > $TESTDIR/Makefile
	(cd $TESTDIR && ../../neumake 1>/dev/null 2>&1)
	rm -rf $TESTDIR
}

function test_basic {
	local TESTDIR="$BASEDIR/test_simple"
	mkdir -p $TESTDIR
	cp Makefile_basic $TESTDIR/Makefile
	cp func_basic.c $TESTDIR/func.c
	cp main_basic.c $TESTDIR/main.c
	(cd $TESTDIR && ../../neumake 1>/dev/null 2>&1)
	(cd $TESTDIR && ../../neumake clean 1>/dev/null 2>&1)
	(cd $TESTDIR && ../../neumake all 1>/dev/null 2>&1)
	(cd $TESTDIR && ../../neumake clean 1>/dev/null 2>&1)
	rm -rf $TESTDIR
}

#
# Run them!
#

test_no_makefile
test_empty
test_simple
test_basic

#
# Clean up
#

rm -rf $BASEDIR
