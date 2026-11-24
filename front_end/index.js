require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { create } = require('express-handlebars');

const router = require('./routes');
const { buildCSPDirectives, buildPermissionsPolicyHeader } = require('./libs/utils');

const extname = '.hbs';
const rootPath = `${__dirname}/public`;
const viewPath = `${rootPath}/views`;
const defaultLayout = `${viewPath}/main`; // pass pass api-uri & appkey here and add to session
const layoutsDir = `${viewPath}/layouts`;

// Configure app handlers
const app = express();
const hbs = create({ defaultLayout, layoutsDir, extname });

// Configure handlebars
app.engine(extname, hbs.engine);
app.set('view engine', extname);
app.set('views', layoutsDir);

// Configure Security Policies
const helmetDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
const contentSecurityPolicy = buildCSPDirectives(helmetDefaults); // buildCSPDirectivesTestingBypass();
const crossOriginEmbedderPolicy = false;

// Configure helmet - CSO / COEP
app.use(helmet({ contentSecurityPolicy, crossOriginEmbedderPolicy }));

// Permissions-Policy header, disable all (not available with Helmet yet)
app.use(buildPermissionsPolicyHeader);

// Configure cookie parser
app.use(cookieParser());

// Configure Session
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true, cookie: { secure: true } }));

// Configure static paths
app.use(express.static(rootPath));

// Load Routes
app.use(router);

// Start App
app.listen(8082);
