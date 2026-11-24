<a name="module_templateMatcher"></a>

## templateMatcher

* [templateMatcher](#module_templateMatcher)
    * [~TemplateMatcher](#module_templateMatcher..TemplateMatcher)
        * [new TemplateMatcher(params)](#new_module_templateMatcher..TemplateMatcher_new)
        * _instance_
            * [.buildIdentification(totalTabs, topRows)](#module_templateMatcher..TemplateMatcher+buildIdentification) ⇒ <code>identification</code>
            * [.addIdentificationToTemplate(salesTemplateId, identification, callback)](#module_templateMatcher..TemplateMatcher+addIdentificationToTemplate)
            * [.findMatchingTemplates(tabs, clientId, salesFile, callback)](#module_templateMatcher..TemplateMatcher+findMatchingTemplates)
        * _inner_
            * [~flagIndentificationAsUsedOnMultipleFiles(template, identification)](#module_templateMatcher..TemplateMatcher..flagIndentificationAsUsedOnMultipleFiles)
    * [~checkForMatch(template, identification)](#module_templateMatcher..checkForMatch) ⇒ <code>number</code>
    * [~checkForMatchByTopRowsOnly(template, identification)](#module_templateMatcher..checkForMatchByTopRowsOnly) ⇒ <code>number</code>
    * [~matchTemplatesForTab(Model, filter, matchedTemplates, idx, identification, matchByTopRowsOnly, callback)](#module_templateMatcher..matchTemplatesForTab)
    * [~matchTemplates(tabs, [clientId], salesFile, Model, callback)](#module_templateMatcher..matchTemplates)
    * [~identification](#module_templateMatcher..identification) : <code>Object</code>

<a name="module_templateMatcher..TemplateMatcher"></a>

### templateMatcher~TemplateMatcher
**Kind**: inner class of [<code>templateMatcher</code>](#module_templateMatcher)  

* [~TemplateMatcher](#module_templateMatcher..TemplateMatcher)
    * [new TemplateMatcher(params)](#new_module_templateMatcher..TemplateMatcher_new)
    * _instance_
        * [.buildIdentification(totalTabs, topRows)](#module_templateMatcher..TemplateMatcher+buildIdentification) ⇒ <code>identification</code>
        * [.addIdentificationToTemplate(salesTemplateId, identification, callback)](#module_templateMatcher..TemplateMatcher+addIdentificationToTemplate)
        * [.findMatchingTemplates(tabs, clientId, salesFile, callback)](#module_templateMatcher..TemplateMatcher+findMatchingTemplates)
    * _inner_
        * [~flagIndentificationAsUsedOnMultipleFiles(template, identification)](#module_templateMatcher..TemplateMatcher..flagIndentificationAsUsedOnMultipleFiles)

<a name="new_module_templateMatcher..TemplateMatcher_new"></a>

#### new TemplateMatcher(params)
Creates a TemplateMatcher Instance.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | Parameters for initializing Big Query. |
| params.SalesTemplate | <code>string</code> | Sales Template Model. |
| params.LibraryTemplate | <code>string</code> | Library Template Model |

<a name="module_templateMatcher..TemplateMatcher+buildIdentification"></a>

#### templateMatcher.buildIdentification(totalTabs, topRows) ⇒ <code>identification</code>
Build identification from top rows of data

**Kind**: instance method of [<code>TemplateMatcher</code>](#module_templateMatcher..TemplateMatcher)  
**Returns**: <code>identification</code> - Identification object  

| Param | Type | Description |
| --- | --- | --- |
| totalTabs | <code>string</code> | Dataset name |
| topRows | <code>string</code> | The top rows of the tabulated document |

<a name="module_templateMatcher..TemplateMatcher+addIdentificationToTemplate"></a>

#### templateMatcher.addIdentificationToTemplate(salesTemplateId, identification, callback)
Adds the identification a sales template. Checks first if the identification exists on the template already before adding it.

* Calls `callback(err)` on success, with `err` set to *null*
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: instance method of [<code>TemplateMatcher</code>](#module_templateMatcher..TemplateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| salesTemplateId | <code>string</code> | The sales template id to use |
| identification | <code>identification</code> | Identification to be added |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_templateMatcher..TemplateMatcher+findMatchingTemplates"></a>

#### templateMatcher.findMatchingTemplates(tabs, clientId, salesFile, callback)
Finds matching Sales Templates for all tabs(sheets) supplied and returns matches as an array of objects
If a Sales Template is not found it checks for a match on a Library Template.
If a matching Library Template is found, copies the Library Template to a new Sales Library and returns the Sales Library as part of the array.

* Calls `callback(err, templates)` with `templates` array of objects = {
  * tab: number of tabs,
  * matches: number of matches,
  * templateId: Sales Template id,
  * updatedAt: Date last updated }
* Calls `callback(err, templates)` with an `err` message if an error occurs

**Kind**: instance method of [<code>TemplateMatcher</code>](#module_templateMatcher..TemplateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| tabs | <code>Array.&lt;identification&gt;</code> | Array of identifications, one for each tab(sheet) |
| clientId | <code>string</code> | The client id to use for database lookup |
| salesFile | <code>object</code> | Sales File document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_templateMatcher..TemplateMatcher..flagIndentificationAsUsedOnMultipleFiles"></a>

#### TemplateMatcher~flagIndentificationAsUsedOnMultipleFiles(template, identification)
Flags an identification as used on multiple files

**Kind**: inner method of [<code>TemplateMatcher</code>](#module_templateMatcher..TemplateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| template | <code>object</code> | Template model to check against |
| identification | <code>identification</code> | The identification to check against |

<a name="module_templateMatcher..checkForMatch"></a>

### templateMatcher~checkForMatch(template, identification) ⇒ <code>number</code>
Checks if the supplied identification matches the supplied template and returns the number of matched rows

**Kind**: inner method of [<code>templateMatcher</code>](#module_templateMatcher)  
**Returns**: <code>number</code> - Number of matching rows in template identification  

| Param | Type | Description |
| --- | --- | --- |
| template | <code>object</code> | Template model to check against |
| identification | <code>identification</code> | The identification to check against |

<a name="module_templateMatcher..checkForMatchByTopRowsOnly"></a>

### templateMatcher~checkForMatchByTopRowsOnly(template, identification) ⇒ <code>number</code>
Checks if the supplied identification matches the supplied template BY topRows ONLY and returns the number of matched rows

**Kind**: inner method of [<code>templateMatcher</code>](#module_templateMatcher)  
**Returns**: <code>number</code> - Number of matching rows in template identification  

| Param | Type | Description |
| --- | --- | --- |
| template | <code>object</code> | Template model to check against |
| identification | <code>identification</code> | The identification to check against |

<a name="module_templateMatcher..matchTemplatesForTab"></a>

### templateMatcher~matchTemplatesForTab(Model, filter, matchedTemplates, idx, identification, matchByTopRowsOnly, callback)
Searches database for matching templates (either Sales Templates or Library Templates) and adds them to the supplied *matchedTemplates* object

* Calls `callback(err, foundMatch)` with `foundMatch` flag set to true if any templates were matched
* Calls `callback(err, foundMatch)` with an `err` message if an error occurs

**Kind**: inner method of [<code>templateMatcher</code>](#module_templateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| Model | <code>object</code> | The template model to use for database lookup. Can be either a Sales Template or Library Template model |
| filter | <code>object</code> | Filter to use for selecting templates |
| matchedTemplates | <code>object</code> | Object to add matched template models to |
| idx | <code>number</code> | Tab index |
| identification | <code>identification</code> | The identification to check against |
| matchByTopRowsOnly | <code>boolean</code> | Flag to set if only the top rows should be matched |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_templateMatcher..matchTemplates"></a>

### templateMatcher~matchTemplates(tabs, [clientId], salesFile, Model, callback)
Searches database for matching templates (either Sales Templates or Library Templates) for all tabs(sheets) supplied and returns matches as an array of objects.
For Library Templates clientId should not be supplied.

* Calls `callback(err, templates)` with `templates` array of objects = {
  * tab: number of tabs,
  * matches: number of matches,
  * templateId: Sales Template id,
  * updatedAt: Date last updated }
* Calls `callback(err, templates)` with an `err` message if an error occurs

**Kind**: inner method of [<code>templateMatcher</code>](#module_templateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| tabs | <code>Array.&lt;identification&gt;</code> | Array of identifications, one for each tab(sheet) |
| [clientId] | <code>string</code> | The client id to use for database lookup |
| salesFile | <code>object</code> | Sales File document |
| Model | <code>object</code> | The template model to use for database lookup. Can be either a Sales Template or Library Template model |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_templateMatcher..identification"></a>

### templateMatcher~identification : <code>Object</code>
**Kind**: inner typedef of [<code>templateMatcher</code>](#module_templateMatcher)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| a1 | <code>string</code> | The top left cell of the tabulated data |
| totalTabs | <code>number</code> | The number of tabs/sheets contained in the file |
| topRows | <code>Array.&lt;string&gt;</code> | Array of hashed rows |

