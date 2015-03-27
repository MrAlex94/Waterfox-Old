/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Infrastructure for the mochitest-browser tests located in this folder.
 *
 * See "loader_common.js" in the parent folder for a general overview.
 *
 * Unless you are adding new features to the framework, you shouldn't have to
 * modify this file.  Use "head_common.js" or "head.js" for shared code.
 */

"use strict";

Services.scriptloader.loadSubScript(getRootDirectory(gTestPath) +
                                    "loader_common.js", this);

let ChromeUtils = {};
Services.scriptloader.loadSubScript(
  "chrome://mochikit/content/tests/SimpleTest/ChromeUtils.js", ChromeUtils);

// Define output functions so they look the same across all frameworks.
let Output = {
  print: info,
};

// Define assertion functions so they look the same across all frameworks.
let Assert = {
  ok: _mochitestAssert.ok,
  equal: _mochitestAssert.equal,
};

// Define task registration functions, see description in "loader_common.js".
let add_task_in_parent_process = add_task;
let add_task_in_child_process = function () {};
let add_task_in_both_processes = add_task;

Services.scriptloader.loadSubScript(getRootDirectory(gTestPath) +
                                    "head_common.js", this);

// Reminder: unless you are adding new features to the framework, you shouldn't
// have to modify this file.  Use "head_common.js" or "head.js" for shared code.