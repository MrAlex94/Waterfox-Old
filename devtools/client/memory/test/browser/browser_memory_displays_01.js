/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/**
 * Tests that the heap tree renders rows based on the display
 */

const TEST_URL = "http://example.com/browser/devtools/client/memory/test/browser/doc_steady_allocation.html";

this.test = makeMemoryTest(TEST_URL, function* ({ tab, panel }) {
  const { gStore, document } = panel.panelWin;

  function $$(selector) {
    return [...document.querySelectorAll(selector)];
  }

  yield takeSnapshot(panel.panelWin);

  yield waitUntilState(gStore, state =>
    state.snapshots[0].state === states.SAVED_CENSUS);

  info("Check coarse type heap view");
  ["Function", "js::Shape", "Object", "strings"].forEach(findNameCell);

  yield setCensusDisplay(panel.panelWin, censusDisplays.allocationStack);
  info("Check allocation stack heap view");
  [L10N.getStr("tree-item.nostack")].forEach(findNameCell);

  function findNameCell(name) {
    const el = $$(".tree .heap-tree-item-name span")
      .find(e => e.textContent === name);
    ok(el, `Found heap tree item cell for ${name}.`);
  }
});