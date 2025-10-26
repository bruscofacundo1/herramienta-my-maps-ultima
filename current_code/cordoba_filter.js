// Archivo cordoba_filter.js - Funcionalidad eliminada a petición del usuario
// Este archivo se mantiene para compatibilidad pero la funcionalidad ha sido desactivada

// Variables vacías para evitar errores
let cordobaFilterEnabled = false; // Deshabilitado
let cordobaBounds = null;

// Función vacía para inicializar (no hace nada)
function initCordobaFilter() {
  // La funcionalidad ha sido eliminada
  console.log('Filtro de Córdoba desactivado permanentemente');
}

// Función que simplemente devuelve los resultados sin filtrar
function filterResultsByCordoba(results) {
  return results; // Devolver todos los resultados sin filtrar
}

// Modificar la función processResults original pero sin filtrado por Córdoba
function modifyProcessResults() {
  // Guardar referencia a la función original
  var originalProcessResults = processResults;
  
  // Reemplazar con nuestra versión modificada sin filtro de Córdoba
  processResults = function(results, status, pagination, searchId, polygonKey) {
    if (status !== google.maps.places.PlacesServiceStatus.OK) {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        enable_btns();
        $('#resultadosLbl').effect('highlight', {}, 2000);
        console.log('No hay nuevos resultados');
      }
      else{
        alert('algo salió mal.')
      }
      return;
    } else {
      // Ya no se aplica filtro de Córdoba
      
      // Si se especificó un polígono, filtrar resultados
      if (polygonKey && polygons[polygonKey]) {
        results = filterResultsByPolygon(results, polygons[polygonKey].polygon);
      }
      
      createMarkers(results, searchId);

      if (pagination.hasNextPage) {
          pagination.nextPage();
      } else {
        enable_btns();
        update_view();
        if (window.drawingMode === 'circle') {
          draw_circles();
        }
      }
    }
  };
}

// Inicializar cuando el mapa esté listo
$(document).ready(function() {
  // Esperar a que el mapa se inicialice
  var checkMapInterval = setInterval(function() {
    if (typeof map !== 'undefined') {
      clearInterval(checkMapInterval);
      
      // Ya no inicializamos el filtro de Córdoba
      // Solo modificamos processResults para mantener compatibilidad
      modifyProcessResults();
    }
  }, 500);
});
