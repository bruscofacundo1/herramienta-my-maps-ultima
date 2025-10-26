function safe(val){
  if (val !== undefined && val !== null){
    if (Array.isArray(val)){
      val = val.join('|')
    }
    val = val.toString();
    return val.replace(/,/g, "|");
  }
  else{
    return "--";
  }
}

function pinSymbol(color) {
    return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
        fillColor: color,
        fillOpacity: 0.3,
        strokeColor: '#000',
        strokeWeight: 1,
        scale: 1,
   };
}

function markerData(place, searchId){
  return {
    administrative_area_level_1: '--',
    administrative_area_level_2: '--',
    country: '--',
    cuit: "--",
    emails: "",
    updated: "no",
    direccion_completa: '--',
    horarios: '--',
    keyword: searches[searchId].keyword,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    link: 'https://www.google.com/maps/place/?q=place_id:' + place.place_id,
    map: map,
    icon: pinSymbol("blue"),
    name: safe(place.name),
    place_id: place.place_id,
    position: place.geometry.location,
    postal_code_suffix: '--',
    postal_code: '--',
    rating: place.rating || "--",
    calificacion_total: place.user_ratings_total || "--",
    photos: "--",
    description: "--",
    business_status: "--",
    price_level: "--",
    route: '--',
    street_number: '--',
    sublocality_level_1: '--',
    telefono: '--',
    title: safe(place.name) + ' [' + searches[searchId].keyword + ']',
    types: safe(place.types),
    website: '',
    searchId: searchId,
    searchCenterLat: searches[searchId].center ? searches[searchId].center.lat() : null,
    searchCenterLng: searches[searchId].center ? searches[searchId].center.lng() : null,
    searchRadius: searches[searchId].radius || null,
  }
}

// Headers específicos solicitados por el usuario
var headers = [
  "PALABRA CLAVE",
  "NOMBRE",
  "SITIO WEB",
  "PAIS",
  "PROVINCIA",
  "LOCALIDAD",
  "BARRIO",
  "CALLE",
  "NUMERO",
  "CODIGO POSTAL",
  "CODIGO POSTAL SUFIJO",
  "CUIT",
  "EMAILS",
  "CALIFICACION",
  "CALIFICACION TOTAL"
];

function metadata (item) {
  // Crear un objeto con solo las propiedades específicas solicitadas
  var res = {
    "PALABRA CLAVE": item.keyword || "",
    "NOMBRE": item.name || "",
    "SITIO WEB": item.website || "",
    "PAIS": item.country || "",
    "PROVINCIA": item.administrative_area_level_1 || "",
    "LOCALIDAD": item.administrative_area_level_2 || "",
    "BARRIO": item.sublocality_level_1 || "",
    "CALLE": item.route || "",
    "NUMERO": item.street_number || "",
    "CODIGO POSTAL": item.postal_code || "",
    "CODIGO POSTAL SUFIJO": item.postal_code_suffix || "",
    "CUIT": item.cuit || "",
    "EMAILS": item.emails || "",
    "CALIFICACION": item.rating || "",
    "CALIFICACION TOTAL": item.calificacion_total || ""
  };
  return res;
}

function exportCSVFile(headers, items, fileTitle) {
    // Convertir los items a un formato que el exportador pueda entender
    var formattedItems = items.map(function(item) {
        return metadata(item);
    });

    // Usar el exportador automático completo (Excel con formato aplicado)
    loadSheetJSAndExport(headers, formattedItems, fileTitle);
}
