describe('templateMatcher Unit Tests', () => {
  describe('templateMatcher.buildIdentification', () => {
    describe('when topRows contains 3 rows', () => {
      it.skip('should return an object with properties totalTabs, a1 & topRows, where topRows contains hashes of the 3 rows', () => {});
    });
    describe('when topRows contains 11 rows', () => {
      it.skip('should return an object with properties totalTabs, a1 & topRows, where topRows contains hashes of 10 of the 11 rows', () => {});
    });
    describe('when topRows contains 10 rows but 2 of them contain only empty cells', () => {
      it.skip('should return an object with properties totalTabs, a1 & topRows, where topRows contains hashes of 8 rows, omitting the rows with only empty cells', () => {});
    });
  });

  describe('templateMatcher.addIdentificationToTemplate', () => {
    it.skip('calls SalesTemplate.findById with the correct arguments', () => {});
    describe('when Sales Template with salesTemplateId already contains a matching identification', () => {
      it.skip('should return null to the callback', () => {});
    });
    describe('when Sales Template with salesTemplateId does NOT contain a matching identification', () => {
      it.skip('should save the Sales Template', () => {});
      it.skip('should add identification to the salesTemplate.identification array', () => {});
      it.skip('should return null to the callback', () => {});
    });
    describe('when salesTemplate.save returns an error', () => {
      it.skip('should return null to the callback', () => {}); // TODO: This may be changed to actually return an error instead
    });
  });

  describe('templateMatcher.findMatchingTemplates', () => {
    describe('when tabs contains only one tab and this tabs identification matches a Sales Template for clientId', () => {
      it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
      it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
    });
    describe('when tabs contains two tabs and both these tabs identification matches a Sales Template for clientId', () => {
      it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
      it.skip('should return array of 2 match objects containing the correct tab, templateId and number of matches to the callback', () => {});
    });
    describe('when matchTemplates for Sales Template returns and error', () => {
      it.skip('should return the error to the callback', () => {});
    });
    describe('when tabs contains only one tab and this tabs identification does not match a Sales Template for clientId but matches a Library Template', () => {
      it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
      it.skip('should call matchTemplates with correct attributes to match against a Library Template', () => {});
      it.skip('should call LibraryTemplate.findById with the correct attributes', () => {});
      describe('when LibraryTemplate.findById returns and error', () => {
        it.skip('should return the error to the callback', () => {});
      });
      it.skip('should call libraryTemplate.createSalesTemplate', () => {});
      describe('when libraryTemplate.createSalesTemplate returns and error', () => {
        it.skip('should return the error to the callback', () => {});
      });
      it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
    });
    describe('when tabs contains only one tab and this tabs identification does not match a Sales Template for clientId AND does not match a Library Template', () => {
      it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
      it.skip('should call matchTemplates with correct attributes to match against a Library Template', () => {});
      it.skip('should return an empty array the callback', () => {});
    });
    describe('when matchTemplates for Library Template returns and error', () => {
      it.skip('should return the error to the callback', () => {});
    });
  });
  describe('-- Private Functions -- ', () => {
    describe('checkForMatch', () => {
      describe('when template.identification is undefined', () => {
        it.skip('should return false', () => {});
      });
      describe('when template.identification is null', () => {
        it.skip('should return false', () => {});
      });
      describe('when template.identification matches the supplied template', () => {
        it.skip('should return the number of matched rows', () => {});
      });
      describe('when only topRows in template.identification match topRows in the supplied template', () => {
        it.skip('should return false', () => {});
      });
    });

    describe('checkForMatchByTopRowsOnly', () => {
      describe('when template.identification is undefined', () => {
        it.skip('should return false', () => {});
      });
      describe('when template.identification is null', () => {
        it.skip('should return false', () => {});
      });
      describe('when only topRows in template.identification matches topRows in the supplied template', () => {
        it.skip('should return the number of matched rows', () => {});
      });
    });

    describe('matchTemplates', () => {
      describe('when tabs contains only 1 tab and this tabs identification matches a Sales Template for clientId AND SalesTemplate Model is passed as Model', () => {
        it.skip('should matchTemplatesForTab with correct attributes to match against a Sales Template', () => {});
        it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
      });
      describe(
        'when tabs contains only 1 tab and this tabs identification matches a Sales Template for clientId (but only by topRows)' +
          ' AND SalesTemplate Model is passed as Model',
        () => {
          it.skip('should call matchTemplatesForTab with correct attributes to match against a Sales Template', () => {});
          it.skip('should call matchTemplatesForTab A SECOND TIME with correct attributes to match against a Sales Template by topRows only', () => {});
          it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
        }
      );
      describe('when tabs contains 2 tabs and both these tabs identification matches a Sales Template for clientId AND SalesTemplate Model is passed as Model', () => {
        it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
        it.skip('should return array of 2 match objects containing the correct tab, templateId and number of matches to the callback', () => {});
      });
      describe('when tabs contains only 1 tab and this tabs identification matches two Sales Templates for clientId AND SalesTemplate Model is passed as Model', () => {
        it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
        it.skip('the correct tab, templateId and number of matches (for Sales Template with the most topRow matches) to the callback', () => {});
      });
      describe(
        'when tabs contains only 1 tab and this tabs identification matches two Sales Templates by the same amount of topRows' +
          ' AND SalesTemplate Model is passed as Model',
        () => {
          it.skip('should call matchTemplates with correct attributes to match against a Sales Template', () => {});
          it.skip('the correct tab, templateId and number of matches (for Sales Template that has been most recently updated) to the callback', () => {});
        }
      );

      describe('when tabs contains only one tab and this tabs identification matches a Library Template AND LibraryTemplate Model is passed as Model', () => {
        it.skip('should matchTemplatesForTab with correct attributes to match against a Library Template', () => {});
        it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
      });
      describe(
        'when tabs contains only one tab and this tabs identification matches a Library Template for (but only by topRows)' +
          ' AND LibraryTemplate Model is passed as Model',
        () => {
          it.skip('should call matchTemplatesForTab with correct attributes to match against a Library Template', () => {});
          it.skip('should call matchTemplatesForTab A SECOND TIME with correct attributes to match against a Library Template by topRows only', () => {});
          it.skip('should return array of 1 match object containing the correct tab, templateId and number of matches to the callback', () => {});
        }
      );
    });

    describe('matchTemplatesForTab', () => {
      describe('when filter is passed that matches 1 Sales Template AND SalesTemplate is passed as Model', () => {
        it.skip('should add 1 match object to matchedTemplates', () => {});
        it.skip('should return true to the callback', () => {});
      });
      describe('when filter is passed that matches 2 Sales Templates AND SalesTemplate is passed as Model', () => {
        it.skip('should add 2 match objects to matchedTemplates', () => {});
        it.skip('should return true to the callback', () => {});
      });
      describe('when filter is passed that does not match a Sales Template AND SalesTemplate is passed as Model', () => {
        it.skip('should return false to the callback', () => {});
      });
      describe('when filter is passed that matches 1 Sales Template AND SalesTemplate is passed as Model but SalesTemplate.archived is set to true', () => {
        it.skip('should return false to the callback', () => {});
      });

      describe('when filter is passed that matches 1 Library Template AND LibraryTemplate is passed as Model', () => {
        it.skip('should add 1 match object to matchedTemplates', () => {});
        it.skip('should return true to the callback', () => {});
      });
      describe('when filter is passed that matches 2 Library Templates AND LibraryTemplate is passed as Model', () => {
        it.skip('should add 2 match objects to matchedTemplates', () => {});
        it.skip('should return true to the callback', () => {});
      });
      describe('when filter is passed that does not match a Library Template AND LibraryTemplate is passed as Model', () => {
        it.skip('should return false to the callback', () => {});
      });
    });
  });
});
