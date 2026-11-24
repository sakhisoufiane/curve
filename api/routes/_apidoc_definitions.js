/**
 * @apiDefine TokenParams
 * @apiHeader {String} applicationToken - Unique token for api
 * @apiHeader {String} token - Users unique access token
 */

/**
 * @apiDefine ErrorForbidden
 * @apiError Forbidden - Only client users can access the data
 * @apiErrorExample {json} Forbidden Response:
 *  HTTP/1.1 403 Forbidden
 *  {
 *    "message": "Forbidden"
 *  }
 */

/**
 * @apiDefine ErrorForbiddenNotInternal
 * @apiError Forbidden - Only internal users can access the data
 * @apiErrorExample {json} Forbidden Response:
 *  HTTP/1.1 403 Forbidden
 *  {
 *    "message": "Forbidden"
 *  }
 */

/**
 * @apiDefine ErrorInternalServerError
 * @apiError (Error 500) InternalServerError - Server encountered an internal error
 * @apiErrorExample {json} InternalServerError Response:
 *  HTTP/1.1 500 Internal Server Error
 *  {
 *    "message": "Internal error, please try again"
 *  }
 */

/**
 * @apiDefine ErrorSalesFileNotFound
 * @apiError NotFound - Sales File could not be found
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *    "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
 *  }
 */

/**
 * @apiDefine ErrorSalesTemplateNotFound
 * @apiError NotFound - Sales Template could not be found
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *    "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
 *  }
 */

/**
 * @apiDefine ErrorLibraryTemplateNotFound
 * @apiError NotFound - Library Template could not be found
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *    "message": "Could not find Library Template with ID 3e9ad5989603d03d836btest"
 *  }
 */
