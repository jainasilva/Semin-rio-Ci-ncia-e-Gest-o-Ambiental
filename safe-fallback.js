(function () {
  "use strict";

  if (window.__APP_PRIMARY_READY || window.__APP_FALLBACK_READY) {
    return;
  }

  var STORAGE_KEY = "gestao_residuos_bracell_v1";
  var THEME_KEY = "gestao_residuos_bracell_theme_v1";
  var MEMORY_STORAGE = {};

  var TIPOS_RESIDUOS = [
    "Cinzas (CAL) industriais",
    "Lodo biológico",
    "Óleos lubrificantes",
    "Resíduos químicos",
    "Resíduos recicláveis",
    "Biomassa",
    "Solo contaminado",
    "Absorventes e EPIs contaminados"
  ];

  function safeRun(fn) {
    try {
      return fn();
    } catch (error) {
      if (window.console && console.error) {
        console.error("Fallback error:", error);
      }
      return null;
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return Object.prototype.hasOwnProperty.call(MEMORY_STORAGE, key) ? MEMORY_STORAGE[key] : null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      MEMORY_STORAGE[key] = value;
    }
  }

  function showNotice(message) {
    var footer = document.querySelector("footer");
    if (!footer || !message) {
      return;
    }

    var notice = byId("app-aviso");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "app-aviso";
      notice.style.margin = "6px 0 0";
      notice.style.fontSize = "0.85rem";
      notice.style.color = "var(--accent)";
      footer.appendChild(notice);
    }

    notice.textContent = message;
  }

  function parseQuantidade(value) {
    var text = String(value || "").trim();
    var normalized = text.indexOf(",") >= 0
      ? text.replace(/\./g, "").replace(",", ".")
      : text;
    return Number(normalized);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(Number(value || 0));
  }

  function formatDate(isoDate) {
    if (!isoDate) {
      return "-";
    }

    var date = new Date(isoDate + "T00:00:00");
    return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString("pt-BR");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    storageSet(THEME_KEY, theme);

    var lightBtn = byId("theme-light");
    var darkBtn = byId("theme-dark");

    if (lightBtn) {
      lightBtn.classList.toggle("is-active", theme === "light");
      lightBtn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }

    if (darkBtn) {
      darkBtn.classList.toggle("is-active", theme === "dark");
      darkBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }

  function initializeTheme() {
    var saved = storageGet(THEME_KEY);
    var prefersDark = false;

    try {
      prefersDark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (_) {
      prefersDark = false;
    }

    applyTheme(saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light"));

    var lightBtn = byId("theme-light");
    var darkBtn = byId("theme-dark");

    if (lightBtn) {
      lightBtn.addEventListener("click", function () {
        applyTheme("light");
      });
    }

    if (darkBtn) {
      darkBtn.addEventListener("click", function () {
        applyTheme("dark");
      });
    }
  }

  function fillTipoOptions() {
    var tipoSelect = byId("tipo");
    if (!tipoSelect) {
      return;
    }

    if (tipoSelect.options.length > 0) {
      return;
    }

    for (var i = 0; i < TIPOS_RESIDUOS.length; i += 1) {
      var option = document.createElement("option");
      option.value = TIPOS_RESIDUOS[i];
      option.textContent = TIPOS_RESIDUOS[i];
      tipoSelect.appendChild(option);
    }
  }

  function loadRegistros() {
    try {
      var raw = storageGet(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveRegistros(registros) {
    storageSet(STORAGE_KEY, JSON.stringify(registros));
  }

  function defaultDate() {
    var inputData = byId("data");
    if (inputData) {
      inputData.value = new Date().toISOString().slice(0, 10);
    }
  }

  function bootFallback() {
    if (window.__APP_PRIMARY_READY || window.__APP_FALLBACK_READY) {
      return;
    }

    var form = byId("residue-form");
    var tableBody = byId("residue-table-body");
    if (!form || !tableBody) {
      return;
    }

    window.__APP_FALLBACK_READY = true;

    var registros = loadRegistros();

    function resetForm() {
      var formTitle = byId("form-title");
      var inputId = byId("registro-id");
      var inputTipo = byId("tipo");
      var inputClasse = byId("classe");
      var inputDestino = byId("destino");
      var inputStatus = byId("status");
      var cancelBtn = byId("cancel-btn");

      form.reset();
      defaultDate();

      if (inputId) {
        inputId.value = "";
      }
      if (formTitle) {
        formTitle.textContent = "Novo Registro";
      }
      if (cancelBtn) {
        cancelBtn.hidden = true;
      }
      if (inputTipo && inputTipo.options.length > 0) {
        inputTipo.value = inputTipo.options[0].value;
      }
      if (inputClasse) {
        inputClasse.value = "Classe I";
      }
      if (inputDestino) {
        inputDestino.value = "Reciclagem";
      }
      if (inputStatus) {
        inputStatus.value = "Aguardando coleta";
      }
    }

    function renderTabela() {
      var searchInput = byId("search");
      var filtroStatus = byId("filtro-status");
      var termo = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var statusFiltro = filtroStatus ? filtroStatus.value : "";

      var filtrados = registros.filter(function (item) {
        var texto = (item.tipo + " " + item.origem + " " + item.destino).toLowerCase();
        var passaTexto = termo === "" || texto.indexOf(termo) >= 0;
        var passaStatus = statusFiltro === "" || item.status === statusFiltro;
        return passaTexto && passaStatus;
      });

      if (filtrados.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8"><div class="empty">Nenhum registro encontrado para o filtro atual.</div></td></tr>';
        return;
      }

      var rows = filtrados.map(function (item) {
        return [
          "<tr>",
          "<td>" + formatDate(item.data) + "</td>",
          "<td>" + escapeHtml(item.tipo) + "</td>",
          "<td>" + escapeHtml(item.classe) + "</td>",
          "<td>" + escapeHtml(item.origem) + "</td>",
          "<td>" + formatNumber(item.quantidade) + "</td>",
          "<td>" + escapeHtml(item.destino) + "</td>",
          "<td>" + escapeHtml(item.status) + "</td>",
          '<td><button class="btn small" data-action="edit" data-id="' + item.id + '">Editar</button> <button class="btn small danger" data-action="delete" data-id="' + item.id + '">Excluir</button></td>',
          "</tr>"
        ].join("");
      });

      tableBody.innerHTML = rows.join("");
    }

    function fillForm(registro) {
      var formTitle = byId("form-title");
      var cancelBtn = byId("cancel-btn");

      byId("registro-id").value = registro.id;
      byId("data").value = registro.data;
      byId("tipo").value = registro.tipo;
      byId("classe").value = registro.classe;
      byId("origem").value = registro.origem;
      byId("quantidade").value = String(registro.quantidade);
      byId("destino").value = registro.destino;
      byId("status").value = registro.status;

      if (formTitle) {
        formTitle.textContent = "Editar Registro";
      }
      if (cancelBtn) {
        cancelBtn.hidden = false;
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var inputId = byId("registro-id");
      var registro = {
        id: inputId && inputId.value ? inputId.value : "R-" + Date.now(),
        data: byId("data").value,
        tipo: byId("tipo").value,
        classe: byId("classe").value,
        origem: byId("origem").value.trim(),
        quantidade: parseQuantidade(byId("quantidade").value),
        destino: byId("destino").value,
        status: byId("status").value
      };

      if (!registro.data || !registro.origem || !isFinite(registro.quantidade)) {
        showNotice("Preencha os campos obrigatórios antes de salvar.");
        return;
      }

      if (inputId && inputId.value) {
        registros = registros.map(function (item) {
          return item.id === registro.id ? registro : item;
        });
      } else {
        registros.unshift(registro);
      }

      saveRegistros(registros);
      resetForm();
      renderTabela();
      showNotice("Registro salvo com fallback de segurança.");
    });

    tableBody.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.dataset) {
        return;
      }

      var id = target.dataset.id;
      var action = target.dataset.action;
      if (!id || !action) {
        return;
      }

      var registro = registros.find(function (item) {
        return item.id === id;
      });

      if (action === "edit" && registro) {
        fillForm(registro);
        return;
      }

      if (action === "delete") {
        registros = registros.filter(function (item) {
          return item.id !== id;
        });
        saveRegistros(registros);
        renderTabela();
      }
    });

    var cancelBtn = byId("cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", resetForm);
    }

    var searchInput = byId("search");
    if (searchInput) {
      searchInput.addEventListener("input", renderTabela);
    }

    var filtroStatus = byId("filtro-status");
    if (filtroStatus) {
      filtroStatus.addEventListener("change", renderTabela);
    }

    fillTipoOptions();
    initializeTheme();
    resetForm();
    renderTabela();
    showNotice("Modo de segurança ativo. Recursos essenciais funcionando.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      safeRun(bootFallback);
    });
  } else {
    safeRun(bootFallback);
  }
})();
