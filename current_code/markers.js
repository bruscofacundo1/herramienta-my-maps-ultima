function foreachMarker(dictionary, fn){
  var keys = Object.keys(dictionary);
  keys.forEach(function(key){
    dictionary[key].markers.forEach(function(marker){
      fn(marker);
    });
  });
}

function markers(dictionary) {
  var all_markers = [];
  foreachMarker(dictionary, function(marker){
    all_markers.push(marker);
  })
  return all_markers;
}

function number_of_markers(dictionary){
  var sum = 0;
  foreachMarker(dictionary, function(marker){
    sum += 1
  });
  return sum;
}

function setMapOnAll(elements, map) {
  elements.map(function(x){x.setMap(map)});
}
