<a name="module_runCostCalculations"></a>

## runCostCalculations
<a name="exp_module_runCostCalculations--module.exports"></a>

### module.exports(cost, db, bigQuery, client, period, catalogueData, contract, callback) ⏏
Runs the calculation for the passed cost

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| cost | <code>object</code> | Instance of Cost model |
| db | <code>object</code> | Instance of MongoDB connection |
| bigQuery | <code>object</code> | Instance of BigQuery connection |
| client | <code>object</code> | Instance of Client model |
| period | <code>object</code> | Instance of Period model |
| catalogueData | <code>object</code> | Catalogue data passed for mapping in the cost calculation |
| contract | <code>object</code> | Instance of Contract model |
| callback | <code>function</code> | A callback that handles any errors |

