// Funcionalidad para manejar múltiples palabras clave
function appendKeyword() {
  // Crear el campo de entrada
  var input = document.createElement('input');
  input.type = 'text';
  input.name = 'keywords';
  input.className = 'keyword';
  input.style.width = '200px';
  input.style.padding = '2px 5px';
  input.style.border = '1px solid #ccc';
  input.style.marginRight = '5px';
  
  // Crear el botón de eliminar
  var removeBtn = document.createElement('button');
  removeBtn.innerHTML = '-';
  removeBtn.className = 'remove-btn';
  removeBtn.style.backgroundColor = '#DB4437';
  removeBtn.style.color = 'white';
  removeBtn.style.border = 'none';
  removeBtn.style.borderRadius = '4px';
  removeBtn.style.padding = '2px 10px';
  removeBtn.style.cursor = 'pointer';
  removeBtn.style.marginRight = '5px';
  removeBtn.onclick = function() { removeKeyword(this); };
  
  // Añadir los elementos al contenedor de palabras clave adicionales
  var container = document.getElementById('additional-keywords');
  container.appendChild(input);
  container.appendChild(removeBtn);
  
  // Enfocar el nuevo campo de entrada
  input.focus();
}

// Función para eliminar una palabra clave
function removeKeyword(button) {
  // Obtener el input anterior al botón
  var input = button.previousElementSibling;
  if (input) {
    // Eliminar el input y el botón
    input.remove();
    button.remove();
  }
}

// Función para obtener todas las palabras clave
function getAllKeywords() {
  var keywords = [];
  var inputs = document.querySelectorAll('input.keyword');
  
  inputs.forEach(function(input) {
    var value = input.value.trim();
    if (value) {
      keywords.push(value);
    }
  });
  
  return keywords;
}

// Modificar la función de búsqueda para usar todas las palabras clave
function modifySearchFunction() {
  // Esperar a que el mapa se inicialice
  var checkMapInterval = setInterval(function() {
    if (typeof map !== 'undefined') {
      clearInterval(checkMapInterval);
      
      // Reemplazar la función original de búsqueda
      window.performSearch = function(center, radius) {
        var service = new google.maps.places.PlacesService(map);
        var keywords = getAllKeywords();
        
        if (keywords.length === 0) {
          alert('Por favor ingrese al menos una palabra clave para buscar');
          return;
        }
        
        keywords.forEach(function(keyword) {
          var search = {center: center, radius: radius, keyword: keyword, markers: []};
          var search_id = guid();
          searches[search_id] = search;
          
          service.nearbySearch({
            location: center,
            radius: radius,
            keyword: keyword,
          }, function(x, y, z) { processResults(x, y, z, search_id); });
        });
      };
    }
  }, 500);
}

// Inicializar cuando el documento esté listo
$(document).ready(function() {
  modifySearchFunction();
});
