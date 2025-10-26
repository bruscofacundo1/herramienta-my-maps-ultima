// Funcionalidad para asignar colores diferentes a los marcadores según la palabra clave
const keywordColors = {
  // Colores predefinidos para las primeras 10 palabras clave
  colors: [
    '#4285F4', // Azul de Google
    '#DB4437', // Rojo de Google
    '#F4B400', // Amarillo de Google
    '#0F9D58', // Verde de Google
    '#9C27B0', // Púrpura
    '#FF9800', // Naranja
    '#795548', // Marrón
    '#607D8B', // Azul grisáceo
    '#E91E63', // Rosa
    '#00BCD4'  // Cian
  ],
  // Mapa para almacenar qué color corresponde a cada palabra clave
  keywordMap: {},
  
  // Obtener el color para una palabra clave específica
  getColorForKeyword: function(keyword) {
    // Si la palabra clave ya tiene un color asignado, devolverlo
    if (this.keywordMap[keyword]) {
      return this.keywordMap[keyword];
    }
    
    // Si no, asignar el siguiente color disponible
    const colorIndex = Object.keys(this.keywordMap).length % this.colors.length;
    this.keywordMap[keyword] = this.colors[colorIndex];
    return this.colors[colorIndex];
  },
  
  // Obtener el ícono del marcador para una palabra clave específica
  getMarkerIconForKeyword: function(keyword) {
    const color = this.getColorForKeyword(keyword);
    return {
      url: 'http://maps.google.com/mapfiles/ms/icons/' + this.getGooglePinColor(color) + '-dot.png',
      scaledSize: new google.maps.Size(32, 32),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(16, 32)
    };
  },
  
  // Convertir color hexadecimal a color de pin de Google Maps
  getGooglePinColor: function(hexColor) {
    // Mapeo de colores hexadecimales a colores de pin de Google Maps
    const colorMap = {
      '#4285F4': 'blue',    // Azul de Google
      '#DB4437': 'red',     // Rojo de Google
      '#F4B400': 'yellow',  // Amarillo de Google
      '#0F9D58': 'green',   // Verde de Google
      '#9C27B0': 'purple',  // Púrpura
      '#FF9800': 'orange',  // Naranja
      '#795548': 'brown',   // Marrón
      '#607D8B': 'blue',    // Azul grisáceo (no hay gris, usamos azul)
      '#E91E63': 'pink',    // Rosa
      '#00BCD4': 'ltblue'   // Cian (usamos azul claro)
    };
    
    return colorMap[hexColor] || 'red'; // Por defecto rojo si no hay coincidencia
  }
};

// Función para crear los datos del marcador con color basado en la palabra clave
function markerData(place, searchId) {
  const keyword = searches[searchId].keyword;
  const markerIcon = keywordColors.getMarkerIconForKeyword(keyword);
  
  return {
    map: map,
    position: place.geometry.location,
    icon: markerIcon,
    place_id: place.place_id,
    title: place.name,
    keyword: keyword
  };
}

// Función para mostrar la leyenda de colores en el mapa
function showColorLegend() {
  // Eliminar leyenda existente si hay alguna
  const existingLegend = document.getElementById('color-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  // Crear el contenedor de la leyenda
  const legend = document.createElement('div');
  legend.id = 'color-legend';
  legend.style.backgroundColor = 'white';
  legend.style.padding = '10px';
  legend.style.margin = '10px';
  legend.style.border = '1px solid #999';
  legend.style.borderRadius = '4px';
  legend.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  legend.style.maxWidth = '200px';
  
  // Título de la leyenda
  const title = document.createElement('div');
  title.textContent = 'Leyenda de colores';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '5px';
  legend.appendChild(title);
  
  // Agregar cada palabra clave con su color
  for (const keyword in keywordColors.keywordMap) {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.marginBottom = '3px';
    
    const colorBox = document.createElement('div');
    colorBox.style.width = '15px';
    colorBox.style.height = '15px';
    colorBox.style.backgroundColor = keywordColors.keywordMap[keyword];
    colorBox.style.marginRight = '5px';
    colorBox.style.borderRadius = '50%';
    
    const keywordText = document.createElement('div');
    keywordText.textContent = keyword;
    keywordText.style.fontSize = '12px';
    
    item.appendChild(colorBox);
    item.appendChild(keywordText);
    legend.appendChild(item);
  }
  
  // Agregar la leyenda al mapa
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
}

// Modificar la función performSearch para actualizar la leyenda después de la búsqueda
const originalPerformSearch = window.performSearch;
window.performSearch = function(center, radius) {
  // Llamar a la función original
  originalPerformSearch(center, radius);
  
  // Actualizar la leyenda de colores después de un breve retraso
  setTimeout(showColorLegend, 1000);
};
