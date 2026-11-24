const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const errorRouter = require('./error');

// Mock fs module to control HTML file reading behavior
jest.mock('fs');

describe('Error Route', () => {
  let app;

  beforeEach(() => {
    // Create a test Express app with just the error router
    app = express();
    app.use(errorRouter);
  });

  afterEach(() => {
    delete process.env.frontEndUrl;
    jest.clearAllMocks();
  });

  describe('GET /error', () => {
    it('should serve error page with default frontend URL when no env var is set', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a></body></html>';
      const expectedHtml = `<html><body><a href="${process.env?.frontEndUrl ? process.env.frontEndUrl : 'https://app.curveroyaltysystems.com'}/login">login</a></body></html>`;
      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
      expect(fs.readFileSync).toHaveBeenCalledWith(path.join(__dirname, '../public/error.html'), 'utf8');
    });

    it('should serve error page with custom frontend URL from environment', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a></body></html>';
      const expectedHtml = '<html><body><a href="http://localhost:3000/login">login</a></body></html>';

      process.env.frontEndUrl = 'http://localhost:3000';
      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
    });

    it('should handle file read errors gracefully', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const response = await request(app).get('/error');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error loading page');
    });

    it('should replace multiple occurrences of template placeholder', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a><span>{{FRONTEND_URL}}</span></body></html>';
      const expectedHtml = '<html><body><a href="http://staging.example.com/login">login</a><span>http://staging.example.com/login</span></body></html>';

      process.env.frontEndUrl = 'http://staging.example.com';
      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
    });

    it('should handle HTML with no template placeholders', async () => {
      const mockHtml = '<html><body><h1>404 Error</h1></body></html>';

      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.status).toBe(404);
      expect(response.text).toBe(mockHtml);
    });
  });

  describe('GET /', () => {
    it('should serve error page on root path', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a></body></html>';
      const expectedHtml = '<html><body><a href="https://app.curveroyaltysystems.com/login">login</a></body></html>';

      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
    });

    it('should serve error page on api-docs path', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a></body></html>';
      const expectedHtml = '<html><body><a href="https://app.curveroyaltysystems.com/login">login</a></body></html>';

      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/api-docs');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
    });

    it('should serve error page on any route after api-docs path', async () => {
      const mockHtml = '<html><body><a href="{{FRONTEND_URL}}">login</a></body></html>';
      const expectedHtml = '<html><body><a href="https://app.curveroyaltysystems.com/login">login</a></body></html>';

      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/api-docs/testing/random/route');

      expect(response.status).toBe(404);
      expect(response.text).toBe(expectedHtml);
    });

    it('should handle different environment URLs correctly', async () => {
      const testCases = [
        {
          envUrl: 'https://app-dev.curveroyaltysystems.com',
          expected: 'https://app-dev.curveroyaltysystems.com/login',
        },
        {
          envUrl: 'https://app-staging.curveroyaltysystems.com',
          expected: 'https://app-staging.curveroyaltysystems.com/login',
        },
        {
          envUrl: 'http://localhost:8082',
          expected: 'http://localhost:8082/login',
        },
      ];

      for (let i = 0; i < testCases.length; i += 1) {
        const testCase = testCases[i];
        const mockHtml = '<a href="{{FRONTEND_URL}}">test</a>';
        const expectedHtml = `<a href="${testCase.expected}">test</a>`;

        process.env.frontEndUrl = testCase.envUrl;
        fs.readFileSync.mockReturnValue(mockHtml);

        // eslint-disable-next-line no-await-in-loop
        const response = await request(app).get('/');

        expect(response.status).toBe(404);
        expect(response.text).toBe(expectedHtml);

        // Clean up
        delete process.env.frontEndUrl;
        jest.clearAllMocks();
      }
    });
  });

  describe('Template replacement logic', () => {
    it('should correctly append /login to frontend URL', async () => {
      const mockHtml = '{{FRONTEND_URL}}';

      process.env.frontEndUrl = 'https://example.com';
      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.text).toBe('https://example.com/login');
    });

    it('should handle frontend URL with trailing slash', async () => {
      const mockHtml = '{{FRONTEND_URL}}';

      process.env.frontEndUrl = 'https://example.com/';
      fs.readFileSync.mockReturnValue(mockHtml);

      const response = await request(app).get('/error');

      expect(response.text).toBe('https://example.com//login');
    });
  });

  describe('File path resolution', () => {
    it('should use correct file path for HTML template', async () => {
      const mockHtml = '<html></html>';
      fs.readFileSync.mockReturnValue(mockHtml);

      await request(app).get('/error');

      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('public/error.html'), 'utf8');
    });
  });
});
