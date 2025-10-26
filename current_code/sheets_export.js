// Funcionalidad para exportar a Google Sheets
function exportToGoogleSheets(headers, items, fileTitle) {
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
    if (nameB > nameA) return 1;
    
    return 0;
  });
  
  // Crear un array para los datos de la hoja
  var sheetData = [];
  
  // Añadir los encabezados
  sheetData.push(headers);
  
  // Añadir cada fila de datos
  sortedItems.forEach(function(item) {
    var rowValues = [];
    
    // Asegurarse de que cada valor se añade en el mismo orden que los encabezados
    headers.forEach(function(header) {
      var cellValue = '';
      
      switch(header) {
        case "palabra_clave": cellValue = item.keyword || '--'; break;
        case "nombre": 
          // Asegurarse de que el nombre se obtenga correctamente
          cellValue = item.name || item.title || '--'; 
          // Eliminar la parte [keyword] si existe en el título
          if (cellValue.includes('[') && item.title === cellValue) {
            cellValue = cellValue.split('[')[0].trim();
          }
          break;
        case "calificacion": 
          // Asegurarse de que la calificación se procese correctamente
          // Usar el valor numérico directamente si existe
          if (item.rating !== undefined && item.rating !== null && item.rating !== '--') {
            cellValue = item.rating;
          } else {
            cellValue = '--';
          }
          break;
        case "total_calificaciones": cellValue = item.user_ratings_total || '--'; break;
        case "sitio_web": cellValue = item.website || '--'; break;
        case "fotos": cellValue = item.photos || '--'; break;
        case "descripcion": cellValue = item.description || '--'; break;
        case "estado_negocio": cellValue = item.business_status || '--'; break;
        case "nivel_precio": cellValue = item.price_level || '--'; break;
        case "telefono": cellValue = item.telefono || '--'; break;
        case "horarios": cellValue = item.horarios || '--'; break;
        case "direccion_completa": cellValue = item.direccion_completa || '--'; break;
        case "pais": cellValue = item.country || '--'; break;
        case "provincia": cellValue = item.administrative_area_level_1 || '--'; break;
        case "localidad": cellValue = item.administrative_area_level_2 || '--'; break;
        case "barrio": cellValue = item.sublocality_level_1 || '--'; break;
        case "calle": cellValue = item.route || '--'; break;
        case "numero": cellValue = item.street_number || '--'; break;
        case "codigo_postal": cellValue = item.postal_code || '--'; break;
        case "codigo_postal_sufijo": cellValue = item.postal_code_suffix || '--'; break;
        case "latitud": cellValue = item.lat || '--'; break;
        case "longitud": cellValue = item.lng || '--'; break;
        case "enlace": cellValue = item.link || '--'; break;
        case "id_lugar": cellValue = item.place_id || '--'; break;
        case "cuit": cellValue = item.cuit || '--'; break;
        case "emails": cellValue = item.emails || '--'; break;
        case "tipos": cellValue = item.types || '--'; break;
        case "id_busqueda": cellValue = item.searchId || '--'; break;
        case "centro_busqueda_lat": cellValue = item.searchCenterLat || '--'; break;
        case "centro_busqueda_lng": cellValue = item.searchCenterLng || '--'; break;
        case "radio_busqueda": cellValue = item.searchRadius || '--'; break;
        case "actualizado": cellValue = item.updated || '--'; break;
        default: cellValue = '--'; // Valor por defecto para columnas desconocidas
      }
      
      // Convertir a string si no lo es
      if (cellValue === null || cellValue === undefined) {
        cellValue = '--';
      } else {
        cellValue = String(cellValue);
      }
      
      rowValues.push(cellValue);
    });
    
    sheetData.push(rowValues);
  });
  
  // Crear nombre de archivo más descriptivo con fecha y hora
  var now = new Date();
  var dateStr = now.getFullYear() + '-' + 
               (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
               now.getDate().toString().padStart(2, '0') + '_' + 
               now.getHours().toString().padStart(2, '0') + '-' + 
               now.getMinutes().toString().padStart(2, '0');
  
  var sheetTitle = (fileTitle || 'busqueda') + '_' + dateStr;
  
  // Crear un objeto con los datos para enviar a Google Sheets
  var sheetsData = {
    properties: {
      title: sheetTitle
    },
    sheets: [
      {
        properties: {
          title: 'Resultados',
          gridProperties: {
            rowCount: sheetData.length,
            columnCount: headers.length
          }
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: sheetData.map(function(row, rowIndex) {
              return {
                values: row.map(function(cell, colIndex) {
                  // Detectar si es una URL de foto
                  var isPhotoUrl = typeof cell === 'string' && cell.includes('http') && 
                                  (cell.includes('.jpg') || cell.includes('.png') || 
                                   cell.includes('.jpeg') || cell.includes('photo'));
                  
                  // Para la primera fila (encabezados)
                  if (rowIndex === 0) {
                    return {
                      userEnteredValue: {
                        stringValue: cell.toUpperCase() // Convertir a mayúsculas
                      },
                      userEnteredFormat: {
                        textFormat: {
                          bold: true,
                          fontSize: 11
                        },
                        horizontalAlignment: 'CENTER', // Centrar texto
                        verticalAlignment: 'MIDDLE',
                        backgroundColor: {
                          red: 0.2,
                          green: 0.6,
                          blue: 0.2
                        }
                      }
                    };
                  }
                  // Para las celdas con fotos
                  else if (isPhotoUrl) {
                    return {
                      userEnteredValue: {
                        formulaValue: '=IMAGE("' + cell + '",1)'
                      }
                    };
                  } 
                  // Para el resto de celdas
                  else {
                    return {
                      userEnteredValue: {
                        stringValue: cell
                      },
                      userEnteredFormat: {
                        horizontalAlignment: 'CENTER', // Centrar todas las celdas
                        verticalAlignment: 'MIDDLE',
                        textFormat: {
                          fontSize: 10
                        }
                      }
                    };
                  }
                })
              };
            })
          }
        ]
      }
    ]
  };
  
  // Crear un enlace para descargar el archivo JSON
  var jsonBlob = new Blob([JSON.stringify(sheetsData)], {type: 'application/json'});
  var jsonUrl = URL.createObjectURL(jsonBlob);
  var link = document.createElement('a');
  link.href = jsonUrl;
  link.download = sheetTitle + '_para_google_sheets.json';
  link.click();
  
  // Mostrar instrucciones para importar a Google Sheets
  alert('Se ha generado un archivo JSON para importar a Google Sheets.\n\n' +
        'Para importar a Google Sheets:\n' +
        '1. Abre Google Sheets y crea una nueva hoja\n' +
        '2. Ve a Extensiones > Apps Script\n' +
        '3. Pega el código de importación que se encuentra en la documentación\n' +
        '4. Ejecuta la función importData y selecciona el archivo JSON descargado');
}

// Añadir botón para exportar a Google Sheets
function addGoogleSheetsExportButton() {
  // Crear el botón
  var sheetsButton = document.createElement('input');
  sheetsButton.type = 'button';
  sheetsButton.id = 'exportSheets';
  sheetsButton.className = 'action_buttons';
  sheetsButton.value = 'Exportar a Google Sheets';
  sheetsButton.style.backgroundColor = '#0F9D58';
  
  // Añadir evento de clic
  sheetsButton.addEventListener('click', function() {
    var fileTitle = document.getElementById('csvfn').value;
    exportToGoogleSheets(headers, markers(searches), fileTitle);
  });
  
  // Añadir el botón después del botón de guardar CSV
  var saveButton = document.getElementById('save');
  if (saveButton && saveButton.parentNode) {
    saveButton.parentNode.insertBefore(sheetsButton, saveButton.nextSibling);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  addGoogleSheetsExportButton();
});
