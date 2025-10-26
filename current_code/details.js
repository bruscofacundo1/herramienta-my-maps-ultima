function buscar(tag, address){
  for (i = 0; i < address.length; i++){
    if (address[i]["types"].includes(tag)){
      var val = address[i]["long_name"];
      return safe(val);
    }
  }
  return "--";
}

function getDetails(){
  var all_markers = markers(searches);
  var markersToUpdate = all_markers.filter(function(x) { return x.updated != "yes"; });
  
  if (markersToUpdate.length === 0) {
    alert("Todos los marcadores ya tienen detalles actualizados.");
    return;
  }
  
  // Mostrar barra de progreso
  showDetailedProgress(markersToUpdate.length, "Actualizando Detalles", "Preparando actualización...");
  
  if (all_markers.some(function(x){return x.updated != "yes"})){
    document.getElementById("details").disabled = true;
    setTimeout(function(){document.getElementById("details").disabled = false; getDetails();},7000);
  }

  var service = new google.maps.places.PlacesService(map);
  var processedCount = 0;
  limit = 10;
  
  for (var i = 0; i < all_markers.length; i++) {
    if (all_markers[i].updated != "yes" && limit > 0){
      console.log("details for " + (i+1))
      limit = limit - 1;
      
      // Actualizar progreso con el nombre del lugar actual
      updateProgressText("Procesando: " + (all_markers[i].name || "Lugar " + (i+1)));
      
      service.getDetails({placeId: all_markers[i].place_id}, function(details, status){
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          console.log("cuota de detalles máxima alcanzada, no se pudo actualizar item");
          
          // Incrementar progreso incluso en caso de error
          processedCount++;
          incrementProgress("Error en lugar " + processedCount);

        }else{
          var id = details.place_id;
          for (var j = 0; j < all_markers.length; j++) {
            if (all_markers[j].place_id == id){
              var marker = all_markers[j];
            }
          }
          marker.country = buscar("country", details.address_components)
          marker.postal_code = buscar("postal_code", details.address_components);
          marker.postal_code_suffix = buscar("postal_code_suffix", details.address_components);
          marker.street_number = buscar("street_number", details.address_components);
          marker.route = buscar("route", details.address_components);
          marker.sublocality_level_1 = buscar("sublocality_level_1", details.address_components);
          marker.administrative_area_level_2 = buscar("administrative_area_level_2", details.address_components);
          marker.administrative_area_level_1 = buscar("administrative_area_level_1", details.address_components);

          marker.telefono = safe(details["international_phone_number"]);
          marker.direccion_completa = safe(details["formatted_address"]);
          marker.website = details["website"] || '';
          marker.name = details.name || marker.name; // Actualizar el nombre desde los detalles
          marker.rating = details.rating; // CALIFICACION (valor numérico)
          marker.calificacion_total = details.user_ratings_total; // CALIFICACION TOTAL (número de reseñas)

          // Búsqueda avanzada de correos electrónicos con scraping real
          findEmailsWithScraping(details, marker).then(function(emailsFound) {
            marker.emails = emailsFound.length > 0 ? emailsFound.join(", ") : '';
            
            // Continuar con el resto del proceso
            if("opening_hours" in details && "weekday_text" in details["opening_hours"]){
              marker.horarios =  details["opening_hours"]["weekday_text"].join("|").replace(/,/g, "|");
            }
            
            marker.updated = "yes";
            
            // Incrementar progreso
            processedCount++;
            incrementProgress(marker.name || "Lugar actualizado");

            // Verificar si todos los marcadores han sido procesados
            if (processedCount === markersToUpdate.length) {
              hideProgressBar();
            }
          }).catch(function(error) {
            console.log('Error en búsqueda de correos:', error);
            
            // Continuar sin correos si hay error
            marker.emails = '';
            
            if("opening_hours" in details && "weekday_text" in details["opening_hours"]){
              marker.horarios =  details["opening_hours"]["weekday_text"].join("|").replace(/,/g, "|");
            }
            
            marker.updated = "yes";
            
            // Incrementar progreso
            processedCount++;
            incrementProgress(marker.name || "Lugar actualizado (sin correos)");

            // Verificar si todos los marcadores han sido procesados
            if (processedCount === markersToUpdate.length) {
              hideProgressBar();
            }
          });
        }

      });
    }
  }
  update_view();
  // Si no hay marcadores para actualizar, ocultar la barra de progreso inmediatamente
  if (markersToUpdate.length === 0) {
    hideProgressBar();
  }
};

// Función principal para buscar correos con scraping real
async function findEmailsWithScraping(details, marker) {
  var allEmails = [];
  
  try {
    console.log('🔍 Iniciando búsqueda de correos para:', details.name);
    
    // 1. Buscar en datos directos de Google (método rápido)
    var googleEmails = findEmailsInGoogleData(details);
    allEmails = allEmails.concat(googleEmails);
    
    // 2. Si hay website, hacer scraping real con nuestro backend
    if (details.website && details.website.length > 0) {
      console.log('🕷️ Iniciando scraping de:', details.website);
      
      try {
        var scrapedEmails = await scrapeEmailsFromBackend(details.website, details.name);
        allEmails = allEmails.concat(scrapedEmails);
        
        if (scrapedEmails.length > 0) {
          console.log('✅ Correos encontrados por scraping:', scrapedEmails);
        }
      } catch (error) {
        console.log('⚠️ Error en scraping:', error);
      }
    }
    
    // 3. Eliminar duplicados y validar
    var uniqueEmails = [...new Set(allEmails)];
    var validEmails = uniqueEmails.filter(function(email) {
      return isValidEmail(email);
    });
    
    console.log('📧 Correos finales válidos:', validEmails);
    return validEmails;
    
  } catch (error) {
    console.log('❌ Error en findEmailsWithScraping:', error);
    return [];
  }
}

// Función para buscar correos en datos de Google (método rápido)
function findEmailsInGoogleData(details) {
  var emailsFound = [];
  
  // Patrón de correo mejorado
  var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Campos donde buscar en Google
  var googleFields = [
    details.website,
    details.name,
    details.formatted_address,
    details.vicinity
  ];
  
  googleFields.forEach(function(field) {
    if (field && typeof field === 'string') {
      var matches = field.match(emailRegex);
      if (matches) {
        matches.forEach(function(email) {
          var cleanEmail = email.toLowerCase().trim();
          if (emailsFound.indexOf(cleanEmail) === -1) {
            emailsFound.push(cleanEmail);
          }
        });
      }
    }
  });
  
  // Buscar en reseñas si existen
  if (details.reviews && details.reviews.length > 0) {
    details.reviews.forEach(function(review) {
      if (review.text && typeof review.text === 'string') {
        var reviewMatches = review.text.match(emailRegex);
        if (reviewMatches) {
          reviewMatches.forEach(function(email) {
            var cleanEmail = email.toLowerCase().trim();
            if (emailsFound.indexOf(cleanEmail) === -1) {
              emailsFound.push(cleanEmail);
            }
          });
        }
      }
    });
  }
  
  return emailsFound;
}

// Función para comunicarse con el backend de scraping
async function scrapeEmailsFromBackend(website, businessName) {
  try {
    var response = await fetch('http://localhost:3001/api/scrape-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website: website,
        businessName: businessName
      })
    });
    
    var data = await response.json();
    
    if (data.success && data.emails && data.emails.length > 0) {
      console.log('✅ Correos encontrados por backend:', data.emails);
      return data.emails;
    } else {
      console.log('❌ Backend no encontró correos');
      return [];
    }
  } catch (error) {
    console.log('⚠️ Error comunicándose con backend:', error);
    return [];
  }
}

// Función para validar formato de correo electrónico de manera estricta
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex más estricto para evitar falsos positivos
  var emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/i;
  
  // Validaciones adicionales
  if (!emailRegex.test(email)) return false;
  if (email.length < 6) return false; // Mínimo length razonable
  if (email.length > 100) return false; // Máximo length razonable
  
  // Verificar que no tenga caracteres sospechosos
  var suspiciousChars = ['..', '@.', '.@', '@@'];
  for (var i = 0; i < suspiciousChars.length; i++) {
    if (email.includes(suspiciousChars[i])) return false;
  }
  
  // Verificar que el dominio tenga sentido
  var domain = email.split('@')[1];
  if (!domain || domain.length < 4) return false;
  if (!domain.includes('.')) return false;
  
  return true;
}