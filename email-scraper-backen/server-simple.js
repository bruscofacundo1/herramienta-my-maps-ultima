const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Cache simple para evitar re-scraping repetido
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Función auxiliar para encontrar correos en texto
function findEmailsInText(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  const validEmails = new Set();
  
  matches.forEach(email => {
    const cleanEmail = email.toLowerCase().trim();
    if (isValidEmail(cleanEmail)) {
      validEmails.add(cleanEmail);
    }
  });
  return Array.from(validEmails);
}

// Función auxiliar para detectar correos ofuscados (ej: 'info [at] dominio [dot] com')
function findObfuscatedEmails($) {
  const emails = new Set();
  const text = $('body').text();
  
  // Patrón 1: info [at] dominio [dot] com
  const pattern1 = /\b([A-Za-z0-9._%+-]+)\s*\[\s*at\s*\]\s*([A-Za-z0-9.-]+)\s*\[\s*dot\s*\]\s*([A-Z|a-z]{2,})\b/gi;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    const email = `${match[1]}@${match[2]}.${match[3]}`;
    if (isValidEmail(email)) {
      emails.add(email.toLowerCase());
    }
  }
  
  // Patrón 2: info (at) dominio (dot) com
  const pattern2 = /\b([A-Za-z0-9._%+-]+)\s*\(\s*at\s*\)\s*([A-Za-z0-9.-]+)\s*\(\s*dot\s*\)\s*([A-Z|a-z]{2,})\b/gi;
  while ((match = pattern2.exec(text)) !== null) {
    const email = `${match[1]}@${match[2]}.${match[3]}`;
    if (isValidEmail(email)) {
      emails.add(email.toLowerCase());
    }
  }
  
  return Array.from(emails);
}

// Función de validación de correos MEJORADA (TU BASE + FILTROS)
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex más estricto
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
  
  if (!emailRegex.test(email)) return false;
  if (email.length < 6) return false; // Mínimo length razonable
  if (email.length > 100) return false; // Máximo length razonable
  
  // 🔥 Filtros de Correo Genérico (Tienda Nube, Shopify, etc.)
  const genericDomains = [
    'mitiendanube.com', // Dominio base de Tienda Nube
    'shopify.com',      // Dominio base de Shopify
    'mercadoshops.com.ar', // Dominio base de Mercado Shops
    'webnode.com',
    'wix.com',
    'wordpress.com',
    'woocommerce.com',
    'mi-tienda.com',
    'my-store.com'
  ];

  const genericEmails = [
    'no-reply@',
    'noreply@',
    'info@mitiendanube.com',
    'contacto@mitiendanube.com',
    'soporte@mitiendanube.com',
    'tiendanube@tiendanube.com',
    'no-responder@mitiendanube.com'
  ];

  // Verificar si el dominio es genérico
  const domain = email.split('@')[1];
  if (genericDomains.includes(domain)) return false;

  // Verificar si es un correo genérico
  for (const genericEmail of genericEmails) {
    if (email.toLowerCase().startsWith(genericEmail)) return false;
  }
  
  // 🔥 Filtrar extensiones de archivo comunes
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
  
  // 🔥 Filtrar patrones comunes de falsos positivos
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
  if (!domain || domain.length < 4) return false;
  if (!domain.includes('.')) return false;
  
  // 🔥 Verificar TLD (Top Level Domain) válido
  const tld = domain.split('.').pop().toLowerCase();
  const validTlds = [
    'com', 'ar', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'biz', 'info', 'name', 'pro', 'aero', 'coop', 'museum',
    'es', 'mx', 'cl', 'co', 'pe', 'uy', 'py', 'bo', 've', 'ec',
    'br', 'it', 'fr', 'de', 'uk', 'us', 'ca', 'au', 'nz', 'io', 'app', 'dev', 'tech', 'online'
  ];
  
  if (!validTlds.includes(tld) && tld.length < 2) {
    return false;
  }
  
  return true;
}


// Función principal de scraping MEJORADA
async function scrapeEmailsFromWebsite(websiteUrl, businessName = '') {
  try {
    // Verificar cache primero
    const cacheKey = websiteUrl.toLowerCase();
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Usando resultado en cache para:', websiteUrl);
        return cached.data;
      }
    }
    
    console.log('🕷️ Iniciando scraping para:', websiteUrl);
    
    // Normalizar URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http://' ) && !normalizedUrl.startsWith('https://' )) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    console.log('🌐 Fetching URL:', normalizedUrl );
    
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
    
    // Buscar correos con múltiples estrategias
    const emails = new Set();
    const strategies = {
      mailto: 0,
      contact: 0,
      meta: 0,
      footer: 0,
      text: 0,
      contactPage: 0,
      obfuscated: 0
    };
    
    // ESTRATEGIA 1: Enlaces mailto:
    console.log('🔍 Buscando en enlaces mailto...');
    const mailtoLinks = $('a[href^="mailto:"]');
    mailtoLinks.each((i, element) => {
      try {
        const href = $(element).attr('href');
        const email = href.replace('mailto:', '').split('?')[0].trim();
        const emailMatches = findEmailsInText(email);
        emailMatches.forEach(e => { emails.add(e); strategies.mailto++; });
      } catch (e) {
        console.log('Error procesando mailto:', e);
      }
    });
    
    // ESTRATEGIA 2: Secciones de contacto
    console.log('🔍 Buscando en secciones de contacto...');
    const contactSelectors = [
      '.contact, .contact-info, .contact-details, .footer-contact, .header-contact, [class*="contact"], [id*="contact"], .email, .mail, [class*="email"], [id*="email"]',
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
      // Buscar en el texto completo
      $(selector).each((i, element) => {
        const text = $(element).text();
        const emailMatches = findEmailsInText(text);
        emailMatches.forEach(email => {
          emails.add(email);
          strategies.contact++;
          // console.log('✅ Contacto encontrado (Texto):', email);
        });
      });
      
      // Buscar en los atributos href
      $(`${selector} a`).each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('@')) {
          const emailMatches = findEmailsInText(href);
          emailMatches.forEach(email => {
            emails.add(email);
            strategies.contact++;
            // console.log('✅ Contacto encontrado (Href):', email);
          });
        }
      });
    });
    
    // ESTRATEGIA 3: Meta tags
    console.log('🔍 Buscando en meta tags...');
    const metaTags = $('meta');
    metaTags.each((i, element) => {
      const content = $(element).attr('content');
      const name = $(element).attr('name');
      
      if (content && (name === 'email' || name === 'contact' || name === 'author' || name === 'reply-to')) {
        const emailMatches = findEmailsInText(content);
        emailMatches.forEach(email => {
          emails.add(email);
          strategies.meta++;
          // console.log('✅ Meta tag encontrado:', email);
        });
      }
    });
    
    // ESTRATEGIA 4: Footer y header - SUPER MEJORADA
    console.log('🔍 Buscando en footer y header...');
    const footerSelectors = [
      // Selectores básicos
      'footer', '.footer', '.site-footer', '#footer', '.footer-links',
      'header', '.header', '.site-header', '#header',
      
      // Selectores adicionales para footer
      '.bottom', '.site-bottom', '.page-footer', '.main-footer',
      '.footer-top', '.footer-bottom', '.footer-content', '.footer-info',
      '.footer-widget', '.footer-column', '.footer-section',
      
      // Selectores para secciones inferiores que podrían contener contacto
      '.bottom-bar', '.bottom-info', '.site-info', '.copyright',
      '.legal', '.legal-info', '.site-legal',
      
      // Selectores para información de contacto específica
      '.contact-footer', '.footer-contact', '.contact-info-footer',
      '.address-footer', '.footer-address',
      
      // Selectores comunes en plataformas populares
      '.shopify-section-footer', '.wp-block-footer', '.elementor-footer',
      '.footer-widgets', '.footer-container', '.footer-wrapper'
    ];
    
    footerSelectors.forEach(selector => {
      // Buscar en el texto completo del elemento
      $(selector).each((i, element) => {
        const text = $(element).text();
        const emailMatches = findEmailsInText(text);
        emailMatches.forEach(email => {
          emails.add(email);
          strategies.footer++;
          // console.log('✅ Footer/Header encontrado (Texto):', email);
        });
        
        // Buscar en atributos de datos que puedan contener emails
        const dataAttrs = ['data-email', 'data-contact', 'data-info'];
        dataAttrs.forEach(attr => {
          const dataValue = $(element).attr(attr);
          if (dataValue) {
            const emailMatches = findEmailsInText(dataValue);
            emailMatches.forEach(email => {
              emails.add(email);
              strategies.footer++;
              // console.log(`✅ Footer encontrado (${attr}):`, email);
            });
          }
        });
      });
      
      // Buscar en todos los enlaces dentro de estos selectores
      $(`${selector} a`).each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('@')) {
          const emailMatches = findEmailsInText(href);
          emailMatches.forEach(email => {
            emails.add(email);
            strategies.footer++;
            // console.log('✅ Footer/Header encontrado (Href):', email);
          });
        }
        
        // También revisar el texto del enlace
        const linkText = $(element).text();
        const textEmails = findEmailsInText(linkText);
        textEmails.forEach(email => {
          emails.add(email);
          strategies.footer++;
          // console.log('✅ Footer/Header encontrado (Link Text):', email);
        });
      });
    });
    
    // ESTRATEGIA 5: Texto general
    console.log('🔍 Buscando en texto general...');
    const textContent = $('body').text();
    const textEmails = findEmailsInText(textContent);
    textEmails.forEach(email => {
      emails.add(email);
      strategies.text++;
      // console.log('✅ Texto general encontrado:', email);
    });
    
    // ESTRATEGIA 6: Detección de correos ofuscados
    console.log('🔍 Buscando correos ofuscados...');
    const obfuscatedEmails = findObfuscatedEmails($);
    obfuscatedEmails.forEach(email => {
      emails.add(email);
      strategies.obfuscated++;
      // console.log('✅ Email ofuscado encontrado:', email);
    });
    
    const finalEmails = Array.from(emails);
    // console.log('✅ Correos finales encontrados:', finalEmails);
    
    let result = {
      success: true,
      emails: finalEmails,
      url: normalizedUrl,
      businessName: businessName,
      title: $('title').text(),
      totalEmails: finalEmails.length,
      strategies: strategies,
      scrapedUrls: [normalizedUrl]
    };

    // 🔥 INYECCIÓN DE MEJORA: Búsqueda inteligente en página de contacto
    if (finalEmails.length === 0) {
      console.log('❌ No se encontraron correos en la página principal. Intentando buscar en páginas de contacto...');
      
      // ESTRATEGIA MEJORADA: Buscar enlaces de contacto en la página principal
      const contactLinks = $('a').filter((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().toLowerCase();
          
          // Filtro: si el texto o el href contiene alguna de estas palabras
          return (text.includes('contacto') || text.includes('contactanos') || text.includes('escribinos') || 
                  href.includes('contacto') || href.includes('contactanos') || href.includes('contact-us'));
      }).map((i, el) => {
          const href = $(el).attr('href');
          try {
              return new URL(href, normalizedUrl).href;
          } catch (e) {
              return null;
          }
      }).get().filter(url => url !== null);

      // Rutas comunes a probar (AÑADIDO SOPORTE PARA SHOPIFY)
      const commonPaths = [
          'contacto', 'contactanos', 'contact', 'about', 'about-us', 'nosotros',
          'get-in-touch', 'contact-us', 'contacto.php', 'contact.html',
          'pages/contacto', 'pages/contact', 'page/contacto', 'page/contact' // RUTAS SHOPIFY
      ];
      const commonUrls = commonPaths.map(path => new URL(path, normalizedUrl).href);
      
      // Combinar enlaces encontrados y rutas comunes, eliminando duplicados
      const urlsToTest = Array.from(new Set([...contactLinks, ...commonUrls]));

      let contactFound = false;
      const maxAttempts = 5;
      let attempts = 0;
      
      // Función para procesar una URL de contacto
      const processContactUrl = async (url) => {
          console.log(`🌐 Intentando fetch de URL de contacto: ${url}`);
          const contactResponse = await fetch(url, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.5',
                  'Accept-Encoding': 'gzip, deflate',
                  'Connection': 'keep-alive'
              },
              timeout: 10000
          });
          
          if (!contactResponse.ok) {
              console.log(`⚠️ Falló fetch de ${url}. Status: ${contactResponse.status}`);
              return false;
          }
          
          const contactHtml = await contactResponse.text();
          const $contact = cheerio.load(contactHtml);
          
          // Aplicar la estrategia de texto general a la página de contacto
          const contactTextContent = $contact('body').text();
          const contactTextEmails = findEmailsInText(contactTextContent);
          
          let found = false;
          contactTextEmails.forEach(email => {
              if (!emails.has(email)) {
                  emails.add(email);
                  result.emails.push(email);
                  result.totalEmails++;
                  found = true;
                  strategies.contactPage++;
                  // console.log(`✅ Correo encontrado en página de contacto: ${email}`);
              }
          });
          
          return found;
      };
      
      for (const contactUrl of urlsToTest) {
          if (attempts >= maxAttempts || contactFound) break;
          
          // Evitar re-scrapear la misma URL o URLs ya scrapeadas
          if (contactUrl === normalizedUrl || result.scrapedUrls.includes(contactUrl)) continue;
          
          try {
              if (await processContactUrl(contactUrl)) {
                  contactFound = true;
                  result.scrapedUrls.push(contactUrl);
                  break;
              }
          } catch (e) {
              console.error(`❌ Error al intentar scrapear ${contactUrl}:`, e.message);
          }
          attempts++;
      }
    }
    
    // Finalizar el resultado
    result.emails = Array.from(emails);
    result.totalEmails = result.emails.length;
    
    // Guardar en caché
    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    
    return result;
    
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
    const result = await scrapeEmailsFromWebsite(website, '' );
    
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
    method: 'fetch + cheerio (MEJORADO CON CACHE)',
    cacheSize: cache.size
  });
});

// Endpoint para pruebas rápidas
app.get('/api/test-scrape', async (req, res) => {
  try {
    const testUrl = 'https://example.com';
    const result = await scrapeEmailsFromWebsite(testUrl, 'Test Business' );
    
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

// Endpoint para limpiar cache
app.post('/api/clear-cache', (req, res) => {
  cache.clear();
  res.json({
    success: true,
    message: 'Cache limpiada correctamente'
  });
});

// Endpoint para depuración detallada (TU FUNCIONALIDAD)
app.post('/api/debug-scrape', async (req, res) => {
  const { website } = req.body;
  
  if (!website) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere el website' 
    });
  }
  
  try {
    let normalizedUrl = website;
    if (!normalizedUrl.startsWith('http://' ) && !normalizedUrl.startsWith('https://' )) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Hacer fetch del contenido HTML
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extraer información detallada para depuración
    const debugInfo = {
      url: normalizedUrl,
      title: $('title').text(),
      footerContent: '',
      contactSections: [],
      mailtoLinks: [],
      metaTags: [],
      bodyTextSample: $('body').text().substring(0, 500) + '...'
    };
    
    // Extraer contenido del footer
    const footerSelectors = ['footer', '.footer', '.site-footer', '#footer'];
    footerSelectors.forEach(selector => {
      if ($(selector).length > 0) {
        debugInfo.footerContent += $(selector).text() + '\n\n';
      }
    });
    
    // Extraer secciones de contacto
    $('.contact, .contact-info, [class*="contact"], [id*="contact"]').each((i, element) => {
      debugInfo.contactSections.push($(element).text());
    });
    
    // Extraer enlaces mailto
    $('a[href^="mailto:"]').each((i, element) => {
      debugInfo.mailtoLinks.push($(element).attr('href'));
    });
    
    // Extraer meta tags relevantes
    $('meta[name="email"], meta[name="contact"], meta[name="author"]').each((i, element) => {
      debugInfo.metaTags.push({
        name: $(element).attr('name'),
        content: $(element).attr('content')
      });
    });
    
    res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Error en depuración:', error);
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
  console.log('🚀 Servidor de email scraper iniciado (versión FINAL)');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 Endpoints disponibles:`);
  console.log(`   POST  http://localhost:${PORT}/api/scrape-emails  - Extraer correos` );
  console.log(`   POST  http://localhost:${PORT}/api/check-domain    - Verificar dominio` );
  console.log(`   GET   http://localhost:${PORT}/api/health          - Salud del servidor` );
  console.log(`   GET   http://localhost:${PORT}/api/test-scrape      - Prueba de scraping` );
  console.log(`   POST  http://localhost:${PORT}/api/clear-cache     - Limpiar cache` );
  console.log(`   POST  http://localhost:${PORT}/api/debug-scrape     - Depurar sitio web` );
  console.log('✅ Servidor listo para recibir solicitudes');
  console.log('🔥 Versión final: Con todas las mejoras de scraping y navegación');
});
