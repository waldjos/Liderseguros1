'use strict';

module.exports = function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({ version: 6, cache: 'liderseguros-cache-v33' });
};
