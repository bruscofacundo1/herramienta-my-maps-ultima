function processResults (results, status, pagination, searchId, polygonKey) {
  // Por defecto, NO aplicar filtro de polígono para mantener compatibilidad con el original
  // Solo aplicar si el usuario lo habilita explícitamente Y el toggle existe
  var applyPolygonFilter = $("#polygonFilterToggle").length > 0 ? $("#polygonFilterToggle").prop("checked") : false;

  if (status !== google.maps.places.PlacesServiceStatus.OK) {
    if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
      enable_btns();
      $("#resultadosLbl").effect("highlight", {}, 2000);
      console.log("No hay nuevos resultados");
    }
    else{
      alert("algo salió mal.");
    }
    return;
  } else {
    // SOLO aplicar filtro de polígono si está explícitamente activado
    if (polygonKey && polygons[polygonKey] && applyPolygonFilter) {
      console.log("⚠️ FILTRO DE POLÍGONO ACTIVADO - resultados antes:", results.length);
      results = filterResultsByPolygon(results, polygons[polygonKey].polygon);
      console.log("⚠️ FILTRO DE POLÍGONO ACTIVADO - resultados después:", results.length);
    } else if (polygonKey && polygons[polygonKey]) {
      console.log("✅ FILTRO DE POLÍGONO DESACTIVADO - manteniendo todos los resultados:", results.length);
    }
    
    createMarkers(results, searchId);
    
    // 🔄 CAMBIO CLAVE PARA CÍRCULOS: Actualizar el contador SIEMPRE, sin importar si es polígono o círculo
    var currentCount = number_of_markers(searches);
    $("#resultadosLbl").text(currentCount);
    console.log(`Contador actualizado a: ${currentCount} marcadores`);

    if (pagination.hasNextPage) {
        pagination.nextPage();
    }else{
      enable_btns();
      update_view();
      draw_circles();
      // Actualizar el label de resultados al finalizar la búsqueda
      $("#resultadosLbl").text(number_of_markers(searches)); // Solo el número
      $("#resultadosLbl").effect("highlight", {}, 2000);
    }
  }
}

function filterResultsByPolygon(results, polygon) {
  return results.filter(function(place) {
    var latLng = new google.maps.LatLng(
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
    return google.maps.geometry.poly.containsLocation(latLng, polygon);
  });
}

function createMarkers (places, searchId) {
  var bounds = new google.maps.LatLngBounds();

  for (var i = 0, place; place = places[i]; i++) {

    if(markers(searches).some(function( x) {return x.place_id == place.place_id})) {
      console.log("repetido!");
    }
    else{
      console.log("no estaba...");

      var marker = new google.maps.Marker(markerData(place, searchId))
      searches[searchId]["markers"].push(marker);
    }
  }
}