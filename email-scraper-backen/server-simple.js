const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Función principal de scraping MEJORADA
async function scrapeEmailsFromWebsite(websiteUrl, businessName = '') {
  try {
    console.log('🕷️ Iniciando scraping para:', websiteUrl);
    
    // Normalizar URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    console.log('🌐 Fetching URL:', normalizedUrl);
    
    // Hacer fetch del contenido HTML
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('📄 HTML obtenido, tamaño:', html.length, 'bytes');
    
    // Cargar HTML en Cheerio
    const $ = cheerio.load(html);
    
    // Buscar correos con múltiples estrategias ORDENADAS POR CONFIABILIDAD
    const emails = new Set();
    
    // 🔥 ESTRATEGIA 1: Enlaces mailto: (MÁS CONFIABLE)
    console.log('🔍 Buscando en enlaces mailto...');
    const mailtoLinks = $('a[href^="mailto:"]');
    mailtoLinks.each((i, element) => {
      try {
        const href = $(element).attr('href');
        const email = href.replace('mailto:', '').split('?')[0].trim();
        if (email && email.includes('@')) {
          const cleanEmail = email.toLowerCase().trim();
          if (isValidEmail(cleanEmail)) {
            emails.add(cleanEmail);
            console.log('✅ Mailto encontrado:', cleanEmail);
          }
        }
      } catch (e) {
        console.log('Error procesando mailto:', e);
      }
    });
    
    // 🔥 ESTRATEGIA 2: Secciones de contacto (MUY CONFIABLE)
    console.log('🔍 Buscando en secciones de contacto...');
    const contactSelectors = [
      '.contact a',
      '.contact-info a', 
      '.contact-details a',
      '.footer-contact a',
      '.header-contact a',
      '[class*="contact"] a',
      '[id*="contact"] a',
      '.email a',
      '.mail a',
      '[class*="email"] a',
      '[id*="email"] a'
    ];
    
    contactSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        const text = $(element).text();
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
        if (emailMatch) {
          emailMatch.forEach(email => {
            const cleanEmail = email.toLowerCase().trim();
            if (isValidEmail(cleanEmail)) {
              emails.add(cleanEmail);
              console.log('✅ Contacto encontrado:', cleanEmail);
            }
          });
        }
      });
    });
    
    // 🔥 ESTRATEGIA 3: Meta tags (CONFIABLE)
    console.log('🔍 Buscando en meta tags...');
    const metaTags = $('meta');
    metaTags.each((i, element) => {
      const content = $(element).attr('content');
      const name = $(element).attr('name');
      
      if (content && (name === 'email' || name === 'contact' || name === 'author' || name === 'reply-to')) {
        const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
        if (emailMatch) {
          emailMatch.forEach(email => {
            const cleanEmail = email.toLowerCase().trim();
            if (isValidEmail(cleanEmail)) {
              emails.add(cleanEmail);
              console.log('✅ Meta tag encontrado:', cleanEmail);
            }
          });
        }
      }
    });
    
    // 🔥 ESTRATEGIA 4: Footer y header (MEDIANAMENTE CONFIABLE)
    console.log('🔍 Buscando en footer y header...');
    const footerSelectors = [
      'footer',
      '.footer',
      '.site-footer',
      '#footer',
      'header',
      '.header',
      '.site-header',
      '#header'
    ];
    
    footerSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        const text = $(element).text();
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
        if (emailMatch) {
          emailMatch.forEach(email => {
            const cleanEmail = email.toLowerCase().trim();
            if (isValidEmail(cleanEmail)) {
              emails.add(cleanEmail);
              console.log('✅ Footer/Header encontrado:', cleanEmail);
            }
          });
        }
      });
    });
    
    // 🔥 ESTRATEGIA 5: Texto general (MENOS CONFIABLE - pero con validación estricta)
    console.log('🔍 Buscando en texto general...');
    const textContent = $('body').text();
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const textEmails = textContent.match(emailRegex) || [];
    
    textEmails.forEach(email => {
      const cleanEmail = email.toLowerCase().trim();
      if (isValidEmail(cleanEmail)) {
        emails.add(cleanEmail);
        console.log('✅ Texto general encontrado:', cleanEmail);
      }
    });
    
    const finalEmails = Array.from(emails);
    console.log('✅ Correos finales encontrados:', finalEmails);
    
    return {
      success: true,
      emails: finalEmails,
      url: normalizedUrl,
      businessName: businessName,
      title: $('title').text(),
      totalEmails: finalEmails.length,
      strategies: {
        mailtoMatches: mailtoLinks.length,
        contactMatches: 'multiple',
        metaMatches: 'multiple',
        footerMatches: 'multiple',
        textMatches: textEmails.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error en scraping:', error);
    return {
      success: false,
      error: error.message,
      emails: [],
      url: websiteUrl,
      businessName: businessName
    };
  }
}

// Función de validación de correos MEJORADA
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex más estricto - evita falsos positivos
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
  
  if (!emailRegex.test(email)) return false;
  if (email.length < 6) return false; // Mínimo length razonable
  if (email.length > 100) return false; // Máximo length razonable
  
  // 🔥 NUEVO: Filtrar extensiones de archivo comunes
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv'];
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac'];
  
  const allExtensions = [...imageExtensions, ...documentExtensions, ...videoExtensions, ...audioExtensions];
  
  // Verificar si termina con extensión de archivo
  for (const ext of allExtensions) {
    if (email.toLowerCase().endsWith(ext)) {
      return false; // Es un archivo, no un correo
    }
  }
  
  // 🔥 NUEVO: Filtrar patrones comunes de falsos positivos
  const falsePositives = [
    '@2x.', '@3x.', '@1x.',          // Imágenes responsive
    '@icon.', '@logo.', '@avatar.',    // Iconos y logos
    '@thumb.', '@small.', '@large.',   // Thumbnails
    '@dark.', '@light.',              // Temas
    '@min.', '@max.',                 // Min/max
    '@low.', '@high.',                // Calidad
    '@mobile.', '@desktop.'           // Dispositivos
  ];
  
  for (const pattern of falsePositives) {
    if (email.toLowerCase().includes(pattern)) {
      return false; // Es un falso positivo
    }
  }
  
  // Verificar caracteres sospechosos
  const suspiciousChars = ['..', '@.', '.@', '@@', '.com@', '@.com'];
  for (const char of suspiciousChars) {
    if (email.includes(char)) return false;
  }
  
  // Verificar dominio
  const domain = email.split('@')[1];
  if (!domain || domain.length < 4) return false;
  if (!domain.includes('.')) return false;
  
  // 🔥 NUEVO: Verificar TLD (Top Level Domain) válido
  const tld = domain.split('.').pop().toLowerCase();
  const validTlds = [
    'com', 'ar', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'biz', 'info', 'name', 'pro', 'aero', 'coop', 'museum',
    'es', 'mx', 'cl', 'co', 'pe', 'uy', 'py', 'bo', 've', 'ec',
    'br', 'it', 'fr', 'de', 'uk', 'us', 'ca', 'au', 'nz'
  ];
  
  if (!validTlds.includes(tld) && tld.length < 2) {
    return false;
  }
  
  return true;
}

// Endpoint principal para scraping de correos
app.post('/api/scrape-emails', async (req, res) => {
  const { website, businessName } = req.body;
  
  if (!website) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere el website' 
    });
  }
  
  try {
    console.log('📥 Solicitud recibida:', { website, businessName });
    
    const result = await scrapeEmailsFromWebsite(website, businessName);
    
    console.log('📤 Resultado enviado:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error en endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para verificar si un dominio tiene correos
app.post('/api/check-domain', async (req, res) => {
  const { domain } = req.body;
  
  if (!domain) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere el dominio' 
    });
  }
  
  try {
    const website = 'https://' + domain;
    const result = await scrapeEmailsFromWebsite(website, '');
    
    res.json({
      success: true,
      domain: domain,
      hasEmails: result.emails.length > 0,
      emailCount: result.emails.length,
      emails: result.emails.slice(0, 3) // Mostrar solo los primeros 3
    });
    
  } catch (error) {
    res.json({
      success: false,
      domain: domain,
      hasEmails: false,
      emailCount: 0,
      emails: [],
      error: error.message
    });
  }
});

// Endpoint de salud/prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor de email scraper funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    method: 'fetch + cheerio (sin Puppeteer) - MEJORADO'
  });
});

// Endpoint para pruebas rápidas
app.get('/api/test-scrape', async (req, res) => {
  try {
    const testUrl = 'https://example.com';
    const result = await scrapeEmailsFromWebsite(testUrl, 'Test Business');
    
    res.json({
      success: true,
      test: result,
      message: 'Prueba de scraping completada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    message: 'Por favor, verifica la URL del endpoint'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('🚀 Servidor de email scraper iniciado (versión MEJORADA)');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 Endpoints disponibles:`);
  console.log(`   POST  http://localhost:${PORT}/api/scrape-emails  - Extraer correos`);
  console.log(`   POST  http://localhost:${PORT}/api/check-domain    - Verificar dominio`);
  console.log(`   GET   http://localhost:${PORT}/api/health          - Salud del servidor`);
  console.log(`   GET   http://localhost:${PORT}/api/test-scrape      - Prueba de scraping`);
  console.log('✅ Servidor listo para recibir solicitudes');
  console.log('🔥 Versión mejorada: Sin falsos positivos como "nuvempago@2x.png"');
});