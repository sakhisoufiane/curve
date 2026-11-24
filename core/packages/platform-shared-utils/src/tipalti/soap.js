/* eslint-disable no-continue */
const Soap = this;
const axios = require('axios');
const logger = require('../logger');

Soap.send = async (url, endpoint, body) => {
  // Format XML Request
  const xml = createXmlRequest(endpoint, body);
  logger.info(xml);
  // Make the request
  const config = { headers: { 'Content-Type': 'application/soap+xml', charset: 'utf-8', 'Content-Length': xml.length } };
  const response = await axios.post(url, xml, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  return response;
};

const createXmlRequest = (endpoint, body) => {
// Add opening endpoint tag
  let request = `<${endpoint.name} xmlns="${endpoint.xmlns || 'http://Tipalti.org/'}">`;
  request += convertBodyToXml(body);
  // Add closing endpoint tag
  request += `</${endpoint.name}>`;
  // Wrap the request body into the XML headers/footers
  const xml = wrapInMainXmlTags(request);
  return xml;
};

const convertBodyToXml = (body) => {
  let request = '';
  // Add body fields
  for (const field in body) {
    // Ignore field if it's null
    if (!body?.[field]) continue;
    if (Array.isArray(body[field])) {
      // If it's an array add multiple tags for each element in the array
      request += `<${field}>`;
      for (const element of body[field]) {
        request += convertBodyToXml(element);
      }
      request += `</${field}>`;
    } else if (typeof body[field] === 'object') {
      // If it's an object
      request += `<${field}>`;
      request += convertBodyToXml(body[field]);
      request += `</${field}>`;
    } else {
      // If it's not an array/object add simple tag
      request += `<${field}>${body[field]}</${field}>`;
    }
  }
  return request;
};

const wrapInMainXmlTags = (request) => `<?xml version="1.0" encoding="utf-8"?>

  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  
  <soap12:Body>
  
  ${request}
  
  </soap12:Body>
  
  </soap12:Envelope>`;

module.export = Soap;
