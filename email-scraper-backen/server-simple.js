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
        if (email && email.includes('@')) {
          const cleanEmail = email.toLowerCase().trim();
          if (isValidEmail(cleanEmail)) {
            emails.add(cleanEmail);
            strategies.mailto++;
            console.log('✅ Mailto encontrado:', cleanEmail);
          }
        }
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
          console.log('✅ Contacto encontrado (Texto):', email);
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
            console.log('✅ Contacto encontrado (Href):', email);
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
          console.log('✅ Meta tag encontrado:', email);
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
          console.log('✅ Footer/Header encontrado (Texto):', email);
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
              console.log(`✅ Footer encontrado (${attr}):`, email);
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
            console.log('✅ Footer/Header encontrado (Href):', email);
          });
        }
        
        // También revisar el texto del enlace
        const linkText = $(element).text();
        const textEmails = findEmailsInText(linkText);
        textEmails.forEach(email => {
          emails.add(email);
          strategies.footer++;
          console.log('✅ Footer/Header encontrado (Link Text):', email);
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
      console.log('✅ Texto general encontrado:', email);
    });
    
    // ESTRATEGIA 6: Detección de correos ofuscados
    console.log('🔍 Buscando correos ofuscados...');
    const obfuscatedEmails = findObfuscatedEmails($);
    obfuscatedEmails.forEach(email => {
      emails.add(email);
      strategies.obfuscated++;
      console.log('✅ Email ofuscado encontrado:', email);
    });
    
    const finalEmails = Array.from(emails);
    console.log('✅ Correos finales encontrados:', finalEmails);
    
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

    // Si no se encontraron emails, intentar buscar en la página de contacto
    if (finalEmails.length === 0) {
      console.log('❌ No se encontraron correos en la página principal. Intentando buscar en /contacto...');
      
      const contactPageUrls = [
        'contacto', 'contactanos', 'contact', 'about', 'about-us', 'nosotros',
        'get-in-touch', 'contact-us', 'contacto.php', 'contact.html'
      ];
      
      // Limitar a 3 intentos para no sobrecargar
      const maxAttempts = 3;
      let attempts = 0;
      
      for (const path of contactPageUrls) {
        if (attempts >= maxAttempts) break;
        
        const contactUrl = new URL(path, normalizedUrl).href;
        
        // Evitar re-scrapear la misma URL
        if (contactUrl === normalizedUrl) continue;
        
        try {
          console.log(`🌐 Intentando fetch de URL de contacto: ${contactUrl}`);
          const contactResponse = await fetch(contactUrl, {
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
            console.log(`⚠️ Falló fetch de ${contactUrl}. Status: ${contactResponse.status}`);
            attempts++;
            continue;
          }
          
          const contactHtml = await contactResponse.text();
          const $contact = cheerio.load(contactHtml);
          
          // Aplicar todas las estrategias a la página de contacto
          const contactEmails = await scrapeEmailsWithStrategies($contact);
          
          let foundInContact = false;
          contactEmails.forEach(email => {
            if (!emails.has(email)) {
              emails.add(email);
              result.emails.push(email);
              result.totalEmails++;
              strategies.contactPage++;
              foundInContact = true;
              console.log(`✅ Correo encontrado en página de contacto (${path}):`, email);
            }
          });
          
          if (foundInContact) {
            result.scrapedUrls.push(contactUrl);
            break;
          }
          
          attempts++;
        } catch (e) {
          console.error(`❌ Error al intentar scrapear ${path}:`, e.message);
          attempts++;
        }
      }
    }
    
    // Finalizar el resultado
    result.emails = Array.from(emails);
    result.totalEmails = result.emails.length;
    
    // Guardar en cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });
    
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

// Función auxiliar para buscar correos en texto
function findEmailsInText(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  const validEmails = [];
  
  matches.forEach(email => {
    const cleanEmail = email.toLowerCase().trim();
    if (isValidEmail(cleanEmail)) {
      validEmails.push(cleanEmail);
    }
  });
  
  return validEmails;
}

// Función para detectar correos ofuscados
function findObfuscatedEmails($) {
  const emails = new Set();
  
  // Patrones comunes de ofuscación
  const patterns = [
    // Formato: usuario [arroba] dominio [punto] com
    /([A-Za-z0-9._%+-]+)\s*\[arroba\]\s*([A-Za-z0-9.-]+)\s*\[punto\]\s*([A-Za-z]{2,})/gi,
    /([A-Za-z0-9._%+-]+)\s*\[at\]\s*([A-Za-z0-9.-]+)\s*\[dot\]\s*([A-Za-z]{2,})/gi,
    
    // Formato: usuario arroba dominio punto com
    /([A-Za-z0-9._%+-]+)\s*arroba\s*([A-Za-z0-9.-]+)\s*punto\s*([A-Za-z]{2,})/gi,
    /([A-Za-z0-9._%+-]+)\s*at\s*([A-Za-z0-9.-]+)\s*dot\s*([A-Za-z]{2,})/gi,
    
    // Formato: usuario(arroba)dominio(punto)com
    /([A-Za-z0-9._%+-]+)\s*\(\s*at\s*\)\s*([A-Za-z0-9.-]+)\s*\(\s*dot\s*\)\s*([A-Za-z]{2,})/gi,
    
    // Formato con espacios: usuario @ dominio . com
    /([A-Za-z0-9._%+-]+)\s*@\s*([A-Za-z0-9.-]+)\s*\.\s*([A-Za-z]{2,})/gi,
    
    // Formato con imágenes: <img src="email.png" alt="usuario@dominio.com">
    /alt\s*=\s*["']([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})["']/gi
  ];
  
  // Buscar en todo el texto del cuerpo
  const bodyText = $('body').text();
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(bodyText)) !== null) {
      // Para patrones con grupos de captura
      if (match.length > 3) {
        const email = `${match[1]}@${match[2]}.${match[3]}`.toLowerCase();
        if (isValidEmail(email)) {
          emails.add(email);
        }
      } else {
        // Para patrones que capturan el email completo
        const email = match[1].toLowerCase();
        if (isValidEmail(email)) {
          emails.add(email);
        }
      }
    }
  });
  
  // Buscar en atributos de datos específicos
  $('[data-email], [data-contact-email], [data-obfuscated-email]').each((i, element) => {
    const dataEmail = $(element).attr('data-email') || 
                     $(element).attr('data-contact-email') || 
                     $(element).attr('data-obfuscated-email');
    
    if (dataEmail) {
      // Intentar decodificar si está en base64
      try {
        const decoded = Buffer.from(dataEmail, 'base64').toString();
        if (decoded.includes('@')) {
          const emailMatch = decoded.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi);
          if (emailMatch) {
            emailMatch.forEach(email => {
              if (isValidEmail(email.toLowerCase())) {
                emails.add(email.toLowerCase());
              }
            });
          }
        }
      } catch (e) {
        // No es base64, intentar con otros métodos
        const emailMatch = dataEmail.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi);
        if (emailMatch) {
          emailMatch.forEach(email => {
            if (isValidEmail(email.toLowerCase())) {
              emails.add(email.toLowerCase());
            }
          });
        }
      }
    }
  });
  
  return Array.from(emails);
}

// Función para aplicar estrategias a un documento Cheerio
async function scrapeEmailsWithStrategies($) {
  const emails = new Set();
  
  // ESTRATEGIA 1: Enlaces mailto:
  $('a[href^="mailto:"]').each((i, element) => {
    try {
      const href = $(element).attr('href');
      const email = href.replace('mailto:', '').split('?')[0].trim();
      if (email && email.includes('@')) {
        const cleanEmail = email.toLowerCase().trim();
        if (isValidEmail(cleanEmail)) {
          emails.add(cleanEmail);
        }
      }
    } catch (e) {
      // Ignorar errores
    }
  });
  
  // ESTRATEGIA 2: Secciones de contacto
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
    $(selector).each((i, element) => {
      const text = $(element).text();
      const emailMatches = findEmailsInText(text);
      emailMatches.forEach(email => emails.add(email));
      
      const href = $(element).attr('href');
      if (href && href.includes('@')) {
        const emailMatches = findEmailsInText(href);
        emailMatches.forEach(email => emails.add(email));
      }
    });
  });
  
  // ESTRATEGIA 3: Meta tags
  $('meta').each((i, element) => {
    const content = $(element).attr('content');
    const name = $(element).attr('name');
    
    if (content && (name === 'email' || name === 'contact' || name === 'author' || name === 'reply-to')) {
      const emailMatches = findEmailsInText(content);
      emailMatches.forEach(email => emails.add(email));
    }
  });
  
  // ESTRATEGIA 4: Footer y header
  const footerSelectors = [
    'footer', '.footer', '.site-footer', '#footer', '.footer-links',
    'header', '.header', '.site-header', '#header',
    '.bottom', '.site-bottom', '.page-footer', '.main-footer',
    '.footer-top', '.footer-bottom', '.footer-content', '.footer-info',
    '.footer-widget', '.footer-column', '.footer-section',
    '.bottom-bar', '.bottom-info', '.site-info', '.copyright',
    '.legal', '.legal-info', '.site-legal',
    '.contact-footer', '.footer-contact', '.contact-info-footer',
    '.address-footer', '.footer-address',
    '.shopify-section-footer', '.wp-block-footer', '.elementor-footer',
    '.footer-widgets', '.footer-container', '.footer-wrapper'
  ];
  
  footerSelectors.forEach(selector => {
    $(selector).each((i, element) => {
      const text = $(element).text();
      const emailMatches = findEmailsInText(text);
      emailMatches.forEach(email => emails.add(email));
      
      // Buscar en atributos de datos
      const dataAttrs = ['data-email', 'data-contact', 'data-info'];
      dataAttrs.forEach(attr => {
        const dataValue = $(element).attr(attr);
        if (dataValue) {
          const emailMatches = findEmailsInText(dataValue);
          emailMatches.forEach(email => emails.add(email));
        }
      });
      
      $(`${selector} a`).each((j, link) => {
        const href = $(link).attr('href');
        if (href && href.includes('@')) {
          const emailMatches = findEmailsInText(href);
          emailMatches.forEach(email => emails.add(email));
        }
        
        const linkText = $(link).text();
        const textEmails = findEmailsInText(linkText);
        textEmails.forEach(email => emails.add(email));
      });
    });
  });
  
  // ESTRATEGIA 5: Texto general
  const textContent = $('body').text();
  const textEmails = findEmailsInText(textContent);
  textEmails.forEach(email => emails.add(email));
  
  // ESTRATEGIA 6: Correos ofuscados
  const obfuscatedEmails = findObfuscatedEmails($);
  obfuscatedEmails.forEach(email => emails.add(email));
  
  return Array.from(emails);
}

// Función de validación de correos MEJORADA con filtro de servicios técnicos
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex más estricto
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
  
  if (!emailRegex.test(email)) return false;
  if (email.length < 6) return false;
  if (email.length > 100) return false;
  
  // 🔥 NUEVO: Filtrar correos de servicios técnicos y plataformas
  const technicalServices = [
    'sentry', 'analytics', 'tracking', 'metrics', 'monitor',
    'log', 'error', 'report', 'stat', 'data', 'api',
    'support', 'help', 'info', 'admin', 'system',
    'notification', 'alert', 'bot', 'auto', 'noreply',
    'no-reply', 'donotreply', 'do-not-reply'
  ];
  
  // Verificar si el dominio o la parte local contiene palabras técnicas
  const emailLower = email.toLowerCase();
  for (const service of technicalServices) {
    if (emailLower.includes(service)) {
      // Excepciones: permitir correos de contacto válidos que puedan contener estas palabras
      if (service === 'info' || service === 'support' || service === 'help') {
        // Solo filtrar si es un servicio conocido, no un correo de contacto
        const domain = emailLower.split('@')[1];
        if (domain.includes('sentry') || domain.includes('analytics') || domain.includes('tracking')) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  // 🔥 NUEVO: Filtrar dominios de servicios técnicos específicos
  const technicalDomains = [
    'sentry.io', 'sentry.wixpress.com', 'sentry-next.wixpress.com',
    'analytics.google.com', 'google-analytics.com',
    'facebook.com/tr', 'facebook.com/tr/', 'connect.facebook.net',
    'doubleclick.net', 'googleadservices.com',
    'hotjar.com', 'mixpanel.com', 'segment.io',
    'intercom.io', 'zendesk.com', 'freshdesk.com'
  ];
  
  const domain = emailLower.split('@')[1];
  if (technicalDomains.includes(domain)) {
    return false;
  }
  
  // 🔥 NUEVO: Filtrar correos con patrones de ID largos (como los de Sentry)
  const idPattern = /^[a-f0-9]{32}@/i;  // Patrón de 32 caracteres hexadecimales
  if (idPattern.test(email)) {
    return false;
  }
  
  // Filtrar extensiones de archivo comunes
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv'];
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac'];
  
  const allExtensions = [...imageExtensions, ...documentExtensions, ...videoExtensions, ...audioExtensions];
  
  for (const ext of allExtensions) {
    if (email.toLowerCase().endsWith(ext)) {
      return false;
    }
  }
  
  // Filtrar patrones comunes de falsos positivos
  const falsePositives = [
    '@2x.', '@3x.', '@1x.',
    '@icon.', '@logo.', '@avatar.',
    '@thumb.', '@small.', '@large.',
    '@dark.', '@light.',
    '@min.', '@max.',
    '@low.', '@high.',
    '@mobile.', '@desktop.',
    '@placeholder.', '@sample.', '@example.'
  ];
  
  for (const pattern of falsePositives) {
    if (email.toLowerCase().includes(pattern)) {
      return false;
    }
  }
  
  // Verificar caracteres sospechosos
  const suspiciousChars = ['..', '@.', '.@', '@@', '.com@', '@.com'];
  for (const char of suspiciousChars) {
    if (email.includes(char)) return false;
  }
  
  // Verificar dominio
  const domainParts = email.split('@')[1];
  if (!domainParts || domainParts.length < 4) return false;
  if (!domainParts.includes('.')) return false;
  
  // Verificar TLD (Top Level Domain) válido
  const tld = domainParts.split('.').pop().toLowerCase();
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

// Endpoint para depuración detallada
app.post('/api/debug-scrape', async (req, res) => {
  const { website } = req.body;
  
  if (!website) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere el website' 
    });
  }
  
  try {
    console.log('🔍 Iniciando depuración para:', website);
    
    // Normalizar URL
    let normalizedUrl = website;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Hacer fetch del contenido HTML
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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
      emails: result.emails.slice(0, 3)
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
    method: 'fetch + cheerio (sin Puppeteer) - MEJORADO CON CACHE',
    cacheSize: cache.size
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

// Endpoint para limpiar cache
app.post('/api/clear-cache', (req, res) => {
  cache.clear();
  res.json({
    success: true,
    message: 'Cache limpiada correctamente'
  });
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
  console.log('🚀 Servidor de email scraper iniciado (versión MEJORADA CON CACHE)');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 Endpoints disponibles:`);
  console.log(`   POST  http://localhost:${PORT}/api/scrape-emails  - Extraer correos`);
  console.log(`   POST  http://localhost:${PORT}/api/check-domain    - Verificar dominio`);
  console.log(`   GET   http://localhost:${PORT}/api/health          - Salud del servidor`);
  console.log(`   GET   http://localhost:${PORT}/api/test-scrape      - Prueba de scraping`);
  console.log(`   POST  http://localhost:${PORT}/api/clear-cache     - Limpiar cache`);
  console.log(`   POST  http://localhost:${PORT}/api/debug-scrape     - Depurar sitio web`);
  console.log('✅ Servidor listo para recibir solicitudes');
  console.log('🔥 Versión mejorada: Con cache, detección de correos ofuscados y selectores expandidos');
});