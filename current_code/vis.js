function draw_circle(center, radius, color){
  var circle = new google.maps.Circle({
              strokeColor: '#FF0000',
              strokeOpacity: 0.3,
              strokeWeight: 1,
              fillColor: color,
              fillOpacity: 0.20,
              map: map,
              center: center,
              radius: radius,
              editable: true,
              draggable: true
            });

  circles.push(circle);
}

function draw_circles(){
    clear_circles();
    var keys = Object.keys(searches);
    keys.forEach(function(key){
      var radius = searches[key].radius;
      var center = searches[key].center;

      draw_circle(center, radius, "grey");
  });
}

function disable_btns () {
  $('.action_buttons').prop('disabled', true)
  $('.action_buttons').prop('value', 'CARGANDO...')
}

function enable_btns () {
  $('.action_buttons').prop('disabled', false)

  $('#clearBtn').prop('value', 'Limpiar Resultados')
  $('#save').prop('value', 'DESCARGAR EXCEL (.xlsx)')
  $('#details').prop('value', 'Actualizar Detalles')
}

function update_csv_name () {
  var date = new Date()
  var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '-' +  date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds()
  $('#csvfn').val('busqueda-' + time)
}

function appendKeyword () {
  var k = $('.keyword').last().clone()
  k.children('.remove-btn').removeClass('hidden')
  $('#keywords_place').append(k)
  event.preventDefault()
}

function removeKeyword(elem) {
  if ($('.keyword').length > 1) {
    $(elem).parent().remove()
  }
  event.preventDefault()
}

update_csv_name()
 $('#update_name').click(update_csv_name)

 $('.action_buttons').prop('disabled', true)

 $('#save').click(function () {
  exportCSVFile(headers, markers(searches), $('#csvfn').val())
})

function clear_searches(){
  setMapOnAll(markers(searches), null);
  searches = {}
  // Asegurar que el contador de resultados se actualice a 0 al limpiar
  $('#resultadosLbl').text('0'); // Usar '0' directamente en lugar de number_of_markers(searches)
  $('#detalles_count').html('0'); // Reiniciar el contador de detalles
  console.log("clear_searches: Todos los marcadores eliminados, contador restablecido a 0");
}

function clear_circles(){
  setMapOnAll(circles, null);
  circles = []
}

function update_details_counter(){
  contador_detalles = 0
  foreachMarker(searches, function(m){
    if (m.updated === "yes"){
      contador_detalles += 1;
    }
  });
  $('#detalles_count').html(contador_detalles)
}

 $('#clearBtn').click(function () {
  if (confirm('Seguro? si no guardaste se pierde la búsqueda!')) {
    clear_searches();
    clear_circles();

    update_details_counter();
    // $('#places').html('')
    $('.action_buttons').prop('disabled', true)
    // El contador ya se actualiza en clear_searches(), pero lo aseguramos aquí también
    $('#resultadosLbl').text('0');

  } else {
      // Do nothing!
  }

})

function update_view(){
  update_details_counter();
  if (drawingMode === 'circle') {
    draw_circles();
  }
  setMapOnAll(markers(searches), map);
  // 🔄 CAMBIO CLAVE PARA CÍRCULOS: Asegurar que el contador se actualice siempre
  var totalCount = number_of_markers(searches);
  $('#resultadosLbl').text(totalCount);
  console.log(`update_view: Contador actualizado a ${totalCount} marcadores`);
}