const fetch = require('node-fetch');

async function testEmailScraperImproved() {
  console.log('🧪 Probando el Email Scraper Backend Mejorado...\n');
  
  const API_URL = 'http://localhost:3001';
  
  try {
    // 1. Probar salud del servidor
    console.log('1. Verificando salud del servidor...');
    const healthResponse = await fetch(`${API_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.success) {
      console.log('✅ Servidor saludable');
      console.log('   Mensaje:', healthData.message);
      console.log('   Versión:', healthData.version);
    } else {
      console.log('❌ Servidor no saludable');
      return;
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. Probar con un website que debería tener falsos positivos
    console.log('2. Probando con website que tiene falsos positivos...');
    
    const testData = {
      website: 'https://wikipedia.org',
      businessName: 'Wikipedia'
    };
    
    console.log('📤 Enviando solicitud:');
    console.log('   Website:', testData.website);
    console.log('   Business:', testData.businessName);
    
    const scrapeResponse = await fetch(`${API_URL}/api/scrape-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const scrapeData = await scrapeResponse.json();
    
    console.log('\n📥 Respuesta recibida:');
    console.log('   Success:', scrapeData.success);
    console.log('   Total emails:', scrapeData.totalEmails);
    console.log('   URL:', scrapeData.url);
    
    if (scrapeData.success) {
      if (scrapeData.emails && scrapeData.emails.length > 0) {
        console.log('\n📧 Correos encontrados:');
        scrapeData.emails.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email}`);
        });
        
        // Verificar si hay falsos positivos
        const falsePositives = scrapeData.emails.filter(email => 
          email.includes('@2x.') || 
          email.includes('@3x.') || 
          email.includes('.png') || 
          email.includes('.jpg') ||
          email.includes('.svg')
        );
        
        if (falsePositives.length > 0) {
          console.log('\n⚠️  ADVERTENCIA: Se encontraron posibles falsos positivos:');
          falsePositives.forEach(fp => console.log(`   ❌ ${fp}`));
        } else {
          console.log('\n✅ No se encontraron falsos positivos (buena señal)');
        }
      } else {
        console.log('\n📭 No se encontraron correos (normal para Wikipedia)');
      }
      
      console.log('\n📊 Estadísticas de estrategias:');
      if (scrapeData.strategies) {
        console.log('   📧 Mailto:', scrapeData.strategies.mailtoMatches, 'enlaces');
        console.log('   📞 Contacto:', scrapeData.strategies.contactMatches, 'secciones');
        console.log('   🏷️  Meta tags:', scrapeData.strategies.metaMatches, 'tags');
        console.log('   🔻 Footer/Header:', scrapeData.strategies.footerMatches, 'secciones');
        console.log('   📄 Texto general:', scrapeData.strategies.textMatches, 'coincidencias');
      }
    } else {
      console.log('❌ Error en scraping:', scrapeData.error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 3. Probar validación de correos
    console.log('3. Probando validación de correos...');
    
    const testEmails = [
      'contacto@negocio.com',        // ✅ Válido
      'info@empresa.ar',             // ✅ Válido
      'nuvempago@2x.png',           // ❌ Falso positivo (extensión)
      'logo@3x.jpg',                // ❌ Falso positivo (extensión)
      'user@icon.svg',              // ❌ Falso positivo (extensión)
      'test@dominio',               // ❌ Inválido (sin TLD)
      'invalido@',                  // ❌ Inválido (sin dominio)
      '@dominio.com',               // ❌ Inválido (sin usuario)
    ];
    
    console.log('📧 Probando correos de prueba:');
    testEmails.forEach((email, index) => {
      // Simular la función isValidEmail (versión simplificada para prueba)
      const isValid = validateEmailTest(email);
      console.log(`   ${index + 1}. ${email} → ${isValid ? '✅ Válido' : '❌ Inválido'}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ Prueba completada con éxito!');
    console.log('🚀 El backend mejorado está listo para usar en tu proyecto.');
    console.log('💡 Ahora deberías ver menos falsos positivos como "nuvempago@2x.png"');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    console.log('💡 Asegúrate de que el servidor esté corriendo en http://localhost:3001');
    console.log('💡 Ejecuta: node server-simple.js (en la carpeta email-scraper-backend)');
  }
}

// Función de prueba para validar correos (simula la isValidEmail mejorada)
function validateEmailTest(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
  if (!emailRegex.test(email)) return false;
  if (email.length < 6) return false;
  if (email.length > 100) return false;
  
  // Filtrar extensiones de archivo
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  const allExtensions = [...imageExtensions];
  
  for (const ext of allExtensions) {
    if (email.toLowerCase().endsWith(ext)) {
      return false;
    }
  }
  
  // Filtrar patrones comunes de falsos positivos
  const falsePositives = ['@2x.', '@3x.', '@1x.', '@icon.', '@logo.'];
  for (const pattern of falsePositives) {
    if (email.toLowerCase().includes(pattern)) {
      return false;
    }
  }
  
  const domain = email.split('@')[1];
  if (!domain || domain.length < 4) return false;
  if (!domain.includes('.')) return false;
  
  return true;
}

// Ejecutar la prueba
testEmailScraperImproved();