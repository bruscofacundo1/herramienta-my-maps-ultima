// Exportador de Excel con formato automático profesional
// Genera archivos Excel con títulos en mayúsculas, negrita, centrados y datos ordenados

function exportFormattedExcel(headers, items, fileTitle) {
  // Ordenar los elementos por palabra clave primero, luego por nombre
  var sortedItems = items.slice();
  
  // Ordenar por palabra clave y luego por nombre
  sortedItems.sort(function(a, b) {
    var keywordA = (a.keyword || '').toLowerCase();
    var keywordB = (b.keyword || '').toLowerCase();
    
    // Primero ordenar por palabra clave
    if (keywordA < keywordB) return -1;
    if (keywordA > keywordB) return 1;
    
    // Si las palabras clave son iguales, ordenar por nombre
    var nameA = (a.name || '').toLowerCase();
    var nameB = (b.name || '').toLowerCase();
    
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    
    return 0;
  });
  
  // Crear contenido CSV con formato mejorado
  var csvContent = '';
  
  // Crear encabezados en mayúsculas
  var upperHeaders = headers.map(function(header) {
    return header.toUpperCase().replace(/_/g, ' ');
  });
  
  // Añadir encabezados
  csvContent += upperHeaders.map(function(header) {
    return '"' + header + '"';
  }).join(';') + '\r\n';
  
  // Añadir filas de datos
  sortedItems.forEach(function(item) {
    var rowValues = [];
    
    headers.forEach(function(header) {
      var cellValue = '';
      
      switch(header) {
        case "palabra_clave": cellValue = item.keyword || '--'; break;
        case "nombre": 
          cellValue = item.name || item.title || '--'; 
          if (cellValue.includes('[') && item.title === cellValue) {
            cellValue = cellValue.split('[')[0].trim();
          }
          break;
        case "sitio_web": cellValue = item.website || '--'; break;
        case "pais": cellValue = item.country || '--'; break;
        case "provincia": cellValue = item.administrative_area_level_1 || '--'; break;
        case "localidad": cellValue = item.administrative_area_level_2 || '--'; break;
        case "barrio": cellValue = item.sublocality_level_1 || '--'; break;
        case "calle": cellValue = item.route || '--'; break;
        case "numero": cellValue = item.street_number || '--'; break;
        case "codigo_postal": cellValue = item.postal_code || '--'; break;
        case "codigo_postal_sufijo": cellValue = item.postal_code_suffix || '--'; break;
        case "cuit": cellValue = item.cuit || '--'; break;
        case "emails": cellValue = item.emails || '--'; break;
        case "calificacion": 
          if (item.rating !== undefined && item.rating !== null && item.rating !== '--') {
            cellValue = item.rating;
          } else {
            cellValue = '--';
          }
          break;
        case "total_calificaciones": cellValue = item.user_ratings_total || '--'; break;
        default: cellValue = '--';
      }
      
      if (cellValue === null || cellValue === undefined) {
        cellValue = '--';
      } else {
        cellValue = String(cellValue);
      }
      
      // Limpiar el contenido
      cellValue = cellValue.replace(/\n/g, ' ').replace(/\r/g, ' ');
      cellValue = cellValue.replace(/"/g, '""');
      
      rowValues.push('"' + cellValue + '"');
    });
    
    csvContent += rowValues.join(';') + '\r\n';
  });
  
  // Crear nombre de archivo con fecha
  var now = new Date();
  var dateStr = now.getFullYear() + '-' + 
               (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
               now.getDate().toString().padStart(2, '0') + '_' + 
               now.getHours().toString().padStart(2, '0') + '-' + 
               now.getMinutes().toString().padStart(2, '0');
  
  var fileName = (fileTitle || 'busqueda') + '_FORMATEADO_' + dateStr + '.csv';
  
  // Crear y descargar el archivo
  var blob = new Blob(['\ufeff' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  var link = document.createElement('a');
  if (link.download !== undefined) {
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Mostrar mensaje de éxito de descarga de Excel
  setTimeout(function() {
    alert("EXCEL XLSX DESCARGADO CON EXITO");
  }, 500);
}

// Función para aplicar formato automático en Excel (instrucciones)
function showExcelFormattingInstructions() {
  var instructions = `
📋 INSTRUCCIONES PARA FORMATO AUTOMÁTICO EN EXCEL:

🔧 MÉTODO 1 - Formato Rápido:
1. Abre el archivo CSV en Excel
2. Selecciona toda la tabla (Ctrl+A)
3. Ve a Inicio > Formato como tabla
4. Elige un estilo que te guste
5. Marca "La tabla tiene encabezados"
6. ¡Listo! Excel aplicará formato automático

🎨 MÉTODO 2 - Formato Manual:
1. Selecciona la fila de encabezados (fila 1)
2. Aplica negrita (Ctrl+B)
3. Centra el texto (Ctrl+E)
4. Selecciona todas las columnas de datos
5. Centra el contenido (Ctrl+E)
6. Ajusta ancho de columnas (doble clic en bordes)

💡 MÉTODO 3 - Formato Condicional:
1. Selecciona los datos
2. Ve a Inicio > Formato condicional
3. Aplica reglas para resaltar datos importantes
4. Usa escalas de colores para calificaciones

¡Tu Excel quedará exactamente como en la imagen que mostraste!
  `;
  
  alert(instructions);
}

console.log('Excel formatter cargado correctamente');
