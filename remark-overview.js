/*!
 * remarkjs-overview v0.1.1
 * See all remark.js slides at once in a grid that fits the screen.
 * https://github.com/piecioshka/remarkjs-overview
 * MIT License (https://piecioshka.mit-license.org)
 */
(function (root) {
  "use strict";

  const DEFAULTS = {
    key: "o",
    gap: 8,
    hideIncrementalSteps: true,
    helpText: "Toggle slides overview",
  };

  // remark keeps the slide scale and position in the `style` attribute,
  // so the overview has to override them with `!important`.
  const STYLES = `
    .remark-overview-mode .remark-slides-area {
      display: grid;
      grid-template-columns: repeat(
        var(--remark-overview-columns),
        var(--remark-overview-cell-width)
      );
      grid-auto-rows: var(--remark-overview-cell-height);
      gap: var(--remark-overview-gap);
      place-content: center;
      counter-reset: remark-overview;
    }

    .remark-overview-mode .remark-slides-area .remark-slide-container {
      display: block;
      position: relative;
      width: auto;
      height: auto;
      overflow: hidden;
      cursor: pointer;
      outline: 1px solid var(--remark-overview-line, rgba(127, 127, 127, 0.35));
      counter-increment: remark-overview;
    }

    .remark-overview-mode .remark-slides-area .remark-overview-step {
      display: none;
    }

    .remark-overview-mode .remark-slides-area .remark-slide-container:hover {
      outline-color: var(--remark-overview-accent, #3b82f6);
    }

    .remark-overview-mode .remark-slides-area .remark-overview-selected {
      outline: 3px solid var(--remark-overview-accent, #3b82f6);
      z-index: 1;
    }

    .remark-overview-mode .remark-slides-area .remark-slide-container::after {
      content: counter(remark-overview);
      position: absolute;
      right: 0;
      bottom: 0;
      padding: 0 0.4em;
      background: var(--remark-overview-accent, #3b82f6);
      color: var(--remark-overview-on-accent, #ffffff);
      font: 600 11px/1.6 system-ui, sans-serif;
    }

    /* The badge above replaces remark's own slide number. */
    .remark-overview-mode .remark-slides-area .remark-slide-number {
      display: none;
    }

    .remark-overview-mode .remark-slides-area .remark-slide-scaler {
      transform: scale(var(--remark-overview-scale)) !important;
      transform-origin: top left !important;
      top: 0 !important;
      left: 0 !important;
      box-shadow: none;
      pointer-events: none;
    }
  `;

  function createSheet(text) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
    return sheet;
  }

  /** Column count that gives the biggest thumbnails for the given area. */
  function bestGrid(count, width, height, ratio, gap) {
    let best = { columns: 1, cellWidth: 0 };
    for (let columns = 1; columns <= count; columns += 1) {
      const rows = Math.ceil(count / columns);
      const cellWidth = Math.min(
        (width - (columns + 1) * gap) / columns,
        ((height - (rows + 1) * gap) / rows) * ratio,
      );
      if (cellWidth > best.cellWidth) {
        best = { columns, cellWidth };
      }
    }
    return best;
  }

  function insertHelpRow(table, key, text) {
    const row = document.createElement("tr");
    const keyCell = document.createElement("td");
    const keyLabel = document.createElement("span");
    const textCell = document.createElement("td");
    row.className = "remark-overview-help";
    keyLabel.className = "key";
    keyLabel.textContent = key;
    keyCell.append(keyLabel);
    textCell.textContent = text;
    row.append(keyCell, textCell);
    // The last row is "Toggle this help", keep it at the bottom.
    const rows = table.querySelectorAll("tr");
    const lastRow = rows[rows.length - 1];
    lastRow.parentNode.insertBefore(row, lastRow);
  }

  /**
   * Adds the shortcut to remark's help screen (`?` or `h`). With `sourceUrl`
   * remark loads the slides asynchronously and builds the help screen later,
   * so we wait for it.
   */
  function addHelpRow(key, text) {
    function tryInsert() {
      const table = document.querySelector(".remark-help-content table");
      if (!table) return false;
      if (!table.querySelector(".remark-overview-help")) {
        insertHelpRow(table, key, text);
      }
      return true;
    }
    if (tryInsert()) return;
    const observer = new MutationObserver(() => {
      if (tryInsert()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function remarkOverview(slideshow, userOptions) {
    const options = Object.assign({}, DEFAULTS, userOptions);
    const html = document.documentElement;
    const layoutSheet = createSheet("");
    let columns = 1;
    let visible = [];
    let selected = 0;

    createSheet(STYLES);
    addHelpRow(options.key, options.helpText);

    function isOpen() {
      return html.classList.contains("remark-overview-mode");
    }

    function slidesArea() {
      return document.querySelector(".remark-slides-area");
    }

    function containers() {
      const area = slidesArea();
      return area
        ? [...area.querySelectorAll(":scope > .remark-slide-container")]
        : [];
    }

    /** A step of an incremental slide is followed by its continuation. */
    function isStep(slides, index) {
      const next = slides[index + 1];
      return Boolean(
        options.hideIncrementalSteps &&
        next &&
        next.properties &&
        next.properties.continued === "true",
      );
    }

    function markSteps(items) {
      const slides = slideshow.getSlides();
      visible = [];
      items.forEach(function (container, index) {
        const step = isStep(slides, index);
        container.classList.toggle("remark-overview-step", step);
        if (!step) visible.push(index);
      });
    }

    function layout() {
      const area = slidesArea();
      const scaler = document.querySelector(
        ".remark-slides-area .remark-visible .remark-slide-scaler",
      );
      if (!area || !scaler) return;
      const ratio = scaler.offsetWidth / scaler.offsetHeight;
      const grid = bestGrid(
        visible.length,
        area.clientWidth,
        area.clientHeight,
        ratio,
        options.gap,
      );
      const cellWidth = Math.floor(grid.cellWidth);
      columns = grid.columns;
      layoutSheet.replaceSync(`:root {
        --remark-overview-columns: ${columns};
        --remark-overview-gap: ${options.gap}px;
        --remark-overview-cell-width: ${cellWidth}px;
        --remark-overview-cell-height: ${cellWidth / ratio}px;
        --remark-overview-scale: ${cellWidth / scaler.offsetWidth};
      }`);
    }

    function select(position) {
      const items = containers();
      selected = Math.max(0, Math.min(visible.length - 1, position));
      items.forEach(function (container, index) {
        container.classList.toggle(
          "remark-overview-selected",
          index === visible[selected],
        );
      });
    }

    function open() {
      if (isOpen()) return;
      if (document.querySelector(".remark-presenter-mode")) return;
      markSteps(containers());
      layout();
      html.classList.add("remark-overview-mode");
      // The current step is hidden, so select the slide that completes it.
      const current = slideshow.getCurrentSlideIndex();
      const position = visible.findIndex(function (index) {
        return index >= current;
      });
      select(position === -1 ? visible.length - 1 : position);
    }

    function close() {
      html.classList.remove("remark-overview-mode");
    }

    function goToSelected() {
      close();
      slideshow.gotoSlide(visible[selected] + 1);
    }

    function toggle() {
      if (isOpen()) close();
      else open();
    }

    const KEYS = {
      Enter: goToSelected,
      Escape: close,
      ArrowLeft: function () {
        select(selected - 1);
      },
      ArrowRight: function () {
        select(selected + 1);
      },
      ArrowUp: function () {
        select(selected - columns);
      },
      ArrowDown: function () {
        select(selected + columns);
      },
    };

    // Capture on `document` runs before remark's listeners on `window`,
    // so remark does not move the slideshow behind the overview.
    function onKeydown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === options.key.toLowerCase()) {
        event.stopPropagation();
        toggle();
        return;
      }
      if (!isOpen()) return;
      event.preventDefault();
      event.stopPropagation();
      if (KEYS[event.key]) KEYS[event.key]();
    }

    function blockWhileOpen(event) {
      if (isOpen()) event.stopPropagation();
    }

    function onClick(event) {
      if (!isOpen()) return;
      const container = event.target.closest?.(
        ".remark-slides-area .remark-slide-container",
      );
      if (!container) return;
      event.preventDefault();
      event.stopPropagation();
      const position = visible.indexOf(containers().indexOf(container));
      if (position === -1) return;
      select(position);
      goToSelected();
    }

    document.addEventListener("keydown", onKeydown, true);
    ["keypress", "wheel", "touchstart", "touchmove", "touchend"].forEach(
      function (type) {
        document.addEventListener(type, blockWhileOpen, true);
      },
    );
    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", function () {
      if (isOpen()) layout();
    });

    return { open, close, toggle, isOpen };
  }

  remarkOverview.bestGrid = bestGrid;
  root.remarkOverview = remarkOverview;
})(window);
