<div align="center">

# DayZ Trader Local Tool

### Локальный редактор и валидатор конфигов Trader для DayZ

**Русский** · [English](README.en.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)]()
[![Runtime](https://img.shields.io/badge/Runtime-Browser-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111)]()
[![Release](https://img.shields.io/badge/Release-v0.1.0-8b5cf6?style=for-the-badge)](../../releases)
[![UI](https://img.shields.io/badge/UI-RU-ef4444?style=for-the-badge)]()

Инструмент для владельцев DayZ-серверов и моддеров.
Загружает папку `@Trader`, разбирает конфиги, показывает трейдеров и категории,
находит ошибки, помогает исправлять цены, ID, NPC-точки, технику и VehicleParts.

Работает локально в браузере. Без облака, без аккаунта, без установки.

</div>

---

## Highlights

<table>
<tr>
<td width="33%" valign="top">

### Local first
Все файлы остаются на твоем ПК.
Программа не загружает Trader-конфиги на сервер и не требует интернета.

</td>
<td width="33%" valign="top">

### Trader-aware
Понимает `TraderConfig`, `<OpenFile>`, `TraderObjects`,
`TraderVariables`, `VehicleParts`, ID трейдеров и точки на карте.

</td>
<td width="33%" valign="top">

### Fix workflow
Показывает ошибки, журнал задач, прогресс операций
и предлагает безопасные исправления с понятным результатом.

</td>
</tr>
</table>

---

## Quick Start

```text
1. Скачай репозиторий или release-архив.
2. Запусти start_trader_tool.bat.
3. Откроется браузер:
   http://127.0.0.1:8765/index.html
4. Нажми "Открыть папку".
5. Выбери @Trader\extras\Trader или весь мод @Trader.
6. Проверь вкладку "Ошибки".
7. Исправь проблемы и сохрани/скачай готовые файлы.
```

> Важно: перед заменой файлов на живом сервере делай backup. Программа проверяет структуру и типовые ошибки Trader, но финальная проверка все равно должна быть в игре и RPT-логе.

---

## Tabs & Features

| Вкладка | Что делает |
|---|---|
| Overview | Сводка по файлам, трейдерам, категориям, товарам и ошибкам |
| Structure | Дерево `Trader ID -> категории -> товары`, перенос категорий, сортировка ID |
| Items | Таблица товаров, цены покупки/продажи, запрет покупки или продажи |
| NPC & Positions | `TraderObjects.txt`, marker, object position, safezone, vehicle spawn |
| Vehicles | `TraderVehicleParts.txt`, недостающие наборы деталей, лишние наборы |
| Variables | `TraderVariables.txt` с подсказками по параметрам |
| Issues | Ошибки, предупреждения, автоисправления, отчет проверки |
| Guide | Встроенный гайд по формату Trader и работе с программой |
| Task Log | Журнал выполнения: что программа делает, что сделала и что осталось |

---

## What It Can Fix

<details open>
<summary><b>TraderConfig and OpenFile chain</b></summary>

<br>

- Разбирает основной `TraderConfig.txt`.
- Находит и читает подключенные файлы через `<OpenFile>`.
- Показывает файлы, которые есть, но не подключены.
- Добавляет недостающий `<OpenFile>` для vehicle-конфига.
- Проверяет наличие `<FileEnd>`.
- Может создать `TraderConfig_Vehicles.txt` и перенести туда технику.

</details>

<details open>
<summary><b>Items, categories and prices</b></summary>

<br>

- Находит битые строки товаров.
- Показывает пустые или подозрительные classnames.
- Проверяет цену покупки и продажи.
- Находит перепродажу в плюс, когда игрок может фармить деньги.
- Удаляет дубли товаров внутри одной категории.
- Массово правит цены по фильтру.
- Включает или выключает покупку/продажу через `-1`.

</details>

<details>
<summary><b>Trader IDs and structure</b></summary>

<br>

- Показывает трейдеров по ID.
- Проверяет дубли и пропуски ID.
- Сортирует трейдеров по возрастанию.
- При переносе категорий следит за связью с `TraderObjects.txt`.
- Проверяет, есть ли точка на карте для каждого ID.

</details>

<details>
<summary><b>NPC, vending objects and positions</b></summary>

<br>

- Проверяет `TraderMarkerPosition`.
- Проверяет `ObjectPosition`.
- Показывает неполные точки трейдера.
- Находит marker без трейдера и трейдера без marker.
- Проверяет `Safezone`.
- Проверяет `TradingDistance`.
- Предупреждает, если несколько объектов стоят слишком близко и могут перехватывать interaction.

</details>

<details>
<summary><b>Vehicles and VehicleParts</b></summary>

<br>

- Находит технику в основном `TraderConfig.txt`.
- Предлагает перенести машины, вертолеты и лодки в отдельный vehicle config.
- Проверяет `VehicleSpawn` для vehicle trader.
- Находит продаваемую технику без блока `<VehicleParts>`.
- Создает недостающие блоки VehicleParts.
- Находит VehicleParts для техники, которой нет в продаже.
- Позволяет удалить лишний блок или пометить его как намеренный.

</details>

---

## Supported Files

| File | Purpose |
|---|---|
| `TraderConfig.txt` | Основной конфиг категорий и товаров |
| `TraderConfig_Vehicles.txt` | Отдельный конфиг техники |
| `TraderConfig_Boats.txt` | Отдельный конфиг лодок |
| `TraderObjects.txt` | NPC, vending-объекты, позиции, safezone, vehicle spawn |
| `TraderVariables.txt` | Настройки таймеров, дистанций и поведения |
| `TraderVehicleParts.txt` | Детали для техники после покупки |
| `TraderVehicleParts_Boats.txt` | Детали для лодок |
| `TraderAdmins.txt` | Админские настройки Trader |
| `trader_types.xml` | Дополнительные типы Trader |

---

## Vehicle Config Workflow

Если техника прописана в основном `TraderConfig.txt`, это неудобно поддерживать.
Инструмент может вынести ее отдельно:

```text
TraderConfig.txt
  <OpenFile> TraderConfig_Vehicles.txt

TraderConfig_Vehicles.txt
  <Trader> Vehicle Trader
  vehicle categories
  <FileEnd>
```

Если папка открыта через `Открыть папку`, файл будет создан рядом с `TraderConfig.txt` после сохранения.
Если выбраны отдельные файлы с рабочего стола, браузер не имеет права создать соседний файл напрямую: используй `Скачать файлы`.

---

## Safety Notes

> The tool can make mistakes. Always keep backups, read the task log, and test the result on a staging server before uploading to production.

Типовые вещи, которые надо проверить после сохранения:

- все нужные файлы лежат в `@Trader\extras\Trader`;
- `TraderConfig.txt` подключает все дополнительные конфиги через `<OpenFile>`;
- все Trader ID имеют точки в `TraderObjects.txt`;
- vending/NPC не стоят вплотную друг к другу, если interaction ловится с плохой стороны;
- RPT не пишет ошибок Trader после запуска сервера.

---

## Documentation

- [Гайд пользователя](docs/USER_GUIDE.md)
- [Правила проверки](docs/VALIDATION_RULES.md)
- [Публикация на GitHub](docs/PUBLISHING.md)
- [История изменений](CHANGELOG.md)

---

## What's New

<details open>
<summary><b>v0.1.0 - GitHub release pack</b></summary>

<br>

- Локальный редактор DayZ Trader в браузере.
- Разбор `TraderConfig.txt` и цепочки `<OpenFile>`.
- Проверка товаров, цен, дублей, ID, NPC-точек и VehicleParts.
- Перенос техники в отдельный `TraderConfig_Vehicles.txt`.
- Журнал задач и отчет проверки.
- Встроенная русская документация.

</details>

---

## Tech

| Part | Stack |
|---|---|
| UI | HTML, CSS, Vanilla JavaScript |
| Runtime | Browser + local HTTP server |
| Install | None |
| Data | Local files only |
| Recommended browser | Chrome or Edge |

---

## License

[MIT](LICENSE)
