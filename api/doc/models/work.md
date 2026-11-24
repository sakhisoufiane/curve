<a name="module_work"></a>

## work

* [work](#module_work)
    * [~errorMessages(err, callback)](#module_work..errorMessages)
    * [~isAnyOfTheChildrenCollected(chain)](#module_work..isAnyOfTheChildrenCollected) ⇒ <code>boolean</code>
    * [~getChildPublishersCapacityTrees(chain)](#module_work..getChildPublishersCapacityTrees) ⇒ <code>boolean</code>
    * [~checkAllIPChildrenPublishersShares(chain)](#module_work..checkAllIPChildrenPublishersShares) ⇒ <code>boolean</code>
    * [~doAllChainChildrenHaveCapacity(chain)](#module_work..doAllChainChildrenHaveCapacity) ⇒ <code>boolean</code>
    * [~doAllChainPublishersChildrenEndWithAComposer(chain)](#module_work..doAllChainPublishersChildrenEndWithAComposer) ⇒ <code>boolean</code>
    * [~areAllChainChildrenControlled(chain)](#module_work..areAllChainChildrenControlled) ⇒ <code>boolean</code>
    * [~doAllComposerFieldsContainComposer(chain)](#module_work..doAllComposerFieldsContainComposer) ⇒ <code>boolean</code>
    * [~doAllPublisherFieldsContainPublisher(chain)](#module_work..doAllPublisherFieldsContainPublisher) ⇒ <code>boolean</code>
    * [~sumValueInIpChainChildren(item, field, total)](#module_work..sumValueInIpChainChildren) ⇒ <code>number</code>
    * [~composersForMapping(clientId, callback)](#module_work..composersForMapping)
    * [~publishersForMapping(clientId, callback)](#module_work..publishersForMapping)
    * [~replaceIpChainTerritoryIfGroup(callback)](#module_work..replaceIpChainTerritoryIfGroup)
    * [~populateComposersPublishers(chains, callback)](#module_work..populateComposersPublishers)
    * [~combineComposerChains(chains)](#module_work..combineComposerChains) ⇒ <code>Array.&lt;object&gt;</code>
    * [~deconstructIpChain(level, row, chain)](#module_work..deconstructIpChain)
    * [~validateChainRequiredFields(chain, index)](#module_work..validateChainRequiredFields) ⇒ <code>Array.&lt;string&gt;</code>
    * [~combineChildComposers(chain)](#module_work..combineChildComposers)
    * [~mapToPublisherOrComposer(chain, clientId, callback)](#module_work..mapToPublisherOrComposer)
    * [~combineSameLevelParents(chain)](#module_work..combineSameLevelParents)
    * [~getParentsChildren(startIndex, chain)](#module_work..getParentsChildren)
    * [~getComposer(clientId, name, firstName, middleNames, surname, cae, controlled, callback)](#module_work..getComposer)
    * [~getPublisher(clientId, name, cae, controlled, callback)](#module_work..getPublisher)

<a name="module_work..errorMessages"></a>

### work~errorMessages(err, callback)
Formats an error message to a human readable format.

Calls callback(null, newMessages) with the formatted error [newMessages].

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..isAnyOfTheChildrenCollected"></a>

### work~isAnyOfTheChildrenCollected(chain) ⇒ <code>boolean</code>
Checks if a chain has controlled children.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - isAnyOfTheChildrenCollected - Returns true if a children is controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..getChildPublishersCapacityTrees"></a>

### work~getChildPublishersCapacityTrees(chain) ⇒ <code>boolean</code>
Check publishers' children capacity order.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allChildrenControlled - Returns true if all children all controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..checkAllIPChildrenPublishersShares"></a>

### work~checkAllIPChildrenPublishersShares(chain) ⇒ <code>boolean</code>
Checks if a chain's publisher children have a share no greater that 50%.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allChildrenControlled - Returns true if all children all controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..doAllChainChildrenHaveCapacity"></a>

### work~doAllChainChildrenHaveCapacity(chain) ⇒ <code>boolean</code>
Checks if a controlled chain's children have a capacity.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allChildrenControlled - Returns true if all children all controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..doAllChainPublishersChildrenEndWithAComposer"></a>

### work~doAllChainPublishersChildrenEndWithAComposer(chain) ⇒ <code>boolean</code>
Checks if a controlled chain's children have a capacity.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allChildrenControlled - Returns true if all children all controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..areAllChainChildrenControlled"></a>

### work~areAllChainChildrenControlled(chain) ⇒ <code>boolean</code>
Checks if a controlled chain's children are all controlled.

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allChildrenControlled - Returns true if all children all controlled  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..doAllComposerFieldsContainComposer"></a>

### work~doAllComposerFieldsContainComposer(chain) ⇒ <code>boolean</code>
Checks if all composer fields have been assigned a composer

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allComposerFieldsContainComposer - Returns true if all composer fields have been assigned a composer  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..doAllPublisherFieldsContainPublisher"></a>

### work~doAllPublisherFieldsContainPublisher(chain) ⇒ <code>boolean</code>
Checks if all publisher fields have been assigned a publisher

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>boolean</code> - allPublisherFieldsContainPublisher - Returns true if all publisher fields have been assigned a publisher  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The chain to check. |

<a name="module_work..sumValueInIpChainChildren"></a>

### work~sumValueInIpChainChildren(item, field, total) ⇒ <code>number</code>
Sums the total value of the ip chain children

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>number</code> - total - the ip chain sum  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>object</code> | The work's ip chain. |
| field | <code>string</code> | The work's ip chain field to sum up. |
| total | <code>number</code> | The initial total to add to. |

<a name="module_work..composersForMapping"></a>

### work~composersForMapping(clientId, callback)
Creates an object of composers for mapping.

Calls callback(err, output) with an [err] if an error occurs and the [output] object containing the mapping.

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | The ID of the client the composers belong to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..publishersForMapping"></a>

### work~publishersForMapping(clientId, callback)
Creates an object of publishers for mapping.

Calls callback(err, output) with an [err] if an error occurs and the [output] object containing the mapping.

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | The ID of the client the publishers belong to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..replaceIpChainTerritoryIfGroup"></a>

### work~replaceIpChainTerritoryIfGroup(callback)
Returns a territory when passed a valid TerritoryGroup ObjectId.

Calls callback(err, territory) with an [err] if an error occurs and the [territory] when found.

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..populateComposersPublishers"></a>

### work~populateComposersPublishers(chains, callback)
Populates the ip chain's publisher and composer ids

Calls callback(error) when done

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| chains | <code>Array.&lt;object&gt;</code> | The ip chains to populate. |
| callback | <code>function</code> | the callback that hadnles the response |

<a name="module_work..combineComposerChains"></a>

### work~combineComposerChains(chains) ⇒ <code>Array.&lt;object&gt;</code>
Combines chains that have the same parents and end with a composer into one chain

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>Array.&lt;object&gt;</code> - chains - the combined chains  

| Param | Type | Description |
| --- | --- | --- |
| chains | <code>Array.&lt;object&gt;</code> | The ip chains to combine. |

<a name="module_work..deconstructIpChain"></a>

### work~deconstructIpChain(level, row, chain)
Deconstructs an ip chain into rows for the excel export data

Calls callback(error) when done

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| level | <code>number</code> | The parent level |
| row | <code>object</code> | The deconstructed row |
| chain | <code>object</code> | The chain being deconstructed |

<a name="module_work..validateChainRequiredFields"></a>

### work~validateChainRequiredFields(chain, index) ⇒ <code>Array.&lt;string&gt;</code>
Validates an ip chain required fields

**Kind**: inner method of [<code>work</code>](#module_work)  
**Returns**: <code>Array.&lt;string&gt;</code> - errors- An array of validation errors  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The ip chain to validate. |
| index | <code>number</code> | Chain excel line number. |

<a name="module_work..combineChildComposers"></a>

### work~combineChildComposers(chain)
Makes sure Composers have no children and puts child composers on the same level as the parent

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The ip chain to validate. |

<a name="module_work..mapToPublisherOrComposer"></a>

### work~mapToPublisherOrComposer(chain, clientId, callback)
Finds/Create composers/publishers and attaches the ID to the chain

Calls callback(error) with an [error] if an errror occurs.

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The ip chain to validate. |
| clientId | <code>string</code> | Client doing the import. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..combineSameLevelParents"></a>

### work~combineSameLevelParents(chain)
Combines same territory parents if they're on the same level

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| chain | <code>object</code> | The ip chain to combine. |

<a name="module_work..getParentsChildren"></a>

### work~getParentsChildren(startIndex, chain)
Gets all participants from an excel ip chain row

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| startIndex | <code>number</code> | The participants index. |
| chain | <code>object</code> | The ip chain to combine. |

<a name="module_work..getComposer"></a>

### work~getComposer(clientId, name, firstName, middleNames, surname, cae, controlled, callback)
Creates a new Composer.

Calls callback(error, composer) with an [error] if an error occurs and the created [composer].

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | The ID of the client creating the composer. |
| name | <code>string</code> | Name of the composer. |
| firstName | <code>string</code> | First name of the composer. |
| middleNames | <code>string</code> | Middle names of the composer. |
| surname | <code>string</code> | Surname of the composer. |
| cae | <code>string</code> | CAE of the composer. |
| controlled | <code>boolean</code> | Is the composer controlled?. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_work..getPublisher"></a>

### work~getPublisher(clientId, name, cae, controlled, callback)
Creates a new Publisher.

Calls callback(error, publisher) with an [error] if an error occurs and the created [publisher].

**Kind**: inner method of [<code>work</code>](#module_work)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | The ID of the client creating the publisher. |
| name | <code>string</code> | Name of the publisher. |
| cae | <code>string</code> | CAE of the publisher. |
| controlled | <code>boolean</code> | Is the composer publisher?. |
| callback | <code>function</code> | The callback that handles the response. |

