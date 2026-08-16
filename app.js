const SAMPLE_FILES = [
  "../@Trader/extras/Trader/TraderConfig.txt",
  "../@Trader/extras/Trader/TraderConfig_Vehicles.txt",
  "../@Trader/extras/Trader/TraderConfig_Boats.txt",
  "../@Trader/extras/Trader/TraderObjects.txt",
  "../@Trader/extras/Trader/TraderVariables.txt",
  "../@Trader/extras/Trader/TraderVehicleParts.txt",
  "../@Trader/extras/Trader/TraderVehicleParts_Boats.txt",
  "../@Trader/extras/Trader/TraderAdmins.txt",
  "../@Trader/extras/Types/trader_types.xml"
];

const EXPECTED_TRADER_FILES = [
  {
    name: "TraderConfig.txt",
    severity: "error",
    reason: "основной файл категорий трейдера"
  },
  {
    name: "TraderObjects.txt",
    severity: "error",
    reason: "NPC, marker, safezone и spawn-точки"
  },
  {
    name: "TraderVariables.txt",
    severity: "warning",
    reason: "общие настройки Trader"
  },
  {
    name: "TraderConfig_Vehicles.txt",
    severity: "warning",
    reason: "отдельный конфиг машин, как в ванильном примере"
  },
  {
    name: "TraderVehicleParts.txt",
    severity: "warning",
    reason: "детали, которые ставятся на технику при покупке"
  }
];

const BUY_HINTS = {
  "*": "обычный предмет",
  "M": "магазин",
  "W": "оружие",
  "S": "мясо",
  "V": "техника с ключом",
  "VNK": "техника без ключа",
  "K": "дубликат ключа"
};

const VARIABLE_HINTS = {
  BuySellTimer: "Пауза между покупкой/продажей. Большие значения снижают риск лагов.",
  StatUpdateTimer: "Как часто Trader обновляет служебную статистику. Обычно 1.0 нормально.",
  FireBarrelUpdateTimer: "Как часто обновляются/проверяются бочки и связанные объекты трейдера.",
  ZombieCleanupTimer: "Интервал очистки зомби рядом с торговой зоной, если это поддерживает ваша версия Trader.",
  VehicleCleanupTimer: "Интервал очистки техники в зонах покупки/продажи.",
  SafezoneTimeout: "Сколько секунд игрок защищен после выхода из safezone.",
  SafezoneRemoveAnimals: "Удалять животных в safezone: yes/no.",
  SafezoneRemoveInfected: "Удалять зараженных в safezone: yes/no.",
  SafezoneRemoveEAI: "Удалять Expansion/Enfusion AI в safezone: yes/no.",
  SafezoneRemoveZombies: "Удалять зомби в safezone: yes/no.",
  TradingDistance: "Дистанция взаимодействия. Обычно 1.0-3.0.",
  VehicleSpawnDistance: "Дистанция проверки точки появления техники, если параметр есть в вашей версии Trader.",
  VehicleSpawnTimer: "Задержка/таймер появления техники, если параметр есть в вашей версии Trader."
};

const VARIABLE_LABELS = {
  BuySellTimer: "Пауза покупки/продажи",
  StatUpdateTimer: "Обновление статистики",
  FireBarrelUpdateTimer: "Обновление бочек",
  ZombieCleanupTimer: "Очистка зомби",
  VehicleCleanupTimer: "Очистка техники",
  SafezoneTimeout: "Таймаут safezone",
  SafezoneRemoveAnimals: "Удаление животных",
  SafezoneRemoveInfected: "Удаление зараженных",
  SafezoneRemoveEAI: "Удаление AI",
  SafezoneRemoveZombies: "Удаление зомби",
  TradingDistance: "Дистанция торговли",
  VehicleSpawnDistance: "Дистанция spawn техники",
  VehicleSpawnTimer: "Таймер spawn техники"
};

const SEVERITY_LABELS = {
  error: "ошибка",
  warning: "предупреждение",
  info: "информация"
};

const state = {
  files: new Map(),
  configFiles: [],
  traders: [],
  items: [],
  markers: [],
  vehicleParts: [],
  variables: [],
  currencies: [],
  openFiles: new Map(),
  fileEnds: new Map(),
  parseProblems: [],
  issues: [],
  changed: false,
  loadedWithHandles: false,
  rootHandle: null,
  isBatching: false,
  taskLog: [],
  ignoredUnsoldVehicleParts: new Set(),
  showRiskyOnly: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  loadIgnoredSettings();
  bindTabs();
  bindLoading();
  bindActions();
  renderGuide("start");
  renderAll();
});

function bindTabs() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-item").forEach((b) => b.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(`#tab-${btn.dataset.tab}`).classList.add("active");
      $("#pageTitle").textContent = btn.textContent;
    });
  });

  $$(".guide-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".guide-link").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderGuide(btn.dataset.guide);
    });
  });
}

function bindLoading() {
  $("#openFolderBtn").addEventListener("click", openFolder);
  $("#chooseFilesBtn").addEventListener("click", chooseFiles);
  $("#fileInput").addEventListener("change", (event) => loadFromFileList(event.target.files));
  $("#analyzeSampleBtn").addEventListener("click", loadSampleFiles);
  $("#runAnalysisBtn").addEventListener("click", reanalyzeLoadedFiles);

  const dropZone = $("#dropZone");
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
  dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag");
    await loadFromFileList(event.dataTransfer.files);
  });
}

function bindActions() {
  $("#itemSearch").addEventListener("input", renderItems);
  $("#traderFilter").addEventListener("change", renderItems);
  $("#fileFilter").addEventListener("change", renderItems);
  $("#normalizeIdsBtn").addEventListener("click", normalizeTraderIds);
  $("#sortByIdBtn").addEventListener("click", sortTradersById);
  $("#createVehicleTraderBtn").addEventListener("click", createVehicleTraderDialog);
  $("#moveVehicleCategoriesBtn").addEventListener("click", moveVehicleCategoriesToVehicleTrader);
  $("#markerSearch").addEventListener("input", renderMarkers);
  $("#vehicleSearch").addEventListener("input", renderVehicleParts);
  $("#addItemBtn").addEventListener("click", addItemDialog);
  $("#addTraderBtn").addEventListener("click", addTraderDialog);
  $("#addCategoryBtn").addEventListener("click", addCategoryDialog);
  $("#autoCategoryBtn").addEventListener("click", autoCategorizeItems);
  $("#moveVehiclesBtn").addEventListener("click", moveVehiclesToSeparateConfig);
  $("#removeDuplicatesBtn").addEventListener("click", removeDuplicateItems);
  $("#bulkPricesBtn").addEventListener("click", openBulkPricesDialog);
  $("#showRiskyBtn").addEventListener("click", toggleRiskyOnly);
  $("#fixVisibleSellBtn").addEventListener("click", fixVisibleResale);
  $("#sellHalfVisibleBtn").addEventListener("click", sellHalfVisible);
  $("#roundVisibleBtn").addEventListener("click", roundVisiblePrices);
  $("#addMarkerBtn").addEventListener("click", addMarkerDialog);
  $("#addVehiclePartsBtn").addEventListener("click", addVehiclePartsDialog);
  $("#createMissingPartsBtn").addEventListener("click", createMissingVehicleParts);
  $("#ignoreUnsoldPartsBtn").addEventListener("click", ignoreAllUnsoldVehicleParts);
  $("#saveBtn").addEventListener("click", saveFiles);
  $("#downloadBtn").addEventListener("click", downloadFiles);
  $("#fixSafeBtn").addEventListener("click", applySafeFixes);
  $("#copyReportBtn").addEventListener("click", copyIssueReport);
  $("#downloadReportBtn").addEventListener("click", downloadIssueReport);
}

async function openFolder() {
  if (!window.showDirectoryPicker) {
    $("#fileInput").click();
    return;
  }

  try {
    const root = await window.showDirectoryPicker({ mode: "readwrite" });
    const loaded = [];
    await walkDirectory(root, "", loaded);
    setLoadedFiles(loaded, true, root);
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`Не удалось открыть папку: ${error.message}`);
    }
  }
}

async function walkDirectory(handle, prefix, loaded) {
  for await (const [name, child] of handle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (child.kind === "directory") {
      await walkDirectory(child, path, loaded);
    } else if (isRelevantFile(name)) {
      const file = await child.getFile();
      loaded.push({
        name,
        path,
        text: await file.text(),
        handle: child
      });
    }
  }
}

function chooseFiles() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".txt,.xml,.cpp";
  input.addEventListener("change", () => loadFromFileList(input.files));
  input.click();
}

async function loadFromFileList(fileList) {
  const loaded = [];
  for (const file of fileList) {
    if (!isRelevantFile(file.name)) continue;
    loaded.push({
      name: file.name,
      path: file.webkitRelativePath || file.name,
      text: await file.text(),
      handle: null
    });
  }
  setLoadedFiles(loaded, false, null);
}

async function loadSampleFiles() {
  const loaded = [];
  for (const url of SAMPLE_FILES) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const text = await response.text();
      loaded.push({
        name: url.split("/").pop(),
        path: url.replace("../@Trader/", "@Trader/"),
        text,
        handle: null
      });
    } catch (error) {
      setStatus("Пример не открылся. Запустите программу через локальный сервер или выберите папку вручную.");
      return;
    }
  }
  setLoadedFiles(loaded, false, null);
}

function isRelevantFile(name) {
  return /\.(txt|xml|cpp)$/i.test(name);
}

function loadIgnoredSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("traderToolIgnoredUnsoldVehicleParts") || "[]");
    state.ignoredUnsoldVehicleParts = new Set(saved.map((item) => String(item).toLowerCase()));
  } catch (error) {
    state.ignoredUnsoldVehicleParts = new Set();
  }
}

function saveIgnoredSettings() {
  try {
    localStorage.setItem("traderToolIgnoredUnsoldVehicleParts", JSON.stringify([...state.ignoredUnsoldVehicleParts]));
  } catch (error) {
    // Ignore storage errors; the current session still keeps the marks.
  }
}

function setLoadedFiles(loaded, hasHandles, rootHandle = null) {
  resetTaskLog("Загрузка файлов");
  state.files.clear();
  for (const file of loaded) {
    state.files.set(file.name, file);
  }
  state.loadedWithHandles = hasHandles;
  state.rootHandle = rootHandle;
  addTaskLog(`Загружено файлов: ${loaded.length}.`);
  analyzeLoadedFiles();
}

function reanalyzeLoadedFiles() {
  const hadChanges = state.changed;
  if (hadChanges) {
    commitOutputToFileTexts();
    addTaskLog("Несохраненные правки перенесены в текст файлов перед повторной проверкой.");
  }
  analyzeLoadedFiles({ preserveChanged: hadChanges });
  if (hadChanges) {
    setStatus("Проверка выполнена. Есть несохраненные изменения.");
  }
}

function analyzeLoadedFiles(options = {}) {
  const preserveChanged = Boolean(options.preserveChanged);
  updateTaskProgress(0, 4);
  addTaskLog("Разбор TraderConfig и цепочки OpenFile.");
  resetParsedState();
  const orderedConfigFiles = getConfigOrder();
  let traderId = 0;

  for (const fileName of orderedConfigFiles) {
    const file = state.files.get(fileName);
    if (!file) continue;
    const parsed = parseTraderConfig(fileName, file.text, traderId);
    traderId = parsed.nextTraderId;
    state.configFiles.push(fileName);
  }

  updateTaskProgress(1, 4);
  addTaskLog("Разбор TraderObjects, TraderVariables и VehicleParts.");

  if (state.files.has("TraderObjects.txt")) {
    state.markers = parseTraderObjects(state.files.get("TraderObjects.txt").text);
  }

  if (state.files.has("TraderVariables.txt")) {
    state.variables = parseVariables(state.files.get("TraderVariables.txt").text);
  }

  for (const file of state.files.values()) {
    if (/^TraderVehicleParts.*\.txt$/i.test(file.name)) {
      state.vehicleParts.push(...parseVehicleParts(file.name, file.text));
    }
  }

  updateTaskProgress(2, 4);
  addTaskLog("Поиск ошибок, предупреждений и доступных исправлений.");
  state.issues = findIssues();
  const counts = issueCounts();
  updateTaskProgress(3, 4);
  state.changed = preserveChanged;
  renderAll();
  updateTaskProgress(4, 4);
  addTaskLog(`Проверка завершена: трейдеров ${state.traders.length}, товаров ${state.items.length}, ошибок ${counts.error}, предупреждений ${counts.warning}, информации ${counts.info}.`);
  setStatus(`${state.files.size} файлов загружено и проверено.`);
}

function resetParsedState() {
  state.configFiles = [];
  state.traders = [];
  state.items = [];
  state.markers = [];
  state.vehicleParts = [];
  state.variables = [];
  state.currencies = [];
  state.currencyName = "";
  state.openFiles = new Map();
  state.fileEnds = new Map();
  state.parseProblems = [];
  state.issues = [];
}

function getConfigOrder() {
  const names = [...state.files.keys()];
  const configNames = names.filter((name) =>
    /^TraderConfig.*\.txt$/i.test(name) &&
    !/VehicleParts|Objects|Variables|Admins/i.test(name)
  );

  if (!state.files.has("TraderConfig.txt")) {
    return configNames.sort();
  }

  const result = [];
  const seen = new Set();
  const visit = (name) => {
    if (!state.files.has(name) || seen.has(name)) return;
    seen.add(name);
    result.push(name);
    const links = scanOpenFiles(state.files.get(name).text);
    for (const link of links) visit(link);
  };

  visit("TraderConfig.txt");
  for (const name of configNames.sort()) visit(name);
  return result;
}

function scanOpenFiles(text) {
  const links = [];
  for (const line of text.split(/\r?\n/)) {
    const clean = stripComment(line).trim();
    const match = clean.match(/^<OpenFile>\s+(.+)$/i);
    if (match) links.push(match[1].trim());
  }
  return links;
}

function parseTraderConfig(fileName, text, startTraderId) {
  const lines = text.split(/\r?\n/);
  let currentTrader = null;
  let currentCategory = null;
  let traderId = startTraderId;
  state.fileEnds.set(fileName, null);

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const clean = stripComment(line).trim();
    if (/\/\*|\*\//.test(clean)) {
      state.parseProblems.push(issue("error", fileName, lineNo, "Многострочный комментарий", "Trader поддерживает только `//`. Удалите `/* */`, иначе сервер может упасть."));
    }
    if (!clean) return;

    const tag = parseTag(clean);
    if (tag) {
      const key = tag.key.toLowerCase();
      if (key === "currencyname") {
        state.currencyName = tag.value;
      } else if (key === "currency") {
        const parts = splitCsv(tag.value);
        if (parts.length >= 2) state.currencies.push({ className: parts[0], value: numberOrText(parts[1]), fileName, lineNo });
      } else if (key === "trader") {
        currentTrader = {
          id: traderId++,
          name: tag.value || `Trader ${traderId}`,
          fileName,
          lineNo,
          categories: []
        };
        state.traders.push(currentTrader);
        currentCategory = null;
      } else if (key === "category") {
        if (!currentTrader) {
          state.parseProblems.push(issue("error", fileName, lineNo, "Категория без трейдера", "Перед `<Category>` должен быть `<Trader>`."));
          return;
        }
        currentCategory = {
          name: tag.value || "New Category",
          fileName,
          lineNo,
          traderId: currentTrader.id,
          items: []
        };
        currentTrader.categories.push(currentCategory);
      } else if (key === "openfile") {
        const list = state.openFiles.get(fileName) || [];
        list.push(tag.value);
        state.openFiles.set(fileName, list);
      } else if (key === "fileend") {
        state.fileEnds.set(fileName, lineNo);
      }
      return;
    }

    if (!currentTrader || !currentCategory) return;
    const parts = splitCsv(clean);
    if (parts.length < 4) {
      if (clean.includes(",")) {
        state.parseProblems.push(issue("error", fileName, lineNo, "Неполная строка товара", "Нужно 4 поля: Classname, Quantity, Buyvalue, Sellvalue."));
      }
      return;
    }

    const item = {
      id: cryptoId(),
      traderId: currentTrader.id,
      traderName: currentTrader.name,
      category: currentCategory.name,
      className: parts[0],
      quantity: parts[1],
      buyPrice: normalizePrice(parts[2]),
      sellPrice: normalizePrice(parts[3]),
      fileName,
      lineNo,
      raw: line
    };
    currentCategory.items.push(item);
    state.items.push(item);
  });

  return { nextTraderId: traderId };
}

function parseTraderObjects(text) {
  const markers = [];
  const objects = [];
  const lines = text.split(/\r?\n/);
  let marker = null;
  let currentObject = null;

  const closeObject = (endLine) => {
    if (currentObject) {
      currentObject.lineEnd = endLine;
      objects.push(currentObject);
      currentObject = null;
    }
  };

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const clean = stripComment(line).trim();
    if (!clean) return;
    const tag = parseTag(clean);
    if (!tag) return;
    const key = tag.key.toLowerCase();

    if (key === "tradermarker") {
      closeObject(index);
      marker = {
        id: asInt(tag.value),
        npc: "",
        position: "",
        safezone: "",
        orientation: "",
        vehicleSpawn: "",
        vehicleSpawnOri: "",
        attachments: [],
        lineStart: lineNo,
        lineEnd: lineNo,
        objectLineStart: null,
        objectLineEnd: null,
        hasInlineObject: false,
        refs: { TraderMarker: lineNo }
      };
      markers.push(marker);
      return;
    }

    if (key === "object") {
      closeObject(index);
      const inlineMarker = marker && lineNo - marker.lineEnd <= 1 ? marker : null;
      currentObject = {
        npc: tag.value.trim(),
        position: "",
        orientation: "",
        attachments: [],
        lineStart: lineNo,
        lineEnd: lineNo,
        inlineMarkerStart: inlineMarker?.lineStart || null,
        refs: { Object: lineNo }
      };
      if (inlineMarker) {
        inlineMarker.hasInlineObject = true;
        inlineMarker.npc = currentObject.npc;
        inlineMarker.objectLineStart = lineNo;
        inlineMarker.refs.Object = lineNo;
        inlineMarker.lineEnd = lineNo;
      } else {
        marker = null;
      }
      return;
    }

    if (currentObject) {
      currentObject.lineEnd = lineNo;
      const inlineMarker = currentObject.inlineMarkerStart
        ? markers.find((entry) => entry.lineStart === currentObject.inlineMarkerStart)
        : null;
      if (key === "objectposition") {
        currentObject.position = normalizeVector(tag.value);
        currentObject.refs.ObjectPosition = lineNo;
        if (inlineMarker) {
          inlineMarker.objectPosition = currentObject.position;
          inlineMarker.refs.ObjectPosition = lineNo;
        }
      } else if (key === "objectorientation") {
        currentObject.orientation = normalizeVector(tag.value);
        currentObject.refs.ObjectOrientation = lineNo;
        if (inlineMarker) {
          inlineMarker.orientation = currentObject.orientation;
          inlineMarker.refs.ObjectOrientation = lineNo;
        }
      } else if (key === "objectattachment") {
        currentObject.attachments.push(tag.value.trim());
        if (inlineMarker) inlineMarker.attachments.push(tag.value.trim());
      } else if (key === "vehiclespawn" && inlineMarker) {
        inlineMarker.vehicleSpawn = normalizeVector(tag.value);
        inlineMarker.refs.VehicleSpawn = lineNo;
      } else if (key === "vehiclespawnori" && inlineMarker) {
        inlineMarker.vehicleSpawnOri = normalizeVector(tag.value);
        inlineMarker.refs.VehicleSpawnOri = lineNo;
      }
      if (inlineMarker) {
        inlineMarker.lineEnd = lineNo;
        inlineMarker.objectLineEnd = lineNo;
      }
      return;
    }

    if (!marker) return;
    if (key === "tradermarkerposition") {
      marker.lineEnd = lineNo;
      marker.position = normalizeVector(tag.value);
      marker.refs.TraderMarkerPosition = lineNo;
    } else if (key === "tradermarkersafezone") {
      marker.lineEnd = lineNo;
      marker.safezone = tag.value.trim();
      marker.refs.TraderMarkerSafezone = lineNo;
    } else if (key === "vehiclespawn") {
      marker.lineEnd = lineNo;
      marker.vehicleSpawn = normalizeVector(tag.value);
      marker.refs.VehicleSpawn = lineNo;
    } else if (key === "vehiclespawnori") {
      marker.lineEnd = lineNo;
      marker.vehicleSpawnOri = normalizeVector(tag.value);
      marker.refs.VehicleSpawnOri = lineNo;
    }
  });

  closeObject(lines.length);
  attachObjectsToMarkers(markers, objects);
  return markers;
}

function attachObjectsToMarkers(markers, objects) {
  const used = new Set();
  const traderObjects = objects.filter((object) => isTraderSpawnObject(object));
  const candidates = traderObjects.length ? traderObjects : objects;

  for (const marker of markers) {
    if (marker.objectPosition) continue;
    let match = candidates.find((object) => !used.has(object) && object.position && object.position === marker.position);
    if (!match) {
      const nearest = nearestObjectByPosition(marker.position, candidates.filter((object) => !used.has(object)));
      if (nearest && nearest.distance <= 2.5) match = nearest.object;
    }
    if (!match) continue;
    used.add(match);
    marker.npc = match.npc;
    marker.objectPosition = match.position;
    marker.orientation = match.orientation;
    marker.attachments = [...match.attachments];
    marker.objectLineStart = match.lineStart;
    marker.objectLineEnd = match.lineEnd;
    marker.refs.Object = match.refs.Object;
    marker.refs.ObjectPosition = match.refs.ObjectPosition;
    marker.refs.ObjectOrientation = match.refs.ObjectOrientation;
  }
}

function isTraderSpawnObject(object) {
  return object.attachments.some((attachment) => /NPC_DUMMY/i.test(attachment)) ||
    /vending|trader|survivor|npc/i.test(object.npc || "");
}

function nearestObjectByPosition(position, objects) {
  const source = vectorNumbers(position);
  if (!source) return null;
  let best = null;
  for (const object of objects) {
    const target = vectorNumbers(object.position);
    if (!target) continue;
    const distance = vectorDistance(source, target);
    if (!best || distance < best.distance) best = { object, distance };
  }
  return best;
}

function parseVariables(text) {
  const variables = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const clean = stripComment(line).trim();
    if (!clean) return;
    const tag = parseTag(clean);
    if (!tag || tag.key.toLowerCase() === "fileend") return;
    variables.push({
      key: tag.key,
      value: tag.value.trim(),
      lineNo: index + 1
    });
  });
  return variables;
}

function parseVehicleParts(fileName, text) {
  const blocks = [];
  let current = null;
  text.split(/\r?\n/).forEach((line, index) => {
    const clean = stripComment(line).trim();
    if (!clean) return;
    const tag = parseTag(clean);
    if (tag && tag.key.toLowerCase() === "vehicleparts") {
      current = {
        id: cryptoId(),
        vehicle: tag.value.trim(),
        parts: [],
        fileName,
        lineNo: index + 1
      };
      blocks.push(current);
      return;
    }
    if (tag) return;
    if (current) current.parts.push(clean);
  });
  return blocks;
}

function stripComment(line) {
  const idx = line.indexOf("//");
  return idx >= 0 ? line.slice(0, idx) : line;
}

function parseTag(clean) {
  const match = clean.match(/^<([^>]+)>\s*(.*)$/);
  if (!match) return null;
  return { key: match[1].trim(), value: match[2].trim() };
}

function splitCsv(text) {
  return text.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
}

function normalizePrice(value) {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : value;
}

function numberOrText(value) {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : value.trim();
}

function asInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : value.trim();
}

function normalizeVector(value) {
  return splitCsv(value).join(", ");
}

function vectorNumbers(value) {
  const parts = splitCsv(value).map((part) => Number(part));
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
}

function vectorDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function cryptoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function issue(severity, fileName, lineNo, title, detail, fix = null) {
  const fixes = Array.isArray(fix) ? fix : (fix ? [fix] : []);
  return { severity, fileName, lineNo, title, detail, fixes };
}

function issueCounts(issues = state.issues) {
  const counts = { error: 0, warning: 0, info: 0, problem: 0 };
  for (const item of issues) {
    if (item.severity === "error") counts.error += 1;
    else if (item.severity === "warning") counts.warning += 1;
    else if (item.severity === "info") counts.info += 1;
  }
  counts.problem = counts.error + counts.warning;
  return counts;
}

function findExpectedFileIssues() {
  const issues = [];
  const soldVehicles = state.items.filter((item) => item.quantity === "V" || item.quantity === "VNK");
  const vehicleLikeInMain = state.items.filter((item) =>
    item.fileName === (state.configFiles[0] || "TraderConfig.txt") && isSoldVehicleItem(item)
  );
  const boatSold = soldVehicles.some((item) => /boat/i.test(item.className));

  for (const expected of EXPECTED_TRADER_FILES) {
    if (state.files.has(expected.name)) continue;

    if (expected.name === "TraderConfig_Vehicles.txt") {
      const severity = vehicleLikeInMain.length || soldVehicles.length ? "warning" : "info";
      issues.push(issue(severity, "TraderConfig.txt", 0, "Нет отдельного конфига техники", `В ванильном примере техника вынесена в TraderConfig_Vehicles.txt. Сейчас файл не загружен${vehicleLikeInMain.length ? `, а ${vehicleLikeInMain.length} строк техники/деталей лежат в основном конфиге` : ""}.`, {
        label: "Создать и вынести технику",
        safe: false,
        apply: moveVehiclesToSeparateConfig
      }));
      continue;
    }

    if (expected.name === "TraderVehicleParts.txt") {
      const severity = soldVehicles.length ? "warning" : "info";
      issues.push(issue(severity, expected.name, 0, "Нет файла деталей техники", `В ванильном примере есть TraderVehicleParts.txt. Он нужен, если продается техника; найдено vehicle-товаров: ${soldVehicles.length}.`, {
        label: "Создать TraderVehicleParts.txt",
        safe: false,
        apply: () => createStandardFile("TraderVehicleParts.txt")
      }));
      continue;
    }

    issues.push(issue(expected.severity, expected.name, 0, "Не найден эталонный файл Trader", `${expected.name}: ${expected.reason}. Проверьте, что вы загрузили всю папку Trader, а не часть файлов.`, {
      label: `Создать ${expected.name}`,
      safe: false,
      apply: () => createStandardFile(expected.name)
    }));
  }

  if (boatSold && !state.files.has("TraderConfig_Boats.txt")) {
    issues.push(issue("warning", "TraderConfig_Boats.txt", 0, "Нет отдельного конфига лодок", "В ванильном примере лодки вынесены в TraderConfig_Boats.txt. Если лодки лежат в основном файле, лучше вынести их отдельно.", {
      label: "Создать TraderConfig_Boats.txt",
      safe: false,
      apply: () => createStandardFile("TraderConfig_Boats.txt")
    }));
  }

  if (boatSold && !state.files.has("TraderVehicleParts_Boats.txt")) {
    issues.push(issue("info", "TraderVehicleParts_Boats.txt", 0, "Нет файла деталей лодок", "В ванильном примере для лодок есть TraderVehicleParts_Boats.txt.", {
      label: "Создать TraderVehicleParts_Boats.txt",
      safe: false,
      apply: () => createStandardFile("TraderVehicleParts_Boats.txt")
    }));
  }

  return issues;
}

function createStandardFile(name) {
  ensureFile(name);
  if (!state.configFiles.includes(name) && /^TraderConfig.*\.txt$/i.test(name) && !/VehicleParts/i.test(name)) {
    state.configFiles.push(name);
  }
  if (name === "TraderConfig_Vehicles.txt") {
    ensureOpenFileLink(state.configFiles[0] || "TraderConfig.txt", name);
  } else if (name === "TraderConfig_Boats.txt") {
    createStandardFile("TraderConfig_Vehicles.txt");
    ensureOpenFileLink("TraderConfig_Vehicles.txt", name);
  } else if (name === "TraderVehicleParts_Boats.txt") {
    createStandardFile("TraderVehicleParts.txt");
    ensureOpenFileLink("TraderVehicleParts.txt", name);
  }
  const file = state.files.get(name);
  if (!file.text.trim()) {
    file.text = standardFileTemplate(name);
  }
  markChanged();
}

function standardFileTemplate(name) {
  if (name === "TraderObjects.txt") {
    return "// Trader markers\n\n<FileEnd>\n";
  }
  if (name === "TraderVariables.txt") {
    return [
      "<BuySellTimer> 0.3",
      "<VehicleCleanupTimer> 15.0",
      "<SafezoneTimeout> 30.0",
      "<SafezoneRemoveAnimals> yes",
      "<SafezoneRemoveInfected> yes",
      "<SafezoneRemoveEAI> yes",
      "<TradingDistance> 2.4",
      "",
      "<FileEnd>",
      ""
    ].join("\n");
  }
  if (/^TraderVehicleParts/i.test(name)) {
    return "<FileEnd>\n";
  }
  if (/^TraderConfig/i.test(name)) {
    return "<FileEnd>\n";
  }
  return "";
}

function findIssues() {
  const issues = [...state.parseProblems];
  const files = state.files;

  const allOpenFiles = new Map(state.openFiles);
  for (const file of state.files.values()) {
    const links = scanOpenFiles(file.text);
    if (links.length) allOpenFiles.set(file.name, links);
  }

  for (const [fileName, links] of allOpenFiles.entries()) {
    for (const link of links) {
      if (!files.has(link)) {
        issues.push(issue("error", fileName, 0, "Файл из OpenFile не найден", `В конфиге указан <OpenFile> ${link}, но файл не загружен.`));
      }
    }
  }

  issues.push(...findExpectedFileIssues());

  const terminalConfig = state.configFiles[state.configFiles.length - 1];
  if (terminalConfig && !state.fileEnds.get(terminalConfig)) {
    issues.push(issue("error", terminalConfig, 0, "Нет <FileEnd>", "Последний файл цепочки TraderConfig должен заканчиваться `<FileEnd>`.", {
      label: "Добавить <FileEnd>",
      apply: () => appendFileEnd(terminalConfig)
    }));
  }

  for (const file of state.files.values()) {
    const isTerminalVehicleParts = /^TraderVehicleParts.*\.txt$/i.test(file.name) && scanOpenFiles(file.text).length === 0;
    const needsOwnFileEnd = /^Trader(Admins|Variables)\.txt$/i.test(file.name) || isTerminalVehicleParts;
    if (needsOwnFileEnd && !hasActiveFileEnd(file.text)) {
      issues.push(issue("warning", file.name, 0, "Нет <FileEnd>", "Служебный файл должен завершаться `<FileEnd>`.", {
        label: "Добавить <FileEnd>",
        apply: () => appendFileEnd(file.name)
      }));
    }
  }

  const seen = new Map();
  const vehicleItemsOutsideVehicleConfig = [];
  for (const item of state.items) {
    if (!item.className || /\s/.test(item.className)) {
      issues.push(issue("error", item.fileName, item.lineNo, "Подозрительный classname", `Проверьте classname: ${item.className || "(пусто)"}.`));
    }
    if (!isPrice(item.buyPrice) || !isPrice(item.sellPrice)) {
      issues.push(issue("error", item.fileName, item.lineNo, "Цена не число", "Buyvalue и Sellvalue должны быть числами. `-1` означает запрет операции."));
    }
    if (isPrice(item.buyPrice) && item.buyPrice < -1) {
      issues.push(issue("error", item.fileName, item.lineNo, "Цена ниже -1", "Допустимо `-1` или неотрицательная цена."));
    }
    if (isPrice(item.sellPrice) && item.sellPrice < -1) {
      issues.push(issue("error", item.fileName, item.lineNo, "Цена продажи ниже -1", "Допустимо `-1` или неотрицательная цена."));
    }
    if (item.buyPrice >= 0 && item.sellPrice > item.buyPrice) {
      issues.push(issue("warning", item.fileName, item.lineNo, "Продажа дороже покупки", `${item.className}: игрок может фармить деньги на перепродаже.`, [
        {
          label: "Продажу = 50% покупки",
          safe: true,
          apply: () => setItemSellPrice(item, Math.max(0, Math.floor(item.buyPrice * 0.5)))
        },
        {
          label: "Запретить продажу",
          safe: false,
          apply: () => setItemSellPrice(item, -1)
        }
      ]));
    }
    if (!BUY_HINTS[item.quantity] && !/^\d+(\.\d+)?$/.test(String(item.quantity))) {
      issues.push(issue("warning", item.fileName, item.lineNo, "Необычное Quantity", `${item.quantity}: проверьте, поддерживает ли это значение Trader.`));
    }
    if (isSoldVehicleItem(item) && item.fileName === (state.configFiles[0] || "TraderConfig.txt") && item.fileName !== "TraderConfig_Vehicles.txt") {
      vehicleItemsOutsideVehicleConfig.push(item);
    }
    const key = `${item.traderId}|${item.category}|${item.className}`.toLowerCase();
    if (seen.has(key)) {
      issues.push(issue("warning", item.fileName, item.lineNo, "Дубликат товара", `${item.className} уже есть в этой категории.`, {
        label: "Удалить этот дубль",
        safe: true,
        apply: () => deleteItem(item.id, false)
      }));
    }
    seen.set(key, item);
  }

  if (vehicleItemsOutsideVehicleConfig.length && state.files.has("TraderConfig_Vehicles.txt")) {
    issues.push(issue("warning", state.configFiles[0] || "TraderConfig.txt", 0, "Техника в основном конфиге", `${vehicleItemsOutsideVehicleConfig.length} строк техники/деталей лежат в основном конфиге. Для порядка лучше вынести их в TraderConfig_Vehicles.txt.`, {
      label: "Вынести технику",
      safe: false,
      apply: moveVehiclesToSeparateConfig
    }));
  }

  const traderNameSeen = new Map();
  for (const trader of state.traders) {
    const normalized = trader.name.trim().toLowerCase();
    if (traderNameSeen.has(normalized)) {
      issues.push(issue("info", trader.fileName, trader.lineNo || 0, "Повторяется имя трейдера", `${trader.name}: одинаковые имена допустимы, но в большой сборке их легко перепутать.`));
    }
    traderNameSeen.set(normalized, trader);
    for (const category of trader.categories) {
      if (!category.items.length) {
        issues.push(issue("warning", category.fileName || trader.fileName, category.lineNo || trader.lineNo || 0, "Пустая категория", `${trader.name} / ${category.name}: категория без товаров не нужна.`, {
          label: "Удалить категорию",
          safe: true,
          apply: () => {
            trader.categories = trader.categories.filter((entry) => entry !== category);
            markChanged();
          }
        }));
      }
    }
  }

  const sortedTraderIds = [...state.traders.map((trader) => trader.id)].sort((a, b) => a - b);
  const duplicateTraderIds = sortedTraderIds.filter((id, index) => sortedTraderIds.indexOf(id) !== index);
  if (duplicateTraderIds.length) {
    issues.push(issue("error", "TraderConfig.txt", 0, "Дублируются Trader ID", `Найдены повторяющиеся ID: ${[...new Set(duplicateTraderIds)].join(", ")}. В Trader ID должен идти по порядку блоков <Trader>.`, {
      label: "Нормализовать ID",
      safe: false,
      apply: normalizeTraderIds
    }));
  }
  const expectedIds = state.traders.map((_, index) => index);
  const hasIdGaps = sortedTraderIds.length && sortedTraderIds.some((id, index) => id !== expectedIds[index]);
  if (hasIdGaps) {
    issues.push(issue("warning", "TraderConfig.txt", 0, "ID идут не подряд", `Текущие ID: ${sortedTraderIds.join(", ")}. Лучше держать их подряд от 0 до ${state.traders.length - 1}.`, {
      label: "Нормализовать ID",
      safe: false,
      apply: normalizeTraderIds
    }));
  }

  const traderIds = new Set(state.traders.map((trader) => trader.id));
  const markerIds = new Set(state.markers.map((marker) => marker.id));
  const tradingDistance = currentTradingDistance();
  for (const marker of state.markers) {
    if (!traderIds.has(marker.id)) {
      issues.push(issue("warning", "TraderObjects.txt", marker.lineStart, "Marker без трейдера", `ID ${marker.id} есть в TraderObjects, но в TraderConfig такого трейдера нет.`));
    }
    if (!marker.position || !marker.objectPosition) {
      const fixes = [];
      if (marker.position && !marker.objectPosition) {
        fixes.push({
          label: "Скопировать TraderMarkerPosition в ObjectPosition",
          safe: true,
          apply: () => {
            marker.objectPosition = marker.position;
            markChanged();
          }
        });
      }
      if (!marker.position && marker.objectPosition) {
        fixes.push({
          label: "Скопировать ObjectPosition в TraderMarkerPosition",
          safe: true,
          apply: () => {
            marker.position = marker.objectPosition;
            markChanged();
          }
        });
      }
      fixes.push({
        label: "Ввести координаты вручную",
        safe: false,
        apply: () => openMarkerPositionFixDialog(marker)
      });
      fixes.push({
        label: "Удалить неполный marker",
        safe: false,
        apply: () => {
          state.markers = state.markers.filter((entry) => entry !== marker);
          markChanged();
        }
      });
      issues.push(issue("error", "TraderObjects.txt", marker.lineStart, "Неполная точка трейдера", "Нужны TraderMarkerPosition и ObjectPosition. Если это не NPC-трейдер, удалите marker или заполните координаты.", fixes));
    } else if (marker.position !== marker.objectPosition) {
      issues.push(issue("error", "TraderObjects.txt", marker.lineStart, "Позиции не совпадают", "TraderMarkerPosition должен полностью совпадать с ObjectPosition.", {
        label: "Сделать ObjectPosition таким же",
        safe: true,
        apply: () => {
          marker.objectPosition = marker.position;
          markChanged();
        }
      }));
    }
    if (marker.safezone === "") {
      issues.push(issue("error", "TraderObjects.txt", marker.lineStart, "Нет TraderMarkerSafezone", "Даже если safezone не нужна, укажите `0`."));
    }
  }

  for (const trader of state.traders) {
    if (!markerIds.has(trader.id)) {
      issues.push(issue("warning", trader.fileName, trader.lineNo, "Трейдер без NPC", `${trader.name} имеет ID ${trader.id}, но в TraderObjects нет marker с таким ID.`));
    }
  }

  for (let i = 0; i < state.markers.length; i++) {
    for (let j = i + 1; j < state.markers.length; j++) {
      const left = state.markers[i];
      const right = state.markers[j];
      const leftPos = vectorNumbers(left.position);
      const rightPos = vectorNumbers(right.position);
      if (!leftPos || !rightPos) continue;
      const dist = vectorDistance(leftPos, rightPos);
      if (dist > 0 && dist < tradingDistance) {
        issues.push(issue("warning", "TraderObjects.txt", right.lineStart || 0, "Трейдеры стоят в одном радиусе торговли", `Marker ID ${left.id} и ID ${right.id}: расстояние ${dist.toFixed(2)} м, TradingDistance ${tradingDistance.toFixed(1)} м. Для vending не снижайте TradingDistance слишком низко: действие считается от позиции/центра объекта. Лучше физически разнести автоматы.`));
      }
    }
  }

  const vehicleParts = new Set(state.vehicleParts.map((block) => block.vehicle.toLowerCase()));
  const soldVehicles = new Set();
  for (const item of state.items) {
    if (item.quantity === "V" || item.quantity === "VNK") {
      soldVehicles.add(item.className.toLowerCase());
    }
    if ((item.quantity === "V" || item.quantity === "VNK") && !vehicleParts.has(item.className.toLowerCase())) {
      issues.push(issue("warning", item.fileName, item.lineNo, "Нет набора деталей", `${item.className} продается как техника, но в TraderVehicleParts нет блока <VehicleParts>.`, [
        {
          label: "Создать автоматически",
          safe: false,
          apply: () => createVehiclePartsForItem(item)
        },
        {
          label: "Создать вручную",
          safe: false,
          apply: () => openVehiclePartsFixDialog(item)
        }
      ]));
    }
  }

  for (const block of state.vehicleParts) {
    const key = block.vehicle.toLowerCase();
    if (!soldVehicles.has(key) && !state.ignoredUnsoldVehicleParts.has(key)) {
      issues.push(issue("info", block.fileName, block.lineNo || 0, "Набор деталей без продажи", `${block.vehicle}: есть <VehicleParts>, но такая техника не продается в TraderConfig.`, [
        {
          label: "Игнорировать",
          safe: false,
          apply: () => ignoreUnsoldVehiclePart(block.vehicle)
        },
        {
          label: "Удалить набор деталей",
          safe: false,
          apply: () => {
            state.vehicleParts = state.vehicleParts.filter((entry) => entry !== block);
            markChanged();
            commitOutputToFileTexts();
          }
        }
      ]));
    }
  }

  const vehicleTraderIds = new Set(state.items.filter((item) => item.quantity === "V" || item.quantity === "VNK").map((item) => item.traderId));
  for (const id of vehicleTraderIds) {
    const markerForVehicleTrader = state.markers.filter((marker) => marker.id === id);
    if (!markerForVehicleTrader.length) continue;
    for (const marker of markerForVehicleTrader) {
      if (!marker.vehicleSpawn) {
        issues.push(issue("warning", "TraderObjects.txt", marker.lineStart, "Vehicle trader без VehicleSpawn", `Trader ID ${id} продает технику, но у marker нет <VehicleSpawn>.`, {
          label: "Добавить VehicleSpawn",
          safe: false,
          apply: () => openVehicleSpawnFixDialog(marker)
        }));
      }
    }
  }

  const distance = state.variables.find((v) => v.key === "TradingDistance");
  if (distance) {
    const value = Number(distance.value);
    if (!Number.isFinite(value) || value < 1 || value > 3) {
      issues.push(issue("warning", "TraderVariables.txt", distance.lineNo, "TradingDistance вне диапазона", "Trader обычно работает с дистанцией 1.0-3.0."));
    }
  }

  return issues;
}

function currentTradingDistance() {
  const variable = state.variables.find((entry) => entry.key.toLowerCase() === "tradingdistance");
  const parsed = Number(variable?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3.0;
}

function hasActiveFileEnd(text) {
  return text.split(/\r?\n/).some((line) => /^<FileEnd>/i.test(stripComment(line).trim()));
}

function isPrice(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function appendFileEnd(fileName) {
  const file = state.files.get(fileName);
  if (!file) return;
  file.text = file.text.replace(/\s*$/, "\n\n<FileEnd>\t\t\t\t\t\t\t// Added by Trader Tool\n");
  markChanged();
  analyzeLoadedFiles({ preserveChanged: true });
}

function setItemSellPrice(item, value) {
  item.sellPrice = value;
  syncItemToTree(item);
  markChanged();
}

function openMarkerPositionFixDialog(marker) {
  openDialog("Исправить точку трейдера", [
    field("position", "Координаты X, Y, Z", marker.position || marker.objectPosition || "0, 0, 0"),
    field("npc", "NPC/Object classname", marker.npc || "SurvivorM_Mirek"),
    field("safezone", "Safezone radius", marker.safezone || "0", "number"),
    field("orientation", "Ориентация yaw, pitch, roll", marker.orientation || "0, 0, 0")
  ], (data) => {
    const pos = normalizeVector(data.position || "0, 0, 0");
    marker.position = pos;
    marker.objectPosition = pos;
    marker.npc = data.npc || marker.npc || "SurvivorM_Mirek";
    marker.safezone = data.safezone || "0";
    marker.orientation = normalizeVector(data.orientation || "0, 0, 0");
    markChanged();
  });
}

function openVehiclePartsFixDialog(item) {
  const fileName = firstVehiclePartsFile();
  ensureFile(fileName);
  openDialog("Создать набор деталей", [
    field("fileName", "Файл", fileName, "select", vehiclePartsFiles()),
    field("vehicle", "Classname техники", item.className),
    field("parts", "Детали, по одной в строке", suggestVehicleParts(item.className).join("\n"), "textarea")
  ], (data) => {
    const targetFile = data.fileName || fileName;
    ensureFile(targetFile);
    state.vehicleParts.push({
      id: cryptoId(),
      vehicle: data.vehicle || item.className,
      parts: data.parts.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      fileName: targetFile
    });
    markChanged();
  });
}

function openVehicleSpawnFixDialog(marker) {
  openDialog("Добавить spawn техники", [
    field("vehicleSpawn", "Координаты spawn техники X, Y, Z", marker.vehicleSpawn || marker.position || "0, 0, 0"),
    field("vehicleSpawnOri", "Ориентация spawn yaw, pitch, roll", marker.vehicleSpawnOri || marker.orientation || "0, 0, 0")
  ], (data) => {
    marker.vehicleSpawn = normalizeVector(data.vehicleSpawn || marker.position || "0, 0, 0");
    marker.vehicleSpawnOri = normalizeVector(data.vehicleSpawnOri || "0, 0, 0");
    markChanged();
  });
}

function renderAll() {
  renderStats();
  renderOverview();
  renderFilters();
  renderStructure();
  renderItems();
  renderMarkers();
  renderVehicleParts();
  renderVariables();
  renderIssues();
  $("#runAnalysisBtn").disabled = state.files.size === 0;
  $("#saveBtn").disabled = state.files.size === 0 || !state.loadedWithHandles;
  $("#downloadBtn").disabled = state.files.size === 0;
}

function renderStats() {
  const counts = issueCounts();
  $("#statFiles").textContent = state.files.size;
  $("#statTraders").textContent = state.traders.length;
  $("#statItems").textContent = state.items.length;
  $("#statIssues").textContent = counts.problem;
}

function renderOverview() {
  const fileList = $("#fileList");
  fileList.className = "list";
  if (!state.files.size) {
    fileList.className = "list empty";
    fileList.textContent = "Пока ничего не загружено.";
  } else {
    fileList.innerHTML = "";
    for (const file of state.files.values()) {
      const row = document.createElement("div");
      row.className = "file-row";
      row.innerHTML = `<span>${escapeHtml(file.path)}</span><strong>${formatBytes(file.text.length)}</strong>`;
      fileList.append(row);
    }
  }

  const summary = $("#summaryList");
  summary.className = "list";
  if (!state.files.size) {
    summary.className = "list empty";
    summary.textContent = "После загрузки здесь появится структура трейдера.";
    return;
  }
  const rows = [
    ["Валюта", state.currencyName || "не найдена"],
    ["Денежных классов", state.currencies.length],
    ["Файлов категорий", state.configFiles.join(", ") || "не найдены"],
    ["NPC-точек", state.markers.length],
    ["Наборов деталей техники", state.vehicleParts.length],
    ["Режим сохранения", state.loadedWithHandles ? "прямо в выбранную папку" : "через скачивание файлов"]
  ];
  summary.innerHTML = "";
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span>${label}</span><strong>${escapeHtml(String(value))}</strong>`;
    summary.append(row);
  }
}

function renderFilters() {
  const traderFilter = $("#traderFilter");
  const currentTrader = traderFilter.value;
  traderFilter.innerHTML = `<option value="">Все трейдеры</option>` + state.traders.map((trader) =>
    `<option value="${trader.id}">${trader.id}: ${escapeHtml(trader.name)}</option>`
  ).join("");
  traderFilter.value = currentTrader;

  const fileFilter = $("#fileFilter");
  const currentFile = fileFilter.value;
  fileFilter.innerHTML = `<option value="">Все файлы</option>` + state.configFiles.map((name) =>
    `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
  ).join("");
  fileFilter.value = currentFile;
}

function renderStructure() {
  const tbody = $("#structureTable tbody");
  if (!tbody) return;
  const traders = [...state.traders].sort((a, b) => a.id - b.id);
  const markerCounts = markerCountByTraderId();
  tbody.innerHTML = "";

  for (const trader of traders) {
    const itemCount = trader.categories.reduce((sum, category) => sum + category.items.length, 0);
    const markerCount = markerCounts.get(trader.id) || 0;
    const mapStatus = markerCount ? `${markerCount} точек` : "нет на карте";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="mini" type="number" min="0" value="${trader.id}" data-trader-id="${trader.id}" data-field="id"></td>
      <td><input value="${escapeAttr(trader.name)}" data-trader-id="${trader.id}" data-field="name"></td>
      <td>${fileSelectHtml(trader.fileName, trader.id)}</td>
      <td>${categoryManagerHtml(trader)}</td>
      <td>${itemCount}</td>
      <td><span class="pill ${markerCount ? "ok" : "warn"}">${escapeHtml(mapStatus)}</span></td>
      <td class="row-actions">
        <button class="small-btn" data-focus-trader="${trader.id}" type="button">Товары</button>
        <button class="small-btn" data-add-marker-for="${trader.id}" type="button">Точка</button>
      </td>
    `;
    tbody.append(tr);
  }

  tbody.querySelectorAll("[data-trader-id]").forEach((input) => {
    input.addEventListener("change", () => updateTraderField(Number(input.dataset.traderId), input.dataset.field, input.value));
  });
  tbody.querySelectorAll("[data-move-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const sourceId = Number(button.dataset.sourceTrader);
      const categoryName = button.dataset.moveCategory;
      const select = tbody.querySelector(`[data-category-target="${sourceId}|${encodeURIComponent(categoryName)}"]`);
      moveCategoryToTrader(sourceId, categoryName, Number(select.value));
    });
  });
  tbody.querySelectorAll("[data-focus-trader]").forEach((button) => {
    button.addEventListener("click", () => focusTraderItems(Number(button.dataset.focusTrader)));
  });
  tbody.querySelectorAll("[data-add-marker-for]").forEach((button) => {
    button.addEventListener("click", () => addMarkerForTrader(Number(button.dataset.addMarkerFor)));
  });
}

function fileSelectHtml(currentFile, traderId) {
  const files = state.configFiles.length ? state.configFiles : ["TraderConfig.txt"];
  return `<select data-trader-id="${traderId}" data-field="fileName">${files.map((file) =>
    `<option value="${escapeAttr(file)}" ${file === currentFile ? "selected" : ""}>${escapeHtml(file)}</option>`
  ).join("")}</select>`;
}

function categoryManagerHtml(trader) {
  if (!trader.categories.length) return `<span class="empty">Нет категорий</span>`;
  const targets = [...state.traders].sort((a, b) => a.id - b.id);
  return `<div class="category-stack">${trader.categories.map((category) => `
    <div class="category-line">
      <span><strong>${escapeHtml(category.name)}</strong> · ${category.items.length}</span>
      <select data-category-target="${trader.id}|${encodeURIComponent(category.name)}">
        ${targets.map((target) => `<option value="${target.id}" ${target.id === trader.id ? "selected" : ""}>${target.id}: ${escapeHtml(target.name)}</option>`).join("")}
      </select>
      <button class="small-btn" data-source-trader="${trader.id}" data-move-category="${escapeAttr(category.name)}" type="button">Перенести</button>
    </div>
  `).join("")}</div>`;
}

function markerCountByTraderId() {
  const counts = new Map();
  for (const marker of state.markers) {
    counts.set(marker.id, (counts.get(marker.id) || 0) + 1);
  }
  return counts;
}

function updateTraderField(traderId, field, value) {
  const trader = state.traders.find((entry) => entry.id === traderId);
  if (!trader) return;
  if (field === "id") {
    moveTraderToId(traderId, Number(value));
    return;
  }
  if (field === "name") {
    trader.name = value.trim() || trader.name;
    for (const item of state.items.filter((entry) => entry.traderId === trader.id)) item.traderName = trader.name;
  } else if (field === "fileName") {
    ensureFile(value);
    if (!state.configFiles.includes(value)) state.configFiles.push(value);
    trader.fileName = value;
    for (const category of trader.categories) category.fileName = value;
    for (const item of state.items.filter((entry) => entry.traderId === trader.id)) item.fileName = value;
  }
  markChanged();
}

function moveTraderToId(currentId, targetId) {
  const ordered = [...state.traders].sort((a, b) => a.id - b.id);
  const currentIndex = ordered.findIndex((trader) => trader.id === currentId);
  if (currentIndex < 0) return;
  const clamped = Math.max(0, Math.min(ordered.length - 1, Math.floor(targetId || 0)));
  const [trader] = ordered.splice(currentIndex, 1);
  ordered.splice(clamped, 0, trader);
  const mapping = new Map();
  ordered.forEach((entry, index) => mapping.set(entry.id, index));
  applyTraderIdMapping(mapping);
  state.traders = ordered;
  markChanged();
}

function normalizeTraderIds() {
  if (!state.traders.length) return;
  if (!confirm("Нормализовать ID трейдеров по текущему порядку и обновить TraderObjects?")) return;
  const ordered = [...state.traders].sort((a, b) => a.id - b.id);
  const mapping = new Map();
  ordered.forEach((trader, index) => mapping.set(trader.id, index));
  applyTraderIdMapping(mapping);
  state.traders = ordered;
  markChanged();
}

function sortTradersById() {
  state.traders.sort((a, b) => a.id - b.id);
  markChanged();
}

function applyTraderIdMapping(mapping) {
  for (const trader of state.traders) {
    if (mapping.has(trader.id)) trader.id = mapping.get(trader.id);
  }
  for (const trader of state.traders) {
    for (const category of trader.categories) category.traderId = trader.id;
  }
  for (const item of state.items) {
    if (mapping.has(item.traderId)) {
      item.traderId = mapping.get(item.traderId);
      const trader = state.traders.find((entry) => entry.id === item.traderId);
      if (trader) item.traderName = trader.name;
    }
  }
  for (const marker of state.markers) {
    if (mapping.has(marker.id)) marker.id = mapping.get(marker.id);
  }
}

function moveCategoryToTrader(sourceTraderId, categoryName, targetTraderId) {
  if (sourceTraderId === targetTraderId) return;
  const source = state.traders.find((trader) => trader.id === sourceTraderId);
  const target = state.traders.find((trader) => trader.id === targetTraderId);
  if (!source || !target) return;
  const category = source.categories.find((entry) => entry.name === categoryName);
  if (!category) return;
  if (!confirm(`Перенести категорию "${categoryName}" из ID ${source.id} в ID ${target.id}?`)) return;

  source.categories = source.categories.filter((entry) => entry !== category);
  let targetCategory = target.categories.find((entry) => entry.name === category.name);
  if (!targetCategory) {
    targetCategory = { ...category, traderId: target.id, fileName: target.fileName, items: [] };
    target.categories.push(targetCategory);
  }
  for (const item of category.items) {
    item.traderId = target.id;
    item.traderName = target.name;
    item.fileName = target.fileName;
    item.category = targetCategory.name;
    targetCategory.items.push(item);
  }
  markChanged();
}

function createVehicleTraderDialog() {
  openDialog("Создать Vehicle Trader", [
    field("name", "Имя трейдера", "Vehicles Trader"),
    field("fileName", "Файл", "TraderConfig_Vehicles.txt", "select", uniqueOptions([...state.configFiles, "TraderConfig_Vehicles.txt"])),
    field("moveNow", "Сразу перенести категории техники", "yes", "select", [
      { value: "yes", label: "Да" },
      { value: "no", label: "Нет" }
    ])
  ], (data) => {
    const trader = createVehicleTrader(data.name || "Vehicles Trader", data.fileName || "TraderConfig_Vehicles.txt");
    if (data.moveNow === "yes") moveVehicleCategoriesToTrader(trader.id, false);
    addTaskLog(`Vehicle Trader ID ${trader.id}: файл ${outputPathFor(trader.fileName)}.`);
    if (!state.loadedWithHandles) addTaskLog("Загружены отдельные файлы: новый конфиг техники появится через `Скачать файлы`.");
    markChanged();
  });
}

function createVehicleTrader(name = "Vehicles Trader", fileName = "TraderConfig_Vehicles.txt") {
  ensureFile(fileName);
  if (!state.configFiles.includes(fileName)) state.configFiles.push(fileName);
  ensureOpenFileLink(state.configFiles[0] || "TraderConfig.txt", fileName);

  let trader = state.traders.find((entry) => entry.fileName === fileName && /vehicle|машин|техник|heli|boat/i.test(entry.name));
  if (trader) return trader;

  const id = state.traders.length ? Math.max(...state.traders.map((entry) => entry.id)) + 1 : 0;
  trader = { id, name, fileName, lineNo: 0, categories: [] };
  state.traders.push(trader);
  state.fileEnds.set(fileName, state.fileEnds.get(fileName) || 1);
  return trader;
}

function ensureOpenFileLink(sourceFileName, targetFileName) {
  if (!sourceFileName || sourceFileName === targetFileName) return;
  ensureFile(sourceFileName);
  const links = state.openFiles.get(sourceFileName) || scanOpenFiles(state.files.get(sourceFileName)?.text || "");
  if (!links.includes(targetFileName)) {
    links.push(targetFileName);
    state.openFiles.set(sourceFileName, links);
  }
  state.fileEnds.set(sourceFileName, null);
}

function moveVehicleCategoriesToVehicleTrader() {
  const trader = createVehicleTrader();
  moveVehicleCategoriesToTrader(trader.id, true);
}

function moveVehicleCategoriesToTrader(targetTraderId, ask = true) {
  const candidates = [];
  for (const trader of state.traders) {
    if (trader.id === targetTraderId) continue;
    for (const category of trader.categories) {
      if (isVehicleCategory(category) || category.items.some(isVehicleTradeItem)) {
        candidates.push({ trader, category });
      }
    }
  }

  if (!candidates.length) {
    alert("Категории техники не найдены. Программа ищет Vehicles, Vehicle Parts, Boats, Helicopters и строки Quantity V/VNK.");
    return;
  }

  const target = state.traders.find((entry) => entry.id === targetTraderId);
  if (!target) return;
  const preview = candidates.map(({ trader, category }) => `- ID ${trader.id} ${trader.name}: ${category.name} (${category.items.length})`).join("\n");
  if (ask && !confirm(`Перенести категории техники в ID ${target.id} ${target.name}?\n\n${preview}`)) return;

  for (const { trader, category } of candidates) {
    moveCategoryObjectToTrader(trader, category, target);
  }
  markChanged();
}

function moveCategoryObjectToTrader(source, category, target) {
  source.categories = source.categories.filter((entry) => entry !== category);
  const targetCategoryName = normalizeVehicleCategoryName(category);
  let targetCategory = target.categories.find((entry) => entry.name === targetCategoryName);
  if (!targetCategory) {
    targetCategory = { name: targetCategoryName, fileName: target.fileName, traderId: target.id, items: [] };
    target.categories.push(targetCategory);
  }

  for (const item of category.items) {
    item.traderId = target.id;
    item.traderName = target.name;
    item.fileName = target.fileName;
    item.category = targetCategory.name;
    targetCategory.items.push(item);
  }
}

function isVehicleCategory(category) {
  return /vehicle|vehicles|vehicle parts|cars|trucks|helicopters|heli|boats|лодк|машин|техник/i.test(category.name);
}

function normalizeVehicleCategoryName(category) {
  const name = category.name.toLowerCase();
  if (/heli|helicopter/.test(name)) return "Helicopters";
  if (/boat/.test(name)) return "Boats";
  if (/part|wheel|door|hood/.test(name)) return "Vehicle Parts";
  if (category.items.some((item) => item.quantity === "V" || item.quantity === "VNK")) return "Vehicles";
  return category.name;
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))];
}

function focusTraderItems(traderId) {
  const nav = document.querySelector('[data-tab="items"]');
  nav?.click();
  $("#traderFilter").value = String(traderId);
  renderItems();
}

function addMarkerForTrader(traderId) {
  const trader = state.traders.find((entry) => entry.id === traderId);
  if (!trader) return;
  ensureFile("TraderObjects.txt");
  openDialog("Добавить точку трейдера", [
    field("position", "Позиция X, Y, Z", "0, 0, 0"),
    field("npc", "NPC/Object classname", "SurvivorM_Mirek"),
    field("safezone", "Safezone radius", "0", "number"),
    field("orientation", "Ориентация yaw, pitch, roll", "0, 0, 0")
  ], (data) => {
    const pos = normalizeVector(data.position || "0, 0, 0");
    state.markers.push({
      id: trader.id,
      npc: data.npc || "SurvivorM_Mirek",
      position: pos,
      objectPosition: pos,
      safezone: data.safezone || "0",
      orientation: normalizeVector(data.orientation || "0, 0, 0"),
      vehicleSpawn: "",
      vehicleSpawnOri: "",
      attachments: [],
      lineStart: `new-${cryptoId()}`,
      lineEnd: 0,
      refs: {}
    });
    markChanged();
  });
}

function renderItems() {
  const tbody = $("#itemsTable tbody");
  const rows = getVisibleItems();

  $("#visibleItemsCount").textContent = `${rows.length} товаров показано`;
  $("#showRiskyBtn").classList.toggle("active-toggle", state.showRiskyOnly);
  $("#itemsHint").style.display = rows.length ? "none" : "block";
  tbody.innerHTML = "";
  for (const item of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.traderId}</td>
      <td>${escapeHtml(item.traderName)}</td>
      <td><input value="${escapeAttr(item.category)}" data-edit-item="${item.id}" data-field="category"></td>
      <td><input value="${escapeAttr(item.className)}" data-edit-item="${item.id}" data-field="className"></td>
      <td><input class="mini" value="${escapeAttr(item.quantity)}" data-edit-item="${item.id}" data-field="quantity"></td>
      <td>${priceCell(item, "buyPrice")}</td>
      <td>${priceCell(item, "sellPrice")}</td>
      <td>${itemAdvice(item)}</td>
      <td><button class="small-btn" data-delete-item="${item.id}" type="button">Удалить</button></td>
    `;
    tbody.append(tr);
  }

  tbody.querySelectorAll("[data-edit-item]").forEach((input) => {
    input.addEventListener("change", () => updateItem(input.dataset.editItem, input.dataset.field, input.value));
  });
  tbody.querySelectorAll("[data-price-toggle]").forEach((input) => {
    input.addEventListener("change", () => togglePrice(input.dataset.priceToggle, input.dataset.field, input.checked));
  });
  tbody.querySelectorAll("[data-delete-item]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.deleteItem));
  });
}

function getVisibleItems() {
  const query = $("#itemSearch").value.trim().toLowerCase();
  const traderFilter = $("#traderFilter").value;
  const fileFilter = $("#fileFilter").value;
  return state.items.filter((item) => {
    const haystack = `${item.className} ${item.category} ${item.traderName} ${item.fileName}`.toLowerCase();
    return (!query || haystack.includes(query)) &&
      (!traderFilter || String(item.traderId) === traderFilter) &&
      (!fileFilter || item.fileName === fileFilter) &&
      (!state.showRiskyOnly || isRiskyItem(item));
  });
}

function isRiskyItem(item) {
  return (item.buyPrice >= 0 && item.sellPrice > item.buyPrice) ||
    item.buyPrice < -1 ||
    item.sellPrice < -1 ||
    (item.quantity === "V" || item.quantity === "VNK") ||
    isGenericCategory(item.category) ||
    !BUY_HINTS[item.quantity] && !/^\d+(\.\d+)?$/.test(String(item.quantity));
}

function toggleRiskyOnly() {
  state.showRiskyOnly = !state.showRiskyOnly;
  $("#showRiskyBtn").textContent = state.showRiskyOnly ? "Показать все" : "Только проблемы";
  renderItems();
}

function openBulkPricesDialog() {
  const count = getVisibleItems().length;
  if (!count) {
    alert("Нет видимых товаров для массовой операции.");
    return;
  }
  openDialog("Массовая правка цен", [
    field("operation", "Операция", "sell_percent", "select", [
      { value: "sell_percent", label: "Продажа = процент от покупки" },
      { value: "buy_multiplier", label: "Умножить цену покупки" },
      { value: "sell_multiplier", label: "Умножить цену продажи" },
      { value: "disable_sell", label: "Запретить продажу" },
      { value: "disable_buy", label: "Запретить покупку" },
      { value: "round", label: "Округлить цены" }
    ]),
    field("value", "Значение: процент, множитель или шаг округления", "50", "number")
  ], (data) => {
    applyBulkPriceOperation(data.operation, Number(data.value));
  });
}

function applyBulkPriceOperation(operation, value) {
  const rows = getVisibleItems();
  if (!rows.length) return;
  const label = bulkOperationLabel(operation, value);
  if (!confirm(`${label}\n\nБудет изменено товаров: ${rows.length}. Продолжить?`)) return;

  for (const item of rows) {
    if (operation === "sell_percent" && item.buyPrice >= 0) {
      item.sellPrice = Math.max(0, Math.floor(item.buyPrice * (value / 100)));
    } else if (operation === "buy_multiplier" && item.buyPrice >= 0) {
      item.buyPrice = Math.max(0, Math.round(item.buyPrice * value));
    } else if (operation === "sell_multiplier" && item.sellPrice >= 0) {
      item.sellPrice = Math.max(0, Math.round(item.sellPrice * value));
    } else if (operation === "disable_sell") {
      item.sellPrice = -1;
    } else if (operation === "disable_buy") {
      item.buyPrice = -1;
    } else if (operation === "round") {
      const step = Math.max(1, Math.floor(value || 1));
      if (item.buyPrice >= 0) item.buyPrice = roundToStep(item.buyPrice, step);
      if (item.sellPrice >= 0) item.sellPrice = roundToStep(item.sellPrice, step);
    }
    syncItemToTree(item);
  }
  markChanged();
}

function bulkOperationLabel(operation, value) {
  const labels = {
    sell_percent: `Поставить продажу = ${value}% от покупки`,
    buy_multiplier: `Умножить цену покупки на ${value}`,
    sell_multiplier: `Умножить цену продажи на ${value}`,
    disable_sell: "Запретить продажу",
    disable_buy: "Запретить покупку",
    round: `Округлить цены с шагом ${value || 1}`
  };
  return labels[operation] || "Массовая операция";
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function fixVisibleResale() {
  const rows = getVisibleItems().filter((item) => item.buyPrice >= 0 && item.sellPrice > item.buyPrice);
  if (!rows.length) {
    alert("В видимых товарах нет перепродажи в плюс.");
    return;
  }
  if (!confirm(`Исправить перепродажу у ${rows.length} товаров? Продажа станет 50% от покупки.`)) return;
  for (const item of rows) {
    item.sellPrice = Math.max(0, Math.floor(item.buyPrice * 0.5));
    syncItemToTree(item);
  }
  markChanged();
}

function sellHalfVisible() {
  const rows = getVisibleItems().filter((item) => item.buyPrice >= 0);
  if (!rows.length) {
    alert("В видимых товарах нет товаров с разрешенной покупкой.");
    return;
  }
  if (!confirm(`Поставить продажу 50% от покупки для ${rows.length} товаров?`)) return;
  for (const item of rows) {
    item.sellPrice = Math.max(0, Math.floor(item.buyPrice * 0.5));
    syncItemToTree(item);
  }
  markChanged();
}

function roundVisiblePrices() {
  const rows = getVisibleItems();
  if (!rows.length) return;
  const raw = prompt("Шаг округления цен", "10");
  if (raw === null) return;
  const step = Math.max(1, Math.floor(Number(raw) || 1));
  for (const item of rows) {
    if (item.buyPrice >= 0) item.buyPrice = roundToStep(item.buyPrice, step);
    if (item.sellPrice >= 0) item.sellPrice = roundToStep(item.sellPrice, step);
    syncItemToTree(item);
  }
  markChanged();
}

function priceCell(item, field) {
  const enabled = item[field] !== -1;
  const label = field === "buyPrice" ? "Можно покупать" : "Можно продавать";
  return `
    <label class="switch"><input type="checkbox" ${enabled ? "checked" : ""} data-price-toggle="${item.id}" data-field="${field}"> ${label}</label>
    <input class="mini" type="number" min="-1" value="${escapeAttr(item[field])}" data-edit-item="${item.id}" data-field="${field}">
  `;
}

function itemAdvice(item) {
  const hint = BUY_HINTS[item.quantity] || "особое количество";
  const suggested = suggestCategory(item.className);
  let status = "ok";
  let text = hint;
  if (item.buyPrice === -1 && item.sellPrice === -1) {
    status = "warn";
    text = "нельзя купить и продать";
  } else if (item.buyPrice >= 0 && item.sellPrice > item.buyPrice) {
    status = "warn";
    text = "перепродажа в плюс";
  } else if (isGenericCategory(item.category) && suggested) {
    status = "warn";
    text = `лучше: ${suggested}`;
  }
  return `<span class="pill ${status}">${escapeHtml(text)}</span>`;
}

function updateItem(id, field, value) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  item[field] = field.includes("Price") ? Number(value) : value.trim();
  syncItemToTree(item);
  markChanged();
}

function togglePrice(id, field, enabled) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  if (!enabled) item[field] = -1;
  if (enabled && item[field] === -1) item[field] = 0;
  syncItemToTree(item);
  markChanged();
  renderItems();
}

function syncItemToTree(item) {
  for (const trader of state.traders) {
    for (const category of trader.categories) {
      const idx = category.items.findIndex((entry) => entry.id === item.id);
      if (idx >= 0) {
        if (trader.id !== item.traderId || category.name !== item.category) {
          category.items.splice(idx, 1);
          const targetTrader = state.traders.find((entry) => entry.id === item.traderId) || trader;
          let targetCategory = targetTrader.categories.find((entry) => entry.name === item.category);
          if (!targetCategory) {
            targetCategory = { name: item.category, fileName: targetTrader.fileName, traderId: targetTrader.id, items: [] };
            targetTrader.categories.push(targetCategory);
          }
          targetCategory.items.push(item);
        }
        return;
      }
    }
  }
}

function deleteItem(id, ask = true) {
  if (ask && !confirm("Удалить товар из конфига?")) return;
  state.items = state.items.filter((item) => item.id !== id);
  for (const trader of state.traders) {
    for (const category of trader.categories) {
      category.items = category.items.filter((item) => item.id !== id);
    }
  }
  markChanged();
}

function findDuplicateItems() {
  const seen = new Set();
  const duplicates = [];
  for (const item of state.items) {
    const key = `${item.traderId}|${item.category}|${item.className}`.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(item);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

function removeDuplicateItems() {
  const duplicates = findDuplicateItems();
  if (!duplicates.length) {
    resetTaskLog("Удаление дублей");
    updateTaskProgress(1, 1);
    addTaskLog("Дубликаты товаров не найдены.");
    return;
  }
  if (!confirm(`Удалить ${duplicates.length} дублей товаров? Программа оставит первую строку товара в каждой категории, повторные строки удалит.`)) return;
  resetTaskLog("Удаление дублей");
  updateTaskProgress(0, duplicates.length);
  const ids = new Set(duplicates.map((item) => item.id));
  state.items = state.items.filter((item) => !ids.has(item.id));
  let done = 0;
  for (const trader of state.traders) {
    for (const category of trader.categories) {
      const before = category.items.length;
      category.items = category.items.filter((item) => !ids.has(item.id));
      done += before - category.items.length;
      updateTaskProgress(done, duplicates.length);
    }
  }
  markChanged();
  commitOutputToFileTexts();
  addTaskLog(`Готово: удалено дублей ${duplicates.length}.`);
}

function suggestCategory(className) {
  const name = String(className).toLowerCase();
  const rules = [
    [/ammo|cartridge|bullet|shell|grenade|explosive|detonator/, "Ammunition"],
    [/mag_|magazine|clip|drum/, "Magazines"],
    [/optic|scope|sight|suppressor|bayonet|compensator|handguard|bttstck|stock/, "Weapon Attachments"],
    [/ak|m4|svd|mosin|famas|aug|fal|ump|mp5|cz|glock|fnx|colt|izh|ruger|repeater|winchester|crossbow/, "Weapons"],
    [/wheel|radiator|sparkplug|glowplug|battery|hood|trunk|door|engineoil|tirerepair/, "Vehicle Parts"],
    [/offroad|hatchback|sedan|truck|boat|vehicle/, "Vehicles"],
    [/jacket|pants|shirt|boots|gloves|helmet|vest|mask|bag|cap|hat|belt|holster|pouch|glasses/, "Clothing"],
    [/bandage|saline|blood|morphine|epinephrine|tetracycline|vitamin|charcoal|disinfect|iodine|medical|firstaid/, "Medical Supplies"],
    [/can|food|meat|steak|mushroom|berry|apple|pear|plum|rice|cereal|chips|honey|zucchini|pumpkin/, "Food"],
    [/soda|water|canteen|vodka|drink/, "Drinks"],
    [/hammer|saw|wrench|pliers|screwdriver|shovel|pickaxe|lockpick|knife|compass|gps|radio|battery9v/, "Tools"]
  ];
  const found = rules.find(([pattern]) => pattern.test(name));
  return found ? found[1] : "Misc";
}

function isGenericCategory(category) {
  return /^(new category|imported|unsorted|unknown|без категории)$/i.test(String(category).trim());
}

function autoCategorizeItems() {
  const changes = [];
  for (const item of state.items) {
    if (!isGenericCategory(item.category)) continue;
    const suggested = suggestCategory(item.className);
    if (suggested && suggested !== item.category) changes.push({ item, suggested });
  }
  if (!changes.length) {
    alert("Нет товаров в общих категориях `New Category`, `Imported`, `Unsorted`, `Unknown` или `Без категории`.");
    return;
  }
  if (!confirm(`Переместить ${changes.length} товаров из общих категорий в рекомендованные?`)) return;
  for (const change of changes) {
    change.item.category = change.suggested;
    syncItemToTree(change.item);
  }
  markChanged();
}

async function moveVehiclesToSeparateConfig() {
  const targetFile = "TraderConfig_Vehicles.txt";
  const sourceFile = state.configFiles[0] || "TraderConfig.txt";
  const movable = state.items.filter((item) => item.fileName !== targetFile && isVehicleTradeItem(item));

  if (!movable.length) {
    alert("Техника в основном TraderConfig не найдена. Программа ищет Quantity V/VNK и категории Vehicles/Heli/Boats/Vehicle Parts.");
    return;
  }

  const message = [
    `Найдено ${movable.length} строк техники или деталей в основном конфиге.`,
    "",
    `Программа создаст/использует ${targetFile}, добавит <OpenFile> в ${sourceFile} и перенесет эти строки в трейдера Vehicles Trader.`,
    `Файл будет создан/обновлен здесь: ${outputPathFor(targetFile)}.`,
    state.loadedWithHandles ? "При сохранении в открытую папку файл будет создан рядом с TraderConfig.txt." : "Так как загружены отдельные файлы, заберите новый файл через кнопку `Скачать файлы`.",
    "После переноса проверьте вкладку NPC: если появится новый Trader ID, ему нужна точка в TraderObjects.txt.",
    "",
    "Продолжить?"
  ].join("\n");
  if (!confirm(message)) return;

  resetTaskLog("Перенос техники");
  updateTaskProgress(0, movable.length || 1);
  addTaskLog(`Целевой файл: ${outputPathFor(targetFile)}.`);
  addTaskLog(state.loadedWithHandles ? "После сохранения файл будет создан в выбранной папке." : "Загружены отдельные файлы: новый файл будет доступен через скачивание.");

  ensureFile(targetFile);
  if (!state.configFiles.includes(targetFile)) {
    const sourceIndex = Math.max(0, state.configFiles.indexOf(sourceFile));
    state.configFiles.splice(sourceIndex + 1, 0, targetFile);
  }
  ensureOpenFileLink(sourceFile, targetFile);

  const links = state.openFiles.get(sourceFile) || [];
  if (!links.includes(targetFile)) {
    links.push(targetFile);
    state.openFiles.set(sourceFile, links);
  }
  state.fileEnds.set(sourceFile, null);
  state.fileEnds.set(targetFile, state.fileEnds.get(targetFile) || 1);

  let targetTrader = state.traders.find((trader) => trader.fileName === targetFile && /vehicle|машин|техник|heli|boat/i.test(trader.name));
  if (!targetTrader) {
    const id = state.traders.length ? Math.max(...state.traders.map((trader) => trader.id)) + 1 : 0;
    targetTrader = { id, name: "Vehicles Trader", fileName: targetFile, lineNo: 0, categories: [] };
    state.traders.push(targetTrader);
  }

  let moved = 0;
  for (const item of movable) {
    const oldTrader = state.traders.find((trader) => trader.id === item.traderId);
    for (const category of oldTrader?.categories || []) {
      category.items = category.items.filter((entry) => entry.id !== item.id);
    }

    const categoryName = vehicleCategoryForItem(item);
    let targetCategory = targetTrader.categories.find((category) => category.name === categoryName);
    if (!targetCategory) {
      targetCategory = { name: categoryName, fileName: targetFile, traderId: targetTrader.id, items: [] };
      targetTrader.categories.push(targetCategory);
    }

    item.traderId = targetTrader.id;
    item.traderName = targetTrader.name;
    item.category = categoryName;
    item.fileName = targetFile;
    targetCategory.items.push(item);
    moved += 1;
    if (moved % 20 === 0 || moved === movable.length) {
      updateTaskProgress(moved, movable.length);
      addTaskLog(`Перенесено строк техники: ${moved}/${movable.length}.`);
    }
  }

  for (const trader of state.traders) {
    trader.categories = trader.categories.filter((category) => category.items.length || trader.fileName === targetFile);
  }

  markChanged();
  commitOutputToFileTexts();
  updateTaskProgress(1, 1);
  addTaskLog(`Готово: техника перенесена в ${outputPathFor(targetFile)}.`);
  if (state.loadedWithHandles) {
    const saveNow = confirm(`Файл ${outputPathFor(targetFile)} сейчас создан в программе, но чтобы он появился в папке на диске, нужно сохранить изменения.\n\nСохранить TraderConfig.txt и ${targetFile} сейчас?`);
    if (saveNow) await saveFiles({ ask: false, names: [sourceFile, targetFile] });
  } else {
    alert(`Вы загрузили отдельные файлы, поэтому браузер не может сам создать файл рядом на рабочем столе.\n\nСейчас программа скачает два нужных файла:\n- ${sourceFile}\n- ${targetFile}\n\nИх нужно положить рядом в папку Trader.`);
    downloadNamedFiles([sourceFile, targetFile]);
  }
}

function isVehicleTradeItem(item) {
  return item.quantity === "V" ||
    item.quantity === "VNK" ||
    /vehicle|vehicles|vehicle parts|cars|trucks|helicopters|boats/i.test(item.category) ||
    /offroad|hatchback|sedan|truck|boat|heli|mi17|mh6|xh9|g63/i.test(item.className);
}

function isSoldVehicleItem(item) {
  return item.quantity === "V" || item.quantity === "VNK";
}

function vehicleCategoryForItem(item) {
  const name = item.className.toLowerCase();
  if (item.quantity === "V" || item.quantity === "VNK") {
    if (/heli/.test(name)) return "Helicopters";
    if (/boat/.test(name)) return "Boats";
    return "Vehicles";
  }
  return "Vehicle Parts";
}

function renderMarkers() {
  const tbody = $("#markersTable tbody");
  const query = $("#markerSearch").value.trim().toLowerCase();
  const traderById = new Map(state.traders.map((trader) => [trader.id, trader]));
  const rows = state.markers.filter((marker) => {
    const trader = traderById.get(marker.id);
    const haystack = `${marker.id} ${trader?.name || ""} ${marker.npc} ${marker.position}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  tbody.innerHTML = "";
  for (const marker of rows) {
    const trader = traderById.get(marker.id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="mini" value="${escapeAttr(marker.id)}" data-edit-marker="${marker.lineStart}" data-field="id"></td>
      <td>${escapeHtml(trader?.name || "не найден")}</td>
      <td><input value="${escapeAttr(marker.npc)}" data-edit-marker="${marker.lineStart}" data-field="npc"></td>
      <td><input value="${escapeAttr(marker.position)}" data-edit-marker="${marker.lineStart}" data-field="position"></td>
      <td><input class="mini" type="number" value="${escapeAttr(marker.safezone)}" data-edit-marker="${marker.lineStart}" data-field="safezone"></td>
      <td><input value="${escapeAttr(marker.orientation)}" data-edit-marker="${marker.lineStart}" data-field="orientation"></td>
      <td><input value="${escapeAttr(marker.vehicleSpawn)}" data-edit-marker="${marker.lineStart}" data-field="vehicleSpawn"></td>
      <td><textarea data-edit-marker="${marker.lineStart}" data-field="attachments">${escapeHtml(marker.attachments.join("\n"))}</textarea></td>
      <td><button class="small-btn" data-delete-marker="${marker.lineStart}" type="button">Удалить</button></td>
    `;
    tbody.append(tr);
  }

  tbody.querySelectorAll("[data-edit-marker]").forEach((input) => {
    input.addEventListener("change", () => updateMarker(input.dataset.editMarker, input.dataset.field, input.value));
  });
  tbody.querySelectorAll("[data-delete-marker]").forEach((button) => {
    button.addEventListener("click", () => deleteMarker(button.dataset.deleteMarker));
  });
}

function updateMarker(lineStart, field, value) {
  const marker = state.markers.find((entry) => String(entry.lineStart) === String(lineStart));
  if (!marker) return;
  if (field === "attachments") {
    marker.attachments = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } else if (field === "id") {
    marker.id = asInt(value);
  } else if (field === "position" || field === "orientation" || field === "vehicleSpawn") {
    marker[field] = normalizeVector(value);
    if (field === "position") marker.objectPosition = marker.position;
  } else {
    marker[field] = value.trim();
  }
  markChanged();
}

function deleteMarker(lineStart) {
  if (!confirm("Удалить точку трейдера из TraderObjects?")) return;
  state.markers = state.markers.filter((marker) => String(marker.lineStart) !== String(lineStart));
  markChanged();
}

function renderVehicleParts() {
  const tbody = $("#vehiclePartsTable tbody");
  const query = $("#vehicleSearch").value.trim().toLowerCase();
  const rows = state.vehicleParts.filter((block) => {
    const haystack = `${block.vehicle} ${block.parts.join(" ")}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  tbody.innerHTML = "";
  for (const block of rows) {
    const ignored = state.ignoredUnsoldVehicleParts.has(block.vehicle.toLowerCase());
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${escapeAttr(block.vehicle)}" data-edit-vp="${block.id}" data-field="vehicle"></td>
      <td><textarea data-edit-vp="${block.id}" data-field="parts">${escapeHtml(block.parts.join("\n"))}</textarea></td>
      <td>${escapeHtml(block.fileName)}${ignored ? `<br><span class="issue-meta">игнорируется</span>` : ""}</td>
      <td>
        <button class="small-btn" data-toggle-ignore-vp="${block.id}" type="button">${ignored ? "Не игнорировать" : "Игнор"}</button>
        <button class="small-btn" data-delete-vp="${block.id}" type="button">Удалить</button>
      </td>
    `;
    tbody.append(tr);
  }

  tbody.querySelectorAll("[data-edit-vp]").forEach((input) => {
    input.addEventListener("change", () => updateVehicleParts(input.dataset.editVp, input.dataset.field, input.value));
  });
  tbody.querySelectorAll("[data-delete-vp]").forEach((button) => {
    button.addEventListener("click", () => deleteVehicleParts(button.dataset.deleteVp));
  });
  tbody.querySelectorAll("[data-toggle-ignore-vp]").forEach((button) => {
    button.addEventListener("click", () => toggleIgnoreVehicleParts(button.dataset.toggleIgnoreVp));
  });
}

function updateVehicleParts(id, field, value) {
  const block = state.vehicleParts.find((entry) => entry.id === id);
  if (!block) return;
  if (field === "parts") {
    block.parts = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } else {
    block[field] = value.trim();
  }
  markChanged();
}

function deleteVehicleParts(id) {
  if (!confirm("Удалить набор деталей техники?")) return;
  state.vehicleParts = state.vehicleParts.filter((block) => block.id !== id);
  markChanged();
  commitOutputToFileTexts();
}

function toggleIgnoreVehicleParts(id) {
  const block = state.vehicleParts.find((entry) => entry.id === id);
  if (!block) return;
  const key = block.vehicle.toLowerCase();
  if (state.ignoredUnsoldVehicleParts.has(key)) {
    state.ignoredUnsoldVehicleParts.delete(key);
    addTaskLog(`Предупреждение возвращено: ${block.vehicle}.`);
  } else {
    state.ignoredUnsoldVehicleParts.add(key);
    addTaskLog(`Предупреждение игнорируется: ${block.vehicle}.`);
  }
  saveIgnoredSettings();
  state.issues = findIssues();
  renderAll();
}

function ignoreUnsoldVehiclePart(vehicle) {
  state.ignoredUnsoldVehicleParts.add(String(vehicle).toLowerCase());
  saveIgnoredSettings();
  state.issues = findIssues();
  renderAll();
  addTaskLog(`Набор деталей помечен как намеренный: ${vehicle}.`);
}

function ignoreAllUnsoldVehicleParts() {
  const sold = new Set(state.items.filter((item) => item.quantity === "V" || item.quantity === "VNK").map((item) => item.className.toLowerCase()));
  const unsold = state.vehicleParts.filter((block) => !sold.has(block.vehicle.toLowerCase()) && !state.ignoredUnsoldVehicleParts.has(block.vehicle.toLowerCase()));
  if (!unsold.length) {
    resetTaskLog("Игнор лишних VehicleParts");
    updateTaskProgress(1, 1);
    addTaskLog("Новых лишних наборов деталей нет.");
    return;
  }
  if (!confirm(`Игнорировать ${unsold.length} наборов деталей без продажи? Это удобно для донатного транспорта и заготовок, которые должны лежать в TraderVehicleParts, но не продаваться.`)) return;
  resetTaskLog("Игнор лишних VehicleParts");
  unsold.forEach((block, index) => {
    state.ignoredUnsoldVehicleParts.add(block.vehicle.toLowerCase());
    updateTaskProgress(index + 1, unsold.length);
  });
  saveIgnoredSettings();
  state.issues = findIssues();
  renderAll();
  addTaskLog(`Готово: игнорируется ${unsold.length} наборов деталей без продажи.`);
}

function missingVehiclePartItems() {
  const existing = new Set(state.vehicleParts.map((block) => block.vehicle.toLowerCase()));
  const result = [];
  const seen = new Set();
  for (const item of state.items) {
    if (item.quantity !== "V" && item.quantity !== "VNK") continue;
    const key = item.className.toLowerCase();
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function createMissingVehicleParts() {
  const missing = missingVehiclePartItems();
  if (!missing.length) {
    resetTaskLog("Создание VehicleParts");
    updateTaskProgress(1, 1);
    addTaskLog("Недостающих наборов деталей нет.");
    return;
  }
  if (!confirm(`Создать ${missing.length} недостающих блоков <VehicleParts>? Если найдется похожий транспорт, детали будут скопированы с него. Иначе будет создан черновой набор, который можно поправить во вкладке Техника.`)) return;
  resetTaskLog("Создание VehicleParts");
  updateTaskProgress(0, missing.length);
  let created = 0;
  for (const item of missing) {
    createVehiclePartsForItem(item, false);
    created += 1;
    updateTaskProgress(created, missing.length);
  }
  markChanged();
  commitOutputToFileTexts();
  addTaskLog(`Готово: создано наборов деталей ${created}.`);
}

function createVehiclePartsForItem(item, rerender = true) {
  const fileName = firstVehiclePartsFile();
  ensureFile(fileName);
  const existing = state.vehicleParts.find((block) => block.vehicle.toLowerCase() === item.className.toLowerCase());
  if (existing) return existing;
  const block = {
    id: cryptoId(),
    vehicle: item.className,
    parts: suggestVehicleParts(item.className),
    fileName
  };
  state.vehicleParts.push(block);
  if (rerender) {
    markChanged();
    commitOutputToFileTexts();
    addTaskLog(`Создан набор деталей: ${item.className}.`);
  }
  return block;
}

function suggestVehicleParts(className) {
  const similar = findSimilarVehicleParts(className);
  if (similar) return [...similar.parts];

  const name = String(className).toLowerCase();
  if (/heli|mh6|mi17|uh1|black[_-]?hawk|ec135|xh9|sib/i.test(name)) {
    return ["SparkPlug", "TruckBattery"];
  }
  if (/boat|raft|ship/i.test(name)) {
    return ["SparkPlug", "CarBattery"];
  }
  if (/truck|btr|tigr|typhoon|ural|kamaz/i.test(name)) {
    return ["SparkPlug", "TruckBattery", "CarRadiator"];
  }
  return ["SparkPlug", "CarBattery", "CarRadiator"];
}

function findSimilarVehicleParts(className) {
  const target = normalizeVehicleFamily(className);
  let best = null;
  let bestScore = 0;
  for (const block of state.vehicleParts) {
    const family = normalizeVehicleFamily(block.vehicle);
    if (!family || family === target) return block;
    const score = commonPrefixLength(target, family);
    if (score > bestScore && score >= 8) {
      best = block;
      bestScore = score;
    }
  }
  return best;
}

function normalizeVehicleFamily(value) {
  return String(value)
    .toLowerCase()
    .replace(/_(black|white|red|blue|green|grey|gray|orange|yellow|tan|khaki|camo\d*|clear|stock|skin\d+|blackm|white2|black2)$/i, "")
    .replace(/[^a-z0-9]+/g, "_");
}

function commonPrefixLength(left, right) {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left[index] === right[index]) index += 1;
  return index;
}

function renderVariables() {
  const tbody = $("#variablesTable tbody");
  tbody.innerHTML = "";
  for (const variable of state.variables) {
    const label = VARIABLE_LABELS[variable.key] || "Дополнительный параметр";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(label)}</strong><br><span class="issue-meta">${escapeHtml(variable.key)}</span></td>
      <td><input value="${escapeAttr(variable.value)}" data-edit-var="${escapeAttr(variable.key)}"></td>
      <td>${escapeHtml(VARIABLE_HINTS[variable.key] || "Параметр TraderVariables.")}</td>
    `;
    tbody.append(tr);
  }
  tbody.querySelectorAll("[data-edit-var]").forEach((input) => {
    input.addEventListener("change", () => {
      const variable = state.variables.find((entry) => entry.key === input.dataset.editVar);
      if (variable) {
        variable.value = input.value.trim();
        markChanged();
      }
    });
  });
}

function renderIssues() {
  const list = $("#issuesList");
  $("#copyReportBtn").disabled = state.issues.length === 0;
  $("#downloadReportBtn").disabled = state.issues.length === 0;
  $("#fixSafeBtn").disabled = !state.issues.some((item) => item.fixes.some((fix) => fix.safe));

  if (!state.issues.length) {
    list.className = "issue-list empty";
    list.textContent = state.files.size ? "Ошибок не найдено." : "Ошибки появятся после анализа.";
    return;
  }

  list.className = "issue-list";
  list.innerHTML = "";
  const counts = issueCounts();
  if (!counts.problem && counts.info) {
    const note = document.createElement("div");
    note.className = "issue info";
    note.innerHTML = `
      <div class="issue-title">Критичных проблем не найдено</div>
      <div>Ошибок и предупреждений нет. Ниже показаны информационные заметки, которые можно игнорировать или обработать вручную.</div>
      <div class="issue-meta">информация</div>
    `;
    list.append(note);
  }
  for (const item of state.issues) {
    const card = document.createElement("div");
    card.className = `issue ${item.severity}`;
    card.innerHTML = `
      <div class="issue-title">${escapeHtml(item.title)}</div>
      <div>${escapeHtml(item.detail)}</div>
      <div class="issue-meta">${escapeHtml(item.fileName)}${item.lineNo ? `:${item.lineNo}` : ""} · ${escapeHtml(SEVERITY_LABELS[item.severity] || item.severity)}</div>
    `;
    for (const fix of item.fixes) {
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.type = "button";
      btn.textContent = fix.label;
      btn.addEventListener("click", async () => {
        if (confirm(`Применить исправление: ${fix.label}?`)) await fix.apply();
      });
      card.append(btn);
    }
    list.append(card);
  }
}

function addTraderDialog() {
  openDialog("Новый трейдер", [
    field("name", "Имя трейдера", "New Trader"),
    field("fileName", "Файл", state.configFiles[0] || "TraderConfig.txt", "select", state.configFiles)
  ], (data) => {
    const id = state.traders.length ? Math.max(...state.traders.map((t) => t.id)) + 1 : 0;
    const fileName = data.fileName || state.configFiles[0] || "TraderConfig.txt";
    ensureFile(fileName);
    state.traders.push({ id, name: data.name || `Trader ${id}`, fileName, categories: [] });
    if (!state.configFiles.includes(fileName)) state.configFiles.push(fileName);
    markChanged();
  });
}

function addCategoryDialog() {
  openDialog("Новая категория", [
    field("traderId", "Trader ID", state.traders[0]?.id ?? 0, "select", state.traders.map((t) => ({ value: t.id, label: `${t.id}: ${t.name}` }))),
    field("name", "Название категории", "New Category")
  ], (data) => {
    const trader = state.traders.find((entry) => String(entry.id) === String(data.traderId));
    if (!trader) return;
    if (!trader.categories.some((cat) => cat.name === data.name)) {
      trader.categories.push({ name: data.name || "New Category", fileName: trader.fileName, traderId: trader.id, items: [] });
      markChanged();
    }
  });
}

function addItemDialog() {
  openDialog("Новый товар", [
    field("traderId", "Trader ID", state.traders[0]?.id ?? 0, "select", state.traders.map((t) => ({ value: t.id, label: `${t.id}: ${t.name}` }))),
    field("category", "Категория", state.traders[0]?.categories[0]?.name || "New Category"),
    field("className", "Classname", ""),
    field("quantity", "Quantity", "*", "select", Object.keys(BUY_HINTS)),
    field("buyPrice", "Цена покупки", "100", "number"),
    field("sellPrice", "Цена продажи", "50", "number")
  ], (data) => {
    const trader = state.traders.find((entry) => String(entry.id) === String(data.traderId));
    if (!trader || !data.className) return;
    let category = trader.categories.find((entry) => entry.name === data.category);
    if (!category) {
      category = { name: data.category || "New Category", fileName: trader.fileName, traderId: trader.id, items: [] };
      trader.categories.push(category);
    }
    const item = {
      id: cryptoId(),
      traderId: trader.id,
      traderName: trader.name,
      category: category.name,
      className: data.className.trim(),
      quantity: data.quantity || "*",
      buyPrice: Number(data.buyPrice),
      sellPrice: Number(data.sellPrice),
      fileName: trader.fileName,
      lineNo: 0
    };
    category.items.push(item);
    state.items.push(item);
    markChanged();
  });
}

function addMarkerDialog() {
  openDialog("Новая точка трейдера", [
    field("id", "Trader ID", state.traders[0]?.id ?? 0, "select", state.traders.map((t) => ({ value: t.id, label: `${t.id}: ${t.name}` }))),
    field("npc", "NPC/Object classname", "SurvivorM_Mirek"),
    field("position", "Позиция X, Y, Z", "0, 0, 0"),
    field("safezone", "Safezone radius", "0", "number"),
    field("orientation", "Ориентация yaw, pitch, roll", "0, 0, 0"),
    field("vehicleSpawn", "Spawn техники, если нужен", ""),
    field("attachments", "Вложения NPC, по одному в строке", "", "textarea")
  ], (data) => {
    ensureFile("TraderObjects.txt");
    state.markers.push({
      id: asInt(data.id),
      npc: data.npc || "SurvivorM_Mirek",
      position: normalizeVector(data.position || "0, 0, 0"),
      objectPosition: normalizeVector(data.position || "0, 0, 0"),
      safezone: data.safezone || "0",
      orientation: normalizeVector(data.orientation || "0, 0, 0"),
      vehicleSpawn: normalizeVector(data.vehicleSpawn || ""),
      vehicleSpawnOri: data.vehicleSpawn ? "0, 0, 0" : "",
      attachments: data.attachments.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      lineStart: `new-${cryptoId()}`,
      lineEnd: 0,
      refs: {}
    });
    markChanged();
  });
}

function addVehiclePartsDialog() {
  openDialog("Новый набор деталей", [
    field("fileName", "Файл", firstVehiclePartsFile(), "select", vehiclePartsFiles()),
    field("vehicle", "Classname техники", ""),
    field("parts", "Детали, по одной в строке", "SparkPlug", "textarea")
  ], (data) => {
    if (!data.vehicle) return;
    ensureFile(data.fileName || "TraderVehicleParts.txt");
    state.vehicleParts.push({
      id: cryptoId(),
      vehicle: data.vehicle.trim(),
      parts: data.parts.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      fileName: data.fileName || "TraderVehicleParts.txt"
    });
    markChanged();
  });
}

function firstVehiclePartsFile() {
  return vehiclePartsFiles()[0] || "TraderVehicleParts.txt";
}

function vehiclePartsFiles() {
  const files = [...state.files.keys()].filter((name) => /^TraderVehicleParts.*\.txt$/i.test(name));
  return files.length ? files : ["TraderVehicleParts.txt"];
}

function ensureFile(name) {
  if (!state.files.has(name)) {
    state.files.set(name, { name, path: `${traderFolderPrefix()}${name}`, text: "", handle: null });
    addTaskLog(`Создан файл в проекте: ${outputPathFor(name)}.`);
  }
}

function traderFolderPrefix() {
  const main = state.files.get("TraderConfig.txt");
  const path = main?.path || "";
  const normalized = path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index + 1) : "";
}

function outputPathFor(name) {
  return state.files.get(name)?.path || `${traderFolderPrefix()}${name}`;
}

function field(name, label, value = "", type = "text", options = []) {
  return { name, label, value, type, options };
}

function openDialog(title, fields, onSubmit) {
  const dialog = $("#editDialog");
  $("#dialogTitle").textContent = title;
  const body = $("#dialogBody");
  body.innerHTML = "";
  for (const item of fields) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.textContent = item.label;
    label.htmlFor = `field-${item.name}`;
    let input;
    if (item.type === "textarea") {
      input = document.createElement("textarea");
      input.value = item.value || "";
    } else if (item.type === "select") {
      input = document.createElement("select");
      for (const option of item.options || []) {
        const value = typeof option === "object" ? option.value : option;
        const text = typeof option === "object" ? option.label : option;
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = text;
        input.append(opt);
      }
      input.value = item.value;
    } else {
      input = document.createElement("input");
      input.type = item.type;
      input.value = item.value || "";
    }
    input.id = `field-${item.name}`;
    input.name = item.name;
    wrap.append(label, input);
    body.append(wrap);
  }

  dialog.onclose = () => {
    if (dialog.returnValue !== "ok") return;
    const data = {};
    body.querySelectorAll("[name]").forEach((input) => data[input.name] = input.value);
    onSubmit(data);
  };
  dialog.showModal();
}

function markChanged() {
  state.changed = true;
  if (state.isBatching) {
    setStatus("Выполняется пакетная операция...");
    return;
  }
  state.issues = findIssues();
  renderAll();
  setStatus("Есть несохраненные изменения.");
}

function buildOutputFiles() {
  const outputs = new Map([...state.files.entries()].map(([name, file]) => [name, file.text]));

  for (const fileName of state.configFiles) {
    outputs.set(fileName, renderConfigFile(fileName));
  }

  if (state.files.has("TraderObjects.txt")) {
    outputs.set("TraderObjects.txt", renderTraderObjects());
  }

  if (state.files.has("TraderVariables.txt")) {
    outputs.set("TraderVariables.txt", renderVariablesFile());
  }

  for (const fileName of vehiclePartsFiles()) {
    outputs.set(fileName, renderVehiclePartsFile(fileName));
  }

  return outputs;
}

function commitOutputToFileTexts() {
  const outputs = buildOutputFiles();
  for (const [name, text] of outputs.entries()) {
    const file = state.files.get(name);
    if (file) file.text = text;
  }
}

function renderConfigFile(fileName) {
  const chunks = [];
  if (fileName === state.configFiles[0] && (state.currencyName || state.currencies.length)) {
    chunks.push(`<CurrencyName> ${state.currencyName || "#tm_ruble"}`);
    for (const currency of state.currencies) {
      chunks.push(`\t<Currency> ${pad(currency.className, 24)}, ${currency.value}`);
    }
    chunks.push("");
  }

  for (const trader of state.traders.filter((entry) => entry.fileName === fileName)) {
    chunks.push(`//Marker ${trader.id}`);
    chunks.push(`<Trader> ${trader.name}`);
    for (const category of trader.categories) {
      chunks.push(`\t<Category> ${category.name}`);
      for (const item of category.items) {
        chunks.push(`\t\t${pad(item.className, 32)}, ${pad(item.quantity, 4)}, ${pad(item.buyPrice, 8)}, ${item.sellPrice}`);
      }
      chunks.push("");
    }
  }

  const links = state.openFiles.get(fileName) || [];
  for (const link of links) chunks.push(`<OpenFile> ${link}`);
  if (state.fileEnds.get(fileName) || fileName === state.configFiles[state.configFiles.length - 1]) {
    chunks.push("<FileEnd>");
  }
  return chunks.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function renderTraderObjects() {
  const source = state.files.get("TraderObjects.txt")?.text || "";
  if (!source.trim()) {
    return renderAllMarkersOnly();
  }

  const lines = source.split(/\r?\n/);
  const originalMarkers = parseTraderObjects(source);
  const currentByStart = new Map(state.markers.filter((marker) => typeof marker.lineStart === "number").map((marker) => [marker.lineStart, marker]));
  const originalByStart = new Map(originalMarkers.map((marker) => [marker.lineStart, marker]));
  const originalByObjectStart = new Map(originalMarkers
    .filter((marker) => typeof marker.objectLineStart === "number" && !marker.hasInlineObject)
    .map((marker) => [marker.objectLineStart, marker]));
  const newMarkers = state.markers.filter((marker) => typeof marker.lineStart !== "number");
  const output = [];
  let insertedNew = false;

  for (let i = 1; i <= lines.length; i++) {
    const original = originalByStart.get(i);
    if (original) {
      const current = currentByStart.get(i);
      if (current) output.push(...renderMarkerBlock(current, current.hasInlineObject || !current.objectLineStart));
      i = original.lineEnd;
      continue;
    }

    const originalObject = originalByObjectStart.get(i);
    if (originalObject) {
      const current = currentByStart.get(originalObject.lineStart);
      if (current) output.push(...renderObjectBlock(current));
      i = originalObject.objectLineEnd;
      continue;
    }

    const clean = stripComment(lines[i - 1]).trim();
    if (!insertedNew && /^<FileEnd>/i.test(clean)) {
      for (const marker of newMarkers) output.push("", ...renderMarkerBlock(marker, true));
      insertedNew = true;
    }
    output.push(lines[i - 1]);
  }

  if (!insertedNew) {
    for (const marker of newMarkers) output.push("", ...renderMarkerBlock(marker, true));
    output.push("<FileEnd>");
  }
  return output.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function renderAllMarkersOnly() {
  const chunks = ["// Trader markers generated by Trader Tool"];
  for (const marker of state.markers) {
    chunks.push("", ...renderMarkerBlock(marker, true));
  }
  chunks.push("", "<FileEnd>");
  return chunks.join("\n") + "\n";
}

function renderMarkerBlock(marker, includeObject = true) {
  const traderById = new Map(state.traders.map((trader) => [trader.id, trader]));
  const name = traderById.get(marker.id)?.name || `Trader ${marker.id}`;
  const chunks = [
    `// ${name}`,
    `<TraderMarker>\t\t\t${marker.id}`,
    `<TraderMarkerPosition>\t${marker.position}`,
    `<TraderMarkerSafezone>\t${marker.safezone || 0}`
  ];
  if (marker.vehicleSpawn) {
    chunks.push(`<VehicleSpawn>\t\t\t${marker.vehicleSpawn}`);
    chunks.push(`<VehicleSpawnOri>\t\t${marker.vehicleSpawnOri || "0, 0, 0"}`);
  }
  if (includeObject) chunks.push(...renderObjectBlock(marker));
  return chunks;
}

function renderObjectBlock(marker) {
  const chunks = [
    `<Object>\t\t\t\t${marker.npc || "SurvivorM_Mirek"}`,
    `<ObjectPosition>\t\t${marker.objectPosition || marker.position}`,
    `<ObjectOrientation>\t${marker.orientation || "0, 0, 0"}`
  ];
  for (const attachment of marker.attachments) {
    chunks.push(`<ObjectAttachment>\t${attachment}`);
  }
  return chunks;
}

function renderVariablesFile() {
  const chunks = state.variables.map((variable) => `<${variable.key}> ${variable.value}`);
  chunks.push("");
  chunks.push("<FileEnd>");
  return chunks.join("\n") + "\n";
}

function renderVehiclePartsFile(fileName) {
  const chunks = [];
  for (const block of state.vehicleParts.filter((entry) => entry.fileName === fileName)) {
    chunks.push(`<VehicleParts> ${block.vehicle}`);
    for (const part of block.parts) chunks.push(`\t${part}`);
    chunks.push("");
  }
  const links = scanOpenFiles(state.files.get(fileName)?.text || "");
  for (const link of links) chunks.push(`<OpenFile> ${link}`);
  if (hasActiveFileEnd(state.files.get(fileName)?.text || "") || !links.length) chunks.push("<FileEnd>");
  return chunks.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function pad(value, size) {
  const text = String(value);
  return text + " ".repeat(Math.max(1, size - text.length));
}

async function getWritableHandleForOutput(name) {
  const file = state.files.get(name);
  if (file?.handle) return file.handle;
  if (!state.rootHandle) return null;

  const outputPath = outputPathFor(name);
  const segments = outputPath.replaceAll("\\", "/").split("/").filter(Boolean);
  const fileName = segments.pop() || name;
  let directory = state.rootHandle;

  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }

  const handle = await directory.getFileHandle(fileName, { create: true });
  const record = file || { name, path: outputPath, text: "", handle: null };
  record.handle = handle;
  record.path = outputPath;
  state.files.set(name, record);
  return handle;
}

async function saveFiles(options = {}) {
  const ask = options?.ask !== false;
  const onlyNames = Array.isArray(options?.names) ? new Set(options.names) : null;
  if (!state.loadedWithHandles) {
    alert("Эти файлы были загружены без доступа на запись. Используйте кнопку `Скачать файлы`.");
    return;
  }
  if (ask && !confirm("Сохранить изменения в выбранную папку? Сделайте резервную копию перед заменой на сервере.")) return;
  resetTaskLog("Сохранение файлов");
  const outputs = onlyNames ? new Map([...buildOutputFiles()].filter(([name]) => onlyNames.has(name))) : buildOutputFiles();
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  updateTaskProgress(0, outputs.size);
  for (const [name, text] of outputs.entries()) {
    try {
      const handle = await getWritableHandleForOutput(name);
      if (!handle) {
        skipped += 1;
        addTaskLog(`Пропущен ${name}: нет доступа на запись, используйте "Скачать файлы".`);
        updateTaskProgress(saved + skipped + failed, outputs.size);
        continue;
      }
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      const record = state.files.get(name);
      if (record) record.text = text;
      saved += 1;
      addTaskLog(`Сохранен: ${outputPathFor(name)}.`);
    } catch (error) {
      failed += 1;
      addTaskLog(`Ошибка сохранения ${name}: ${error.message}`);
    }
    updateTaskProgress(saved + skipped + failed, outputs.size);
  }
  state.changed = skipped > 0 || failed > 0;
  analyzeLoadedFiles();
  setStatus("Файлы сохранены.");
  state.changed = skipped > 0 || failed > 0;
  renderAll();
  addTaskLog(`Готово: сохранено ${saved}, пропущено ${skipped}, ошибок ${failed}.`);
  setStatus(skipped || failed ? "Часть файлов не сохранена. Смотрите журнал задач." : "Файлы сохранены.");
  if (skipped || failed) {
    alert(`Сохранение выполнено не полностью.\n\nСохранено: ${saved}\nПропущено: ${skipped}\nОшибок: ${failed}\n\nПодробности в журнале задач. Если файлы были выбраны отдельно, используйте "Скачать файлы".`);
  }
}

function downloadFiles() {
  resetTaskLog("Скачивание файлов");
  const outputs = buildOutputFiles();
  let processed = 0;
  let downloaded = 0;
  updateTaskProgress(0, outputs.size);
  for (const [name, text] of outputs.entries()) {
    processed += 1;
    if (!/\.txt$/i.test(name)) {
      updateTaskProgress(processed, outputs.size);
      continue;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
    downloaded += 1;
    addTaskLog(`Скачан файл: ${name}.`);
    updateTaskProgress(processed, outputs.size);
  }
  addTaskLog(`Готово: скачано ${downloaded} txt-файлов. Новые файлы, например TraderConfig_Vehicles.txt, будут среди скачанных.`);
  setStatus("Файлы скачаны через браузер.");
}

function downloadNamedFiles(names) {
  commitOutputToFileTexts();
  const wanted = new Set(names);
  const outputs = new Map([...buildOutputFiles()].filter(([name]) => wanted.has(name)));
  resetTaskLog("Скачивание нужных файлов");
  updateTaskProgress(0, outputs.size || 1);
  let downloaded = 0;
  for (const [name, text] of outputs.entries()) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
    downloaded += 1;
    addTaskLog(`Скачан файл: ${name}.`);
    updateTaskProgress(downloaded, outputs.size);
  }
  addTaskLog(`Готово: скачано ${downloaded} файлов. Положите их рядом в папку Trader.`);
  setStatus("Нужные файлы скачаны через браузер.");
}

async function applySafeFixes() {
  const fixes = state.issues.flatMap((item) => item.fixes.filter((fix) => fix.safe).map((fix) => ({ item, fix })));
  if (!fixes.length) {
    resetTaskLog("Безопасные исправления");
    updateTaskProgress(1, 1);
    addTaskLog("Безопасных исправлений нет.");
    return;
  }
  const text = fixes.map(({ item, fix }) => `- ${item.title}: ${fix.label}`).join("\n");
  if (!confirm(`Программа может применить такие исправления:\n\n${text}\n\nПрименить?`)) return;
  resetTaskLog("Безопасные исправления");
  updateTaskProgress(0, fixes.length);
  const button = $("#fixSafeBtn");
  if (button) button.disabled = true;
  state.isBatching = true;
  let applied = 0;
  let failed = 0;
  try {
    for (const { item, fix } of fixes) {
      try {
        fix.apply();
        applied += 1;
        addTaskLog(`${applied + failed}/${fixes.length}: ${item.title} -> ${fix.label}.`);
      } catch (error) {
        failed += 1;
        addTaskLog(`${applied + failed}/${fixes.length}: ошибка - ${error.message}`);
      }
      updateTaskProgress(applied + failed, fixes.length);
      if ((applied + failed) % 10 === 0) await nextFrame();
    }
  } finally {
    state.isBatching = false;
    if (button) button.disabled = false;
  }
  state.changed = applied > 0 || state.changed;
  if (applied > 0) {
    commitOutputToFileTexts();
    addTaskLog("Исправления перенесены в текст загруженных файлов. Повторная проверка не откатит их.");
  }
  state.issues = findIssues();
  renderAll();
  addTaskLog(`Готово: применено ${applied}, ошибок выполнения ${failed}, осталось проблем ${state.issues.length}.`);
  setStatus("Безопасные исправления применены.");
}

async function copyIssueReport() {
  await navigator.clipboard.writeText(buildIssueReport());
  setStatus("Отчет скопирован.");
}

function downloadIssueReport() {
  const blob = new Blob([buildIssueReport()], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `TraderTool_Report_${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildIssueReport() {
  const counts = issueCounts();
  const header = [
    "DayZ Trader Tool - отчет проверки",
    `Дата: ${new Date().toLocaleString("ru-RU")}`,
    `Файлов: ${state.files.size}`,
    `Трейдеров: ${state.traders.length}`,
    `Товаров: ${state.items.length}`,
    `Ошибок: ${counts.error}`,
    `Предупреждений: ${counts.warning}`,
    `Информации: ${counts.info}`,
    ""
  ];
  const lines = state.issues.map((item) =>
    `[${SEVERITY_LABELS[item.severity] || item.severity}] ${item.fileName}${item.lineNo ? `:${item.lineNo}` : ""} - ${item.title}: ${item.detail}`
  );
  return [...header, ...lines].join("\n");
}

function setStatus(text) {
  $("#saveStatus").textContent = text;
}

function resetTaskLog(title = "Задача") {
  state.taskLog = [`${new Date().toLocaleTimeString("ru-RU")} - ${title}`];
  updateTaskLog();
  updateTaskProgress(0, 1);
}

function addTaskLog(message) {
  state.taskLog.push(`${new Date().toLocaleTimeString("ru-RU")} - ${message}`);
  if (state.taskLog.length > 80) state.taskLog = state.taskLog.slice(-80);
  updateTaskLog();
}

function updateTaskLog() {
  const log = $("#taskLog");
  if (!log) return;
  log.innerHTML = state.taskLog.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  log.scrollTop = log.scrollHeight;
}

function updateTaskProgress(done, total) {
  const max = Math.max(1, Number(total) || 1);
  const value = Math.max(0, Math.min(100, Math.round((Number(done) || 0) / max * 100)));
  const bar = $("#taskProgress");
  const percent = $("#taskPercent");
  if (bar) bar.style.width = `${value}%`;
  if (percent) percent.textContent = `${value}%`;
}

function nextFrame() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function renderGuide(section) {
  const guides = {
    start: `
      <h3>Быстрый старт</h3>
      <ol>
        <li>Сделайте копию папки <code>profiles/Trader</code> или файлов из <code>@Trader/extras/Trader</code>.</li>
        <li>Нажмите <code>Открыть папку</code> и выберите папку, где лежат <code>TraderConfig.txt</code>, <code>TraderObjects.txt</code>, <code>TraderVariables.txt</code>.</li>
        <li>Откройте вкладку <code>Ошибки</code> и сначала исправьте красные ошибки.</li>
        <li>Во вкладке <code>Товары</code> меняйте цены, запрет покупки или запрет продажи.</li>
        <li>Сохраните файлы и перенесите их в профиль сервера. Перед запуском держите резервную копию.</li>
      </ol>
      <p>Программа не придумывает classnames. Если предмет из другого мода не существует на сервере или у клиента нет этого мода, Trader его не починит.</p>
    `,
    program: `
      <h3>Возможности программы</h3>
      <p>Trader Tool сделан как локальный редактор конфигов DayZ Trader. Он читает ваши файлы, строит понятную структуру и помогает исправлять ошибки до запуска сервера.</p>
      <h4>Основные возможности</h4>
      <ul>
        <li>Загрузка всей папки Trader или отдельных <code>.txt</code>/<code>.xml</code> файлов.</li>
        <li>Разбор цепочки <code>TraderConfig.txt</code> через <code>&lt;OpenFile&gt;</code>.</li>
        <li>Отображение структуры <code>Trader ID -> категории -> товары -> marker на карте</code>.</li>
        <li>Редактирование цен, количества, покупки и продажи.</li>
        <li>Создание трейдеров, категорий, товаров, NPC-точек и наборов деталей техники.</li>
        <li>Перенос категорий между трейдерами, включая машины, вертолеты, лодки и vehicle parts.</li>
        <li>Создание отдельного <code>TraderConfig_Vehicles.txt</code> и перенос техники из основного конфига.</li>
        <li>Проверка эталонных файлов, ID, marker, цен, <code>VehicleSpawn</code> и <code>VehicleParts</code>.</li>
        <li>Скачивание исправленных файлов и отчета проверки.</li>
      </ul>
      <p>Программа работает локально в браузере. Она не отправляет файлы в интернет и не меняет исходники без вашего сохранения или скачивания результата.</p>
    `,
    workflow: `
      <h3>Порядок работы</h3>
      <ol>
        <li>Сначала сделайте резервную копию рабочей папки Trader.</li>
        <li>Откройте папку через <code>Открыть папку</code>. Лучше выбирать всю папку <code>profiles/Trader</code> или <code>@Trader/extras/Trader</code>, а не один файл.</li>
        <li>Откройте <code>Обзор</code> и проверьте, сколько найдено файлов, трейдеров, товаров, marker и наборов деталей.</li>
        <li>Откройте <code>Ошибки</code>. Сначала исправляйте красные ошибки, потом желтые предупреждения.</li>
        <li>Откройте <code>Структура</code>. Проверьте, что каждый ID имеет понятные категории и marker на карте.</li>
        <li>Если техника лежит в основном файле, нажмите <code>Создать Vehicle Trader</code> или <code>Перенести категории техники</code>.</li>
        <li>Во вкладке <code>Товары</code> настройте цены вручную или через массовые операции.</li>
        <li>Во вкладке <code>NPC и точки</code> проверьте координаты NPC, safezone и spawn техники.</li>
        <li>Скачайте отчет проверки, затем сохраните или скачайте исправленные файлы.</li>
        <li>После переноса на сервер проверьте запуск сервера и торговлю в игре.</li>
      </ol>
      <p>Если после массового переноса появился новый Trader ID, программа покажет предупреждение, если для него нет marker в <code>TraderObjects.txt</code>.</p>
    `,
    buttons: `
      <h3>Кнопки программы</h3>
      <h4>Обзор</h4>
      <ul>
        <li><code>Открыть папку</code> дает программе доступ к чтению и сохранению файлов.</li>
        <li><code>Выбрать файлы</code> подходит для ручной загрузки, но сохранение будет через скачивание.</li>
        <li><code>Загрузить пример из @Trader</code> открывает примерные файлы из папки мода.</li>
      </ul>
      <h4>Структура</h4>
      <ul>
        <li><code>Нормализовать ID</code> делает ID подряд от 0 и обновляет marker.</li>
        <li><code>Сортировать по ID</code> выравнивает порядок отображения.</li>
        <li><code>Создать Vehicle Trader</code> создает трейдера техники в <code>TraderConfig_Vehicles.txt</code>.</li>
        <li><code>Перенести категории техники</code> переносит найденные vehicle-категории к vehicle trader.</li>
        <li><code>Перенести</code> рядом с категорией переносит только выбранную категорию в выбранный ID.</li>
      </ul>
      <h4>Товары</h4>
      <ul>
        <li><code>Только проблемы</code> показывает подозрительные товары.</li>
        <li><code>Массовые цены</code> меняет цены только у видимых строк таблицы.</li>
        <li><code>Исправить перепродажу</code> убирает экономический абуз, когда продажа дороже покупки.</li>
        <li><code>Вынести технику</code> создает/использует <code>TraderConfig_Vehicles.txt</code> и переносит vehicle-товары.</li>
        <li><code>Убрать дубли</code> удаляет повторные строки одного classname внутри одной категории, оставляя первую строку.</li>
        <li><code>Создать недостающие</code> во вкладке <code>Техника</code> создает блоки <code>&lt;VehicleParts&gt;</code> для продаваемой техники.</li>
        <li><code>Игнорировать лишние</code> помечает наборы деталей без продажи как намеренные, например для донатного транспорта.</li>
      </ul>
      <h4>Ошибки</h4>
      <ul>
        <li><code>Исправить безопасные</code> применяет только те правки, где программа не должна угадывать значения.</li>
        <li><code>Скопировать отчет</code> копирует диагностику в буфер обмена.</li>
        <li><code>Скачать отчет</code> сохраняет диагностику в текстовый файл.</li>
      </ul>
    `,
    checks: `
      <h3>Что проверяется</h3>
      <ul>
        <li>Загружены ли эталонные файлы Trader: <code>TraderConfig.txt</code>, <code>TraderObjects.txt</code>, <code>TraderVariables.txt</code>, <code>TraderConfig_Vehicles.txt</code>, <code>TraderVehicleParts.txt</code>.</li>
        <li>Найдены ли файлы, указанные через <code>&lt;OpenFile&gt;</code>.</li>
        <li>Стоит ли <code>&lt;FileEnd&gt;</code> в нужных файлах.</li>
        <li>Нет ли активных многострочных комментариев <code>/* */</code>, которые Trader не любит.</li>
        <li>Все ли строки товаров имеют 4 поля: classname, quantity, buy, sell.</li>
        <li>Не стоит ли продажа дороже покупки.</li>
        <li>Нет ли странного <code>Quantity</code> или цены ниже <code>-1</code>.</li>
        <li>Нет ли дублей товара внутри одной категории.</li>
        <li>Идут ли Trader ID подряд и нет ли дублей ID.</li>
        <li>Есть ли marker на карте для каждого трейдера.</li>
        <li>Нет ли marker, который ссылается на несуществующий Trader ID.</li>
        <li>Совпадают ли <code>TraderMarkerPosition</code> и <code>ObjectPosition</code>.</li>
        <li>Есть ли <code>VehicleSpawn</code> у трейдера, который продает технику.</li>
        <li>Есть ли <code>&lt;VehicleParts&gt;</code> для продаваемой техники.</li>
        <li>Нет ли наборов деталей для техники, которая вообще не продается.</li>
        <li>Не лежит ли техника в основном <code>TraderConfig.txt</code>, когда должен быть отдельный vehicle-конфиг.</li>
      </ul>
      <p>Красные ошибки лучше исправлять до запуска сервера. Желтые предупреждения часто не ломают запуск, но могут сломать экономику или удобство работы с Trader.</p>
    `,
    format: `
      <h3>Формат файлов</h3>
      <p>Основная цепочка начинается с <code>TraderConfig.txt</code>. Дополнительные файлы подключаются строкой <code>&lt;OpenFile&gt; TraderConfig_Vehicles.txt</code>.</p>
      <pre><code>&lt;Trader&gt; Weapon Trader
  &lt;Category&gt; Rifles
    SVD, *, 2500, 1200

&lt;OpenFile&gt; TraderConfig_Vehicles.txt
&lt;FileEnd&gt;</code></pre>
      <p><code>&lt;FileEnd&gt;</code> должен стоять в конце последнего файла цепочки. Многострочные комментарии <code>/* */</code> не используйте, для Trader безопасны только <code>//</code>.</p>
    `,
    ids: `
      <h3>Структура и ID</h3>
      <p>ID трейдера не записывается отдельным параметром в <code>TraderConfig.txt</code>. Первый блок <code>&lt;Trader&gt;</code> получает ID 0, второй ID 1, третий ID 2 и так дальше.</p>
      <ul>
        <li>Во вкладке <code>Структура</code> видно: ID, имя, файл, категории, количество товаров и наличие marker на карте.</li>
        <li>Изменение ID означает перенос блока <code>&lt;Trader&gt;</code> в другой порядок. Программа пересчитывает товары и обновляет ID в <code>TraderObjects.txt</code>.</li>
        <li>Категории можно переносить между трейдерами. Это удобно, если машины, вертолеты или лодки случайно лежат в основном торговце.</li>
        <li>После работы проверяйте вкладку <code>Ошибки</code>: каждый ID из конфига должен иметь marker на карте, а каждый marker должен ссылаться на существующий ID.</li>
      </ul>
      <p>Эталонная структура из примера Trader: основной <code>TraderConfig.txt</code>, отдельный <code>TraderConfig_Vehicles.txt</code>, <code>TraderVehicleParts.txt</code>, <code>TraderObjects.txt</code> и <code>TraderVariables.txt</code>.</p>
    `,
    items: `
      <h3>Товары и цены</h3>
      <p>Строка товара состоит из четырех полей: <code>Classname, Quantity, Buyvalue, Sellvalue</code>.</p>
      <ul>
        <li><code>Buyvalue = -1</code> означает, что предмет нельзя купить.</li>
        <li><code>Sellvalue = -1</code> означает, что предмет нельзя продать.</li>
        <li><code>*</code> означает обычный предмет с максимальным quantity.</li>
        <li><code>M</code> магазин, <code>W</code> оружие, <code>S</code> мясо, <code>V</code> техника с ключом, <code>VNK</code> техника без ключа.</li>
      </ul>
      <p>Если продажа дороже покупки, игроки смогут бесконечно зарабатывать на перепродаже. Программа показывает это как предупреждение.</p>
    `,
    bulk: `
      <h3>Массовые правки</h3>
      <p>Сначала отфильтруйте товары по трейдеру, файлу или поиску. Массовые кнопки работают только по видимым строкам таблицы.</p>
      <ul>
        <li><code>Только проблемы</code> показывает товары с риском: перепродажа в плюс, техника, общие категории и странный Quantity.</li>
        <li><code>Исправить перепродажу в видимых</code> ставит продажу 50% от покупки только там, где Sellvalue выше Buyvalue.</li>
        <li><code>Продажа 50% в видимых</code> пересчитывает Sellvalue для всех видимых товаров с разрешенной покупкой.</li>
        <li><code>Массовые цены</code> умеет умножать цены, запрещать покупку/продажу и округлять значения.</li>
        <li><code>Вынести технику</code> переносит vehicle-товары и детали в <code>TraderConfig_Vehicles.txt</code> после подтверждения.</li>
      </ul>
      <p>Перед массовой операцией лучше скачать отчет и держать резервную копию исходных файлов.</p>
    `,
    traders: `
      <h3>Расстановка NPC</h3>
      <p>Трейдер получает ID по порядку в конфиге: первый <code>&lt;Trader&gt;</code> это ID 0, второй ID 1. В <code>TraderObjects.txt</code> строка <code>&lt;TraderMarker&gt;</code> должна указывать этот ID.</p>
      <pre><code>&lt;TraderMarker&gt; 2
&lt;TraderMarkerPosition&gt; 3708.71, 403.153, 5974.79
&lt;TraderMarkerSafezone&gt; 0
&lt;Object&gt; SurvivorM_Seth
&lt;ObjectPosition&gt; 3708.71, 403.153, 5974.79
&lt;ObjectOrientation&gt; -51.969990, 0, 0</code></pre>
      <p><code>TraderMarkerPosition</code> и <code>ObjectPosition</code> должны совпадать полностью. Для нескольких торговых зон можно повторять тот же ID в разных местах.</p>
    `,
    vehicles: `
      <h3>Техника</h3>
      <p>Для продажи техники в товарах используйте <code>VNK</code> или <code>V</code>. Для каждой машины желательно иметь блок <code>&lt;VehicleParts&gt;</code>, который перечисляет детали, установленные после покупки.</p>
      <pre><code>&lt;VehicleParts&gt; OffroadHatchback
  SparkPlug
  CarBattery
  CarRadiator
  HatchbackWheel
  HatchbackWheel</code></pre>
      <p>Для vehicle trader в <code>TraderObjects.txt</code> добавьте <code>&lt;VehicleSpawn&gt;</code> и <code>&lt;VehicleSpawnOri&gt;</code>.</p>
      <p>Кнопка <code>Создать недостающие</code> берет продаваемую технику без <code>&lt;VehicleParts&gt;</code>. Если есть похожий блок деталей, программа копирует его. Если похожего нет, создается черновой набор из базовых деталей, который нужно проверить руками.</p>
      <p>Если набор деталей нужен для донатного или скрытого транспорта, который не продается в TraderConfig, используйте <code>Игнор</code> в строке набора или <code>Игнорировать лишние</code> для всех таких предупреждений.</p>
    `,
    errors: `
      <h3>Ошибки</h3>
      <p>Красные ошибки лучше исправлять до запуска сервера. Желтые предупреждения не всегда ломают Trader, но часто указывают на экономический абуз или неполную настройку.</p>
      <ul>
        <li>Нет <code>&lt;FileEnd&gt;</code>: добавьте в конец последнего файла.</li>
        <li>OpenFile не найден: загрузите файл или исправьте имя.</li>
        <li>Позиции NPC не совпадают: сделайте <code>ObjectPosition</code> равным <code>TraderMarkerPosition</code>.</li>
        <li>Classname с пробелом: почти всегда опечатка.</li>
      </ul>
    `,
    deploy: `
      <h3>Куда класть файлы</h3>
      <p>Если вы открыли папку кнопкой <code>Открыть папку</code>, новые файлы создаются внутри этой выбранной папки. Если <code>TraderConfig.txt</code> лежит в <code>extras/Trader</code>, то <code>TraderConfig_Vehicles.txt</code> будет сохранен рядом с ним: <code>extras/Trader/TraderConfig_Vehicles.txt</code>.</p>
      <p>Если вы выбрали отдельные файлы с рабочего стола кнопкой <code>Выбрать файлы</code>, браузер не дает программе самой создать соседний файл. В этом режиме нажмите <code>Скачать файлы</code>: среди скачанных будет новый <code>TraderConfig_Vehicles.txt</code>, а в <code>TraderConfig.txt</code> уже будет добавлен <code>&lt;OpenFile&gt; TraderConfig_Vehicles.txt</code>.</p>
      <p>Файлы из <code>@Trader/extras/Trader</code> обычно копируют в профиль сервера, в папку <code>profiles/Trader</code> или путь, указанный в инструкции конкретной сборки.</p>
      <p><code>trader_types.xml</code> относится к Central Economy. Его нужно объединять с <code>mpmissions/&lt;mission&gt;/db/types.xml</code> или подключать способом, который использует ваша миссия. Сам TraderConfig не заменяет economy types.</p>
      <p>Проверка в игре окончательная: сервер должен стартовать без ошибок, а клиент должен видеть меню торговли, NPC, safezone и выдачу техники.</p>
    `
  };
  $("#guideContent").innerHTML = guides[section] || guides.start;
}
