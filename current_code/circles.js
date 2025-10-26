// Estructura para almacenar los círculos
var circles = {}; // Objeto para almacenar los círculos

function createCircle(name, center, radius, color) {
  var circle = new google.maps.Circle({
    center: center,
    radius: radius,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.35,
    editable: false,
    map: map
  });
  
  circles[name] = {
    circle: circle,
    center: center,
    radius: radius,
    color: color,
    visible: true
  };
  
  return circle;
}

function saveCircles() {
  var circlesData = {};
  Object.keys(circles).forEach(function(key) {
    var circle = circles[key].circle;
    circlesData[key] = {
      center: {lat: circle.getCenter().lat(), lng: circle.getCenter().lng()},
      radius: circle.getRadius(),
      color: circles[key].color,
      visible: circles[key].visible
    };
  });
  localStorage.setItem("savedCircles", JSON.stringify(circlesData));
}

function loadCircles() {
  var savedCircles = localStorage.getItem("savedCircles");
  if (savedCircles) {
    var circlesData = JSON.parse(savedCircles);
    Object.keys(circlesData).forEach(function(key) {
      var data = circlesData[key];
      var center = new google.maps.LatLng(data.center.lat, data.center.lng);
      var circle = createCircle(key, center, data.radius, data.color);
      circle.setVisible(data.visible);
    });
    updateCirclesList();
  }
}

function updateCirclesList() {
  var $list = $("#circles-list");
  $list.empty();
  
  Object.keys(circles).forEach(function(key) {
    var $item = $("<div class=\"circle-item\"></div>");
    
    // Checkbox para mostrar/ocultar
    var $checkbox = $("<input type=\"checkbox\">");
    $checkbox.prop("checked", circles[key].visible);
    $checkbox.change(function() {
      circles[key].visible = $(this).is(":checked");
      circles[key].circle.setVisible(circles[key].visible);
      saveCircles();
    });
    
    // Nombre del círculo
    var $name = $("<span></span>").text(key);
    
    // Botón para editar
    var $editBtn = $("<button>Editar</button>");
    $editBtn.click(function() {
      toggleCircleEditable(key);
    });
    
    // Botón para eliminar
    var $deleteBtn = $("<button>Eliminar</button>");
    $deleteBtn.click(function() {
      if (confirm("¿Estás seguro de eliminar este círculo?")) {
        circles[key].circle.setMap(null);
        delete circles[key];
        saveCircles();
        updateCirclesList();
      }
    });
    
    // Botón para buscar
    var $searchBtn = $("<button>Buscar</button>");
    $searchBtn.click(function() {
      // Se asume que searchInCircle está disponible globalmente (definida en initGeoSearch.js)
      searchInCircle(key); 
    });
    
    $item.append($checkbox, $name, $editBtn, $deleteBtn, $searchBtn);
    $list.append($item);
  });
}

function toggleCircleEditable(key) {
  var circle = circles[key].circle;
  var isEditable = !circle.getEditable();
  circle.setEditable(isEditable);
  
  // Si se desactiva la edición, guardar los cambios
  if (!isEditable) {
    circles[key].center = circle.getCenter();
    circles[key].radius = circle.getRadius();
    saveCircles();
  }
}

