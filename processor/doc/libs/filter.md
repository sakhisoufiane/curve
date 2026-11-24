<a name="module_filter"></a>

## filter

* [filter](#module_filter)
    * [~Filter](#module_filter..Filter) : <code>object</code>
        * [.processSalesInput(filter, filteredContractIds, catalogueIds)](#module_filter..Filter.processSalesInput) ⇒ <code>object</code>
        * [.processSalesOutput(filter, filteredContractIds, catalogueIds, payeeContracts)](#module_filter..Filter.processSalesOutput) ⇒ <code>object</code>
        * [.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId)](#module_filter..Filter.processCostsInput) ⇒ <code>object</code>
        * [.processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds)](#module_filter..Filter.processCostsOutput) ⇒ <code>object</code>

<a name="module_filter..Filter"></a>

### filter~Filter : <code>object</code>
**Kind**: inner namespace of [<code>filter</code>](#module_filter)  

* [~Filter](#module_filter..Filter) : <code>object</code>
    * [.processSalesInput(filter, filteredContractIds, catalogueIds)](#module_filter..Filter.processSalesInput) ⇒ <code>object</code>
    * [.processSalesOutput(filter, filteredContractIds, catalogueIds, payeeContracts)](#module_filter..Filter.processSalesOutput) ⇒ <code>object</code>
    * [.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId)](#module_filter..Filter.processCostsInput) ⇒ <code>object</code>
    * [.processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds)](#module_filter..Filter.processCostsOutput) ⇒ <code>object</code>

<a name="module_filter..Filter.processSalesInput"></a>

#### Filter.processSalesInput(filter, filteredContractIds, catalogueIds) ⇒ <code>object</code>
Process Sales Input || Income Data

**Kind**: static method of [<code>Filter</code>](#module_filter..Filter)  
**Returns**: <code>object</code> - - the Sales Input Filter  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter passed to filter lib |
| filteredContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying all contract filters |
| catalogueIds | <code>object</code> | output of all catalogue queries to Catalogue DB |

<a name="module_filter..Filter.processSalesOutput"></a>

#### Filter.processSalesOutput(filter, filteredContractIds, catalogueIds, payeeContracts) ⇒ <code>object</code>
Process Sales Output || Royalties || Sales

**Kind**: static method of [<code>Filter</code>](#module_filter..Filter)  
**Returns**: <code>object</code> - - the Sales Output Filter  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter passed to filter lib |
| filteredContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying all contract filters |
| catalogueIds | <code>object</code> | output of all catalogue queries to Catalogue DB |
| payeeContracts | <code>Array.&lt;object&gt;</code> | all contracts payee has access to |

<a name="module_filter..Filter.processCostsInput"></a>

#### Filter.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId) ⇒ <code>object</code>
Process Costs Input

**Kind**: static method of [<code>Filter</code>](#module_filter..Filter)  
**Returns**: <code>object</code> - - the Costs Input Filter  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter passed to filter lib |
| filteredContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying all contract filters |
| catalogueIds | <code>object</code> | output of all catalogue queries to Catalogue DB |
| projectIdContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying Project Id filter |
| clientId | <code>string</code> | the clientId from user |

<a name="module_filter..Filter.processCostsOutput"></a>

#### Filter.processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds) ⇒ <code>object</code>
process Costs Output || Costs

**Kind**: static method of [<code>Filter</code>](#module_filter..Filter)  
**Returns**: <code>object</code> - - the Costs Output Filter  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter passed to filter lib |
| filteredContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying all contract filters |
| catalogueIds | <code>object</code> | output of all catalogue queries to Catalogue DB |
| payeeContracts | <code>Array.&lt;object&gt;</code> | all contracts payee has access to |
| projectIdContractIds | <code>Array.&lt;string&gt;</code> | Contract Ids resulting from applying Project Id filter |

