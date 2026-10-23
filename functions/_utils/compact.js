const MARKER = '__pantheonCompactV1';
const KEY_MAP = Object.freeze({
  "schemaVersion": "~a",
  "cells": "~b",
  "history": "~c",
  "weeklyArchive": "~d",
  "lastDailyReset": "~e",
  "lastWeeklyReset": "~f",
  "updatedAt": "~g",
  "syncInfo": "~h",
  "operationId": "~i",
  "settings": "~j",
  "lootWeights": "~k",
  "lootWeightUpdatedAt": "~l",
  "rosters": "~m",
  "rosterUpdatedAt": "~n",
  "rosterUpdatedBy": "~o",
  "memberDirectory": "~p",
  "memberDirectoryUpdatedAt": "~q",
  "memberDirectoryUpdatedBy": "~r",
  "categories": "~s",
  "categoriesUpdatedAt": "~t",
  "categoriesUpdatedBy": "~u",
  "characterJobs": "~v",
  "jobProfiles": "~w",
  "jobProfilesUpdatedAt": "~x",
  "jobProfilesUpdatedBy": "~y",
  "teamBuilder": "~z",
  "analyticsTrackingEnabled": "~aa",
  "analyticsTrackingUpdatedAt": "~ab",
  "analyticsTrackingUpdatedBy": "~ac",
  "analyticsHistoryClearedAt": "~ad",
  "analyticsHistoryClearedBy": "~ae",
  "versionControl": "~A",
  "lastCheckpointAt": "~B",
  "lastCheckpointBy": "~C",
  "lastCheckpointLabel": "~D",
  "lastCheckpointKind": "~E",
  "lastVersionedWriteAt": "~F",
  "lastGlobalSignature": "~G",
  "globalBaselineSignature": "~H",
  "revisionBinId": "~I",
  "revisionBinUpdatedAt": "~J",
  "revisionBinUpdatedBy": "~K",
  "versioningEnabled": "~L",
  "state": "~M",
  "note": "~N",
  "deviceId": "~O",
  "createdAt": "~P",
  "taskOrder": "~Q",
  "rates": "~R",
  "states": "~S",
  "scholarship": "~T",
  "logs": "~U",
  "timestamp": "~V",
  "type": "~W",
  "gold": "~X",
  "dia": "~Y",
  "eol": "~Z",
  "deleted": "~0",
  "characters": "~1",
  "name": "~2",
  "color": "~3",
  "group": "~4",
  "tasks": "~5",
  "owner": "~6",
  "formatUpdatedAt": "~7",
  "splitPartyUpdatedAt": "~8",
  "splitPartyMechanic": "~9",
  "slots": "~!",
  "character": "~@",
  "runType": "~#",
  "runTypeUpdatedAt": "~$",
  "runTypeUpdatedBy": "~%",
  "formatUpdatedBy": "~^",
  "splitPartyUpdatedBy": "~&",
  "updatedBy": "~*",
  "lastSeenAt": "~(",
  "lastSeenBy": "~)",
  "value": "~_",
  "logsUpdatedAt": "~+",
  "logsUpdatedBy": "~=",
  "memberRosterMasterVersion": "~af",
  "trackerRosterId": "~ag",
  "characterProfiles": "~ah",
  "trackerEnabled": "~ai",
  "job": "~aj"
});
const REVERSE = Object.freeze(Object.fromEntries(Object.entries(KEY_MAP).map(([key, alias]) => [alias, key])));
const CELL_STATES = ['open', 'done', 'excluded', 'marked', 'reset'];
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function decodePantheonCompactRecord(record) {
  if (!record || typeof record !== 'object' || record[MARKER] !== 1) return record;
  return decodeValue(record.payload || {}, '', Array.isArray(record.devices) ? record.devices : ['']);
}
function decodeValue(value, parentKey = '', devices = ['']) {
  if (Array.isArray(value)) return value.map(item => decodeValue(item, '', devices));
  if (!value || typeof value !== 'object') return value;
  if (parentKey === 'cells') {
    const cells = {};
    for (const [char, tasks] of Object.entries(value)) {
      const restored = {};
      for (const [task, cell] of Object.entries(obj(tasks))) {
        if (Array.isArray(cell)) {
          restored[task] = { state: CELL_STATES[Number(cell[0]) ] || 'open', note: String(cell[1] || ''), updatedAt: Number(cell[2]) || 0, deviceId: String(devices[Number(cell[3]) || 0] || '') };
        } else restored[task] = decodeValue(cell, '', devices);
      }
      cells[char] = restored;
    }
    return cells;
  }
  const out = {};
  for (const [wireKey, child] of Object.entries(value)) {
    const key = REVERSE[wireKey] || wireKey;
    out[key] = decodeValue(child, key, devices);
  }
  return out;
}
export function encodePantheonCompactRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('Invalid Pantheon record.');
  const devices = [''];
  const seen = new Set(devices);
  for (const tasks of Object.values(obj(record.cells))) for (const cell of Object.values(obj(tasks))) {
    const id = String(cell?.deviceId || '');
    if (!seen.has(id)) { seen.add(id); devices.push(id); }
  }
  const indexes = new Map(devices.map((id, index) => [id, index]));
  return { [MARKER]: 1, devices, payload: encodeValue(record, '', indexes) };
}
function encodeValue(value, parentKey = '', indexes = new Map()) {
  if (Array.isArray(value)) return value.map(item => encodeValue(item, '', indexes));
  if (!value || typeof value !== 'object') return value;
  if (parentKey === 'cells') {
    const compact = {};
    for (const [char, tasks] of Object.entries(value)) {
      compact[char] = {};
      for (const [task, cell] of Object.entries(obj(tasks))) {
        const state = ['open','done','excluded','marked','reset'].includes(cell?.state) ? cell.state : 'open';
        compact[char][task] = [Math.max(0, CELL_STATES.indexOf(state)), String(cell?.note || ''), Number(cell?.updatedAt) || 0, indexes.get(String(cell?.deviceId || '')) || 0];
      }
    }
    return compact;
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) out[KEY_MAP[key] || key] = encodeValue(child, key, indexes);
  return out;
}
