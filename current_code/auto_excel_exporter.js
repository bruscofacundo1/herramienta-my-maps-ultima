function exportAutoFormattedExcel(headers, items, fileTitle) {
  var sortedItems = items.slice();
  sortedItems.sort(function(a, b) {
    var keywordA = (a["PALABRA CLAVE"] || "").toLowerCase();
    var keywordB = (b["PALABRA CLAVE"] || "").toLowerCase();
    if (keywordA < keywordB) return -1;
    if (keywordA > keywordB) return 1;
    var nameA = (a["NOMBRE"] || "").toLowerCase();
    var nameB = (b["NOMBRE"] || "").toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  var excelData = [];
  excelData.push(headers);

  sortedItems.forEach(function(item) {
    var rowData = headers.map(function(header) {
      return item[header] || "";
    });
    excelData.push(rowData);
  });

  if (typeof XLSX !== "undefined") {
    createExcelWithSheetJS(excelData, fileTitle);
  } else {
    createExcelWithHTMLTable(excelData, fileTitle);
  }
}

function createExcelWithSheetJS(data, fileTitle) {
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);

  for (var R = 0; R < data.length; ++R) {
    for (var C = 0; C < data[R].length; ++C) {
      var cell_address = XLSX.utils.encode_cell({r:R, c:C});
      if (!ws[cell_address]) continue;

      if (R === 0) {
        if (!ws[cell_address].s) ws[cell_address].s = {};
        if (!ws[cell_address].s.font) ws[cell_address].s.font = {};
        ws[cell_address].s.font.bold = true;
      }
      
      if (!ws[cell_address].s) ws[cell_address].s = {};
      if (!ws[cell_address].s.alignment) ws[cell_address].s.alignment = {};
      ws[cell_address].s.alignment.horizontal = "center";
      ws[cell_address].s.alignment.vertical = "center";
    }
  }

  var max_width = [];
  for(var i = 0; i < data.length; i++) {
    for(var j = 0; j < data[i].length; j++) {
      var cell_value = data[i][j] ? data[i][j].toString() : "";
      max_width[j] = Math.max(max_width[j] || 0, cell_value.length + 2);
    }
  }
  ws["!cols"] = max_width.map(function(w) { return { wch: w }; });

  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  
  var now = new Date();
  var dateStr = now.getFullYear() + "-" + (now.getMonth() + 1).toString().padStart(2, '0') + "-" + now.getDate().toString().padStart(2, '0') + "_" + now.getHours().toString().padStart(2, '0') + "-" + now.getMinutes().toString().padStart(2, '0');
  var fileName = (fileTitle || "busqueda") + "_" + dateStr + ".xlsx";
  
  XLSX.writeFile(wb, fileName);
  
  alert("EXCEL XLSX DESCARGADO CON EXITO");
}

function loadSheetJSAndExport(headers, items, fileTitle) {
  if (typeof XLSX !== "undefined") {
    exportAutoFormattedExcel(headers, items, fileTitle);
    return;
  }
  
  var script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  script.onload = function() {
    exportAutoFormattedExcel(headers, items, fileTitle);
  };
  script.onerror = function() {
    createExcelWithHTMLTable(data, fileTitle);
  };
  document.head.appendChild(script);
}

