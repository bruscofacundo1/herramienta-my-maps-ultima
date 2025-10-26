
// Funcionalidad para dibujo de polígonos y círculos
window.drawingMode = 'polygon'; // Por defecto, modo polígono - variable global
var currentPolygon = null;
var currentPath = [];
var currentCircle = null;
var circleCenter = null;
var circleRadius = 0;

function initDrawingTools() {
  // Configurar los controles de dibujo
  $('input[name="drawingMode"]').change(function() {
    window.drawingMode = $(this).val();
    if (window.drawingMode === 'polygon') {
      $('#finishPolygon').prop('disabled', false);
      $('#finishCircle').prop('disabled', true);
      disableCircleDrawing();
      enablePolygonDrawing();
    } else {
      $('#finishPolygon').prop('disabled', true);
      $('#finishCircle').prop('disabled', false);
      disablePolygonDrawing();
      enableCircleDrawing();
    }
  });

  $('#finishPolygon').off('click').on('click', function() {
    if (window.drawingMode === 'polygon') {
      if (currentPolygon && currentPath.length >= 3) {
        finishPolygon();
      } else {
        alert('Se necesitan al menos 3 puntos para crear un polígono');
      }
    }
  });

  $('#finishCircle').off('click').on('click', function() {
    if (window.drawingMode === 'circle') {
      if (currentCircle && circleCenter && circleRadius > 0) {
        finishCircle();
      } else {
        alert('Por favor, dibuja un círculo válido.');
      }
    }
  });

  // Inicializar los paneles
  loadPolygons();
  loadCircles();

  // Asegurarse de que el modo de dibujo inicial se active correctamente
  $('input[name="drawingMode"]:checked').trigger('change');
}

// Función para deshabilitar cualquier listener de clic del mapa
function disableMapClickListener() {
  if (mapClickListener) {
    google.maps.event.removeListener(mapClickListener);
    mapClickListener = null;
  }
}

// --- Funciones para Polígonos ---

function enablePolygonDrawing() {
  if (currentPolygon) {
    currentPolygon.setMap(null);
    currentPolygon = null;
  }
  currentPath = [];

  map.setOptions({
    draggableCursor: 'default',
    draggingCursor: 'default'
  });

  disableMapClickListener();
  mapClickListener = google.maps.event.addListener(map, 'click', function(event) {
    if (window.drawingMode === 'polygon') {
      addPointToPolygon(event.latLng);
    }
  });
}

function disablePolygonDrawing() {
  disableMapClickListener();
  if (currentPolygon) {
    currentPolygon.setMap(null);
    currentPolygon = null;
  }
  currentPath = [];
}

function addPointToPolygon(latLng) {
  currentPath.push(latLng);
  if (currentPolygon) {
    currentPolygon.setPath(currentPath);
  } else {
    currentPolygon = new google.maps.Polygon({
      path: currentPath,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: map,
      editable: true,
      draggable: true
    });
  }
}

function finishPolygon() {
  $('#polygon-form').removeClass('hidden');
  $('#save-polygon').off('click').on('click', function() {
    var name = $('#polygon-name').val();
    if (!name) {
      alert('Por favor ingresa un nombre para el polígono');
      return;
    }
    var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    createPolygon(name, currentPath, color);
    savePolygons();
    updatePolygonsList();

    $('#polygon-form').addClass('hidden');
    $('#polygon-name').val('');
    currentPolygon.setMap(null);
    currentPolygon = null;
    currentPath = [];
    $('input[value="polygon"]').prop('checked', true).trigger('change');
  });

  $('#cancel-polygon').off('click').on('click', function() {
    $('#polygon-form').addClass('hidden');
    $('#polygon-name').val('');
  });
}

function searchInPolygon(polygonKey) {
  if (!polygons[polygonKey]) {
    alert('Polígono no encontrado');
    return;
  }
  var polygon = polygons[polygonKey].polygon;
  var bounds = new google.maps.LatLngBounds();
  var path = polygon.getPath();
  for (var i = 0; i < path.getLength(); i++) {
    bounds.extend(path.getAt(i));
  }
  var center = bounds.getCenter();
  var radius = 0;
  for (var i = 0; i < path.getLength(); i++) {
    var distance = google.maps.geometry.spherical.computeDistanceBetween(center, path.getAt(i));
    if (distance > radius) {
      radius = distance;
    }
  }

  var service = new google.maps.places.PlacesService(map);
  var keywords = $('input[name^=keywords]').map(function(idx, elem) { return $(elem).val(); }).get();

  keywords.forEach(function(keyword) {
    var search = { keyword: keyword, markers: [], polygonKey: polygonKey };
    var search_id = guid();
    searches[search_id] = search;

    service.nearbySearch({
      location: center,
      radius: radius,
      keyword: keyword,
    }, function(x, y, z) { processResults(x, y, z, search_id, polygonKey) });
  });
}

// --- Funciones para Círculos ---

function enableCircleDrawing() {
  if (currentCircle) {
    currentCircle.setMap(null);
    currentCircle = null;
  }
  circleCenter = null;
  circleRadius = 0;

  map.setOptions({
    draggableCursor: 'crosshair',
    draggingCursor: 'crosshair'
  });

  disableMapClickListener();
  mapClickListener = google.maps.event.addListener(map, 'click', function(event) {
    if (window.drawingMode === 'circle') {
      addPointToCircle(event.latLng);
    }
  });
}

function disableCircleDrawing() {
  disableMapClickListener();
  if (currentCircle) {
    currentCircle.setMap(null);
    currentCircle = null;
  }
  circleCenter = null;
  circleRadius = 0;
}

function addPointToCircle(latLng) {
  if (!circleCenter) {
    circleCenter = latLng;
    currentCircle = new google.maps.Circle({
      strokeColor: '#0000FF',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#0000FF',
      fillOpacity: 0.35,
      map: map,
      center: circleCenter,
      radius: 0,
      editable: true,
      draggable: true
    });

    google.maps.event.addListener(currentCircle, 'radius_changed', function() {
      circleRadius = currentCircle.getRadius();
    });
    google.maps.event.addListener(currentCircle, 'center_changed', function() {
      circleCenter = currentCircle.getCenter();
    });

  } else {
    circleRadius = google.maps.geometry.spherical.computeDistanceBetween(circleCenter, latLng);
    currentCircle.setRadius(circleRadius);
    $("#finishCircle").prop("disabled", false);
  }
}

function finishCircle() {
  $('#circle-form').removeClass('hidden');
  $('#circles-panel').removeClass('hidden'); // Asegurarse de que el panel de círculos también se muestre para que el formulario sea visible
  

  $('#save-circle').off('click').on('click', function() {
    var name = $('#circle-name').val();
    if (!name) {
      alert('Por favor ingresa un nombre para el círculo');
      return;
    }
    var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    createCircle(name, circleCenter, circleRadius, color);
    saveCircles();
    updateCirclesList();
    $('#circles-panel').removeClass('hidden'); // Mostrar el panel de círculos después de guardar

    $('#circle-form').addClass('hidden');
    $('#circle-name').val('');
    currentCircle.setMap(null);
    currentCircle = null;
    circleCenter = null;
    circleRadius = 0;
    $('input[value="circle"]').prop('checked', true).trigger('change');
  });

  $('#cancel-circle').off('click').on('click', function() {
    $('#circle-form').addClass('hidden');
    
    $('#circle-name').val('');
    if (currentCircle) {
      currentCircle.setMap(null);
      currentCircle = null;
    }
    circleCenter = null;
    circleRadius = 0;
  });
}

function searchInCircle(circleKey) {
  if (!circles[circleKey]) {
    alert('Círculo no encontrado');
    return;
  }
  var circle = circles[circleKey].circle;
  var center = circle.getCenter();
  var radius = circle.getRadius();

  var service = new google.maps.places.PlacesService(map);
  var keywords = $('input[name^=keywords]').map(function(idx, elem) { return $(elem).val(); }).get();

  keywords.forEach(function(keyword) {
    var search = { center: center, radius: radius, keyword: keyword, markers: [] };
    var search_id = guid();
    searches[search_id] = search;

    service.nearbySearch({
      location: center,
      radius: radius - (radius / 4), // Reducir el radio de búsqueda para evitar desbordamientos, como en el original
      keyword: keyword,
    }, function(x, y, z) { processResults(x, y, z, search_id, circleKey) }); // Pasar circleKey para el filtrado
  });
}

