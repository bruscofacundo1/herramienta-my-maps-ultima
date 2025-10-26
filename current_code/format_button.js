// Agregar botón de instrucciones de formato Excel
$(document).ready(function() {
  // Buscar el botón de descarga CSV y agregar el nuevo botón después
  var csvButton = $('#csv');
  if (csvButton.length > 0) {
    var formatButton = $('<button>')
      .attr('id', 'formatInstructions')
      .addClass('btn btn-info')
      .css({
        'background': '#17a2b8',
        'color': 'white',
        'border': 'none',
        'padding': '8px 12px',
        'margin': '5px',
        'border-radius': '4px',
        'cursor': 'pointer',
        'font-size': '12px'
      })
      .text('📋 Instrucciones Formato Excel')
      .click(function() {
        showExcelFormattingInstructions();
      });
    
    csvButton.after(formatButton);
  }
  

});

console.log('Format button loaded');
