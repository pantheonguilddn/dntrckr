# Pantheon Tools v1.6.9-r37

## Overview restoration

- Fixed the Overview assembly order introduced in r36. The Guild Hub hero is now attached to the Overview DOM before the detached Card Background selector, summary metrics, and Overview content section are inserted after it.
- Restores the Overview summary metrics, Activity Insights carousel, and Character Completion section.
- Keeps the Card Background selector on its own row directly below the Guild Hub card, without covering the emblem.
- Retains the feathered Pantheon emblem artwork, theme treatments, and locally saved background selection.

## Preservation

This is a front-end DOM insertion-order correction plus release metadata/documentation. The D1 schema, Pages Functions/backend, authentication, synchronization, and historical Tracker data are unchanged. No database migration or browser-storage clearing is required.
