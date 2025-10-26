// Detector de emails en datos de Google Maps
// Busca emails en diferentes campos de los datos del lugar

function detectEmails(placeDetails) {
  var emails = [];
  var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Campos donde buscar emails
  var fieldsToSearch = [
    placeDetails.website,
    placeDetails.formatted_address,
    placeDetails.international_phone_number,
    placeDetails.name,
    placeDetails.vicinity
  ];
  
  // Si hay reseñas, también buscar en ellas (limitado)
  if (placeDetails.reviews && placeDetails.reviews.length > 0) {
    for (var i = 0; i < Math.min(3, placeDetails.reviews.length); i++) {
      if (placeDetails.reviews[i].text) {
        fieldsToSearch.push(placeDetails.reviews[i].text);
      }
    }
  }
  
  // Si hay descripción editorial, buscar ahí también
  if (placeDetails.editorial_summary && placeDetails.editorial_summary.overview) {
    fieldsToSearch.push(placeDetails.editorial_summary.overview);
  }
  
  // Buscar emails en cada campo
  fieldsToSearch.forEach(function(field) {
    if (field && typeof field === 'string') {
      var foundEmails = field.match(emailRegex);
      if (foundEmails) {
        foundEmails.forEach(function(email) {
          // Evitar duplicados
          if (emails.indexOf(email.toLowerCase()) === -1) {
            emails.push(email.toLowerCase());
          }
        });
      }
    }
  });
  
  return emails;
}

function extractEmailFromWebsite(websiteUrl, callback) {
  // Esta función intentaría extraer emails del sitio web
  // Por limitaciones de CORS, solo podemos intentar patrones comunes
  if (!websiteUrl || websiteUrl === '--') {
    callback([]);
    return;
  }
  
  // Patrones comunes de emails basados en el dominio
  var domain = '';
  try {
    var url = new URL(websiteUrl);
    domain = url.hostname.replace('www.', '');
  } catch (e) {
    callback([]);
    return;
  }
  
  var commonEmails = [
    'info@' + domain,
    'contacto@' + domain,
    'ventas@' + domain,
    'administracion@' + domain,
    'gerencia@' + domain
  ];
  
  // Retornar emails comunes como sugerencias (no confirmados)
  callback(commonEmails);
}

function searchEmailsInGoogleMaps(placeId, callback) {
  // Usar la API de Places para obtener más detalles que podrían contener emails
  var service = new google.maps.places.PlacesService(map);
  
  var request = {
    placeId: placeId,
    fields: [
      'name', 
      'website', 
      'formatted_address', 
      'international_phone_number',
      'reviews',
      'editorial_summary',
      'vicinity'
    ]
  };
  
  service.getDetails(request, function(place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      var emails = detectEmails(place);
      
      // Si no se encontraron emails directamente, intentar extraer del sitio web
      if (emails.length === 0 && place.website) {
        extractEmailFromWebsite(place.website, function(websiteEmails) {
          // Marcar como sugerencias
          var suggestions = websiteEmails.map(function(email) {
            return email + ' (sugerido)';
          });
          callback(suggestions);
        });
      } else {
        callback(emails);
      }
    } else {
      callback([]);
    }
  });
}

// Función para buscar emails en texto libre
function findEmailsInText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  var matches = text.match(emailRegex);
  
  if (matches) {
    // Filtrar emails válidos y eliminar duplicados
    var validEmails = [];
    matches.forEach(function(email) {
      var cleanEmail = email.toLowerCase().trim();
      if (validEmails.indexOf(cleanEmail) === -1 && isValidEmail(cleanEmail)) {
        validEmails.push(cleanEmail);
      }
    });
    return validEmails;
  }
  
  return [];
}

// Validar formato de email
function isValidEmail(email) {
  var emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
  return emailRegex.test(email);
}

// Función para obtener emails de múltiples fuentes
function getComprehensiveEmails(placeDetails, callback) {
  var allEmails = [];
  
  // 1. Buscar en los datos básicos del lugar
  var directEmails = detectEmails(placeDetails);
  allEmails = allEmails.concat(directEmails);
  
  // 2. Si hay sitio web, intentar extraer emails comunes
  if (placeDetails.website && placeDetails.website !== '--') {
    extractEmailFromWebsite(placeDetails.website, function(websiteEmails) {
      allEmails = allEmails.concat(websiteEmails);
      
      // Eliminar duplicados
      var uniqueEmails = [];
      allEmails.forEach(function(email) {
        if (uniqueEmails.indexOf(email) === -1) {
          uniqueEmails.push(email);
        }
      });
      
      callback(uniqueEmails);
    });
  } else {
    callback(allEmails);
  }
}

console.log('Email detector cargado correctamente');