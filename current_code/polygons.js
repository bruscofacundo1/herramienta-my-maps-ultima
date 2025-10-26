// Estructura para almacenar los polígonos
var polygons = {}; // Objeto para almacenar los polígonos

function createPolygon(name, paths, color) {
  var polygon = new google.maps.Polygon({
    paths: paths,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.35,
    editable: false,
    map: map
  });
  
  polygons[name] = {
    polygon: polygon,
    paths: paths,
    color: color,
    visible: true
  };
  
  return polygon;
}

function savePolygons() {
  var polygonsData = {};
  Object.keys(polygons).forEach(function(key) {
    var paths = [];
    var polygon = polygons[key].polygon;
    var path = polygon.getPath();
    for (var i = 0; i < path.getLength(); i++) {
      var point = path.getAt(i);
      paths.push({lat: point.lat(), lng: point.lng()});
    }
    polygonsData[key] = {
      paths: paths,
      color: polygons[key].color,
      visible: polygons[key].visible
    };
  });
  localStorage.setItem('savedPolygons', JSON.stringify(polygonsData));
}

function loadPolygons() {
  var savedPolygons = localStorage.getItem('savedPolygons');
  if (savedPolygons) {
    var polygonsData = JSON.parse(savedPolygons);
    Object.keys(polygonsData).forEach(function(key) {
      var data = polygonsData[key];
      var polygon = createPolygon(key, data.paths, data.color);
      polygon.setVisible(data.visible);
    });
    updatePolygonsList();
  }
}

function updatePolygonsList() {
  var $list = $('#polygons-list');
  $list.empty();
  
  Object.keys(polygons).forEach(function(key) {
    var $item = $('<div class="polygon-item"></div>');
    
    // Checkbox para mostrar/ocultar
    var $checkbox = $('<input type="checkbox" checked>');
    $checkbox.change(function() {
      polygons[key].visible = $(this).is(':checked');
      polygons[key].polygon.setVisible(polygons[key].visible);
      savePolygons();
    });
    
    // Nombre del polígono
    var $name = $('<span></span>').text(key);
    
    // Botón para editar
    var $editBtn = $('<button>Editar</button>');
    $editBtn.click(function() {
      togglePolygonEditable(key);
    });
    
    // Botón para eliminar
    var $deleteBtn = $('<button>Eliminar</button>');
    $deleteBtn.click(function() {
      if (confirm('¿Estás seguro de eliminar este polígono?')) {
        polygons[key].polygon.setMap(null);
        delete polygons[key];
        savePolygons();
        updatePolygonsList();
      }
    });
    
    // Botón para buscar
    var $searchBtn = $('<button>Buscar</button>');
    $searchBtn.click(function() {
      // Se asume que searchInPolygon está disponible globalmente (definida en initGeoSearch.js)
      searchInPolygon(key);
    });
    
    $item.append($checkbox, $name, $editBtn, $deleteBtn, $searchBtn);
    $list.append($item);
  });
}

function togglePolygonEditable(key) {
  var polygon = polygons[key].polygon;
  var isEditable = !polygon.getEditable();
  polygon.setEditable(isEditable);
  
  // Si se desactiva la edición, guardar los cambios
  if (!isEditable) {
    var paths = [];
    var path = polygon.getPath();
    for (var i = 0; i < path.getLength(); i++) {
      var point = path.getAt(i);
      paths.push({lat: point.lat(), lng: point.lng()});
    }
    polygons[key].paths = paths;
    savePolygons();
  }
}
