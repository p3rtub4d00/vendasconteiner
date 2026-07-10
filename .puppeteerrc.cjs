const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Redireciona o cache do Puppeteer para dentro da pasta do projeto,
  // impedindo que o Render delete o Chrome após o build.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
