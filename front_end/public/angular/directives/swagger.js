/* global SwaggerUIBundle */
angular.module('Curve').directive('swaggerHost', (Session, httpInterceptor, $q) => ({
  restrict: 'E',
  replace: true,
  template: '<div></div>',
  link(scope, el) {
    const root = el[0].attachShadow ? el[0].attachShadow({ mode: 'closed' }) : el[0];
    root.innerHTML = '';

    // Load Swagger UI scripts dynamically
    const loadScript = (src) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const loadSwaggerUI = async () => {
      await loadScript('swagger-ui/swagger-ui-bundle.js');
      await loadScript('swagger-ui/swagger-ui-standalone-preset.js');

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'swagger-ui/swagger-ui.css';
      root.appendChild(link);

      const container = document.createElement('div');
      root.appendChild(container);

      SwaggerUIBundle({
        url: `${Session.apiUrl}/swagger/swagger.json`,
        domNode: container,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        plugins: [
          () => ({ components: { InfoUrl: () => null } }),
        ],
        requestInterceptor(req) {
          const i = httpInterceptor.request({ url: req.url, headers: req.headers });
          req.headers = i.headers;
          return req;
        },
      });
    };

    loadSwaggerUI();
  },
}));
