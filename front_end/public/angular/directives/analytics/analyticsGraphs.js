angular.module('Curve')
  .directive('analyticsGraphs', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graphs.html',
      scope: {
        analysisData: '=',
        comparisonData: '=',
        filters: '=',
        comparisonFilters: '=',
        showingComparison: '=',
        getAnalyticsData: '=',
        fieldOptions: '=',
        releases: '=',
        tracks: '=',
        works: '=',
        loadCurrentCatalogue: '=',
      },
      link(scope) {
        const baseData = {
          comparison: {},
          distributionChannels: {},
          configurations: {},
          territories: {},
          sources: {},
          subSources: {},
          costs: {},
          releases: [],
          works: [],
          tracks: [],
          topArtists: [],
          topLabels: [],
          totals: false,
          revenueOverTime: {},
          averageStreamRates: [],
          contractBreakdown: [],
        };

        scope.currencySymbol = Session.currencySymbol;
        scope.emptyAnalyticsResponse = false;
        scope.emptyComparisonResponse = false;
        scope.lineDatasetOverride = [{ yAxisID: 'y-axis-1' }];

        scope.lineOptions = {
          scales: {
            yAxes: [{
              id: 'y-axis-1',
              type: 'linear',
              display: true,
              position: 'left',
            }],
          },
        };

        scope.pieOptions = {
          legend: {
            display: true,
            position: 'top',
          },
        };

        scope.barOptions = {
          scales: {
            xAxes: [{
              ticks: {
                autoSkip: false,
              },
            }],
          },
        };

        scope.headers = [
          { title: 'Title', name: 'title', sortable: false, required: true },
          { title: 'Type', name: 'type', sortable: false },
          { title: 'Value', name: 'value', sortable: false, required: true },
        ];

        scope.$watch('analysisData', (analysisData) => {
          if (analysisData) {
            // Passive - Assume no data retrieved
            scope.emptyAnalyticsResponse = true;
            // Clean - Reset the data
            scope.displayData = angular.copy(baseData);
            // Initialise - Convert the raw data retrieved to view ready data on the scope
            initDisplayData(analysisData, scope.displayData);
          }
        });

        scope.$watch('comparisonData', (comparisonData) => {
          if (comparisonData) {
            // Passive - Assume no data retrieved
            scope.emptyComparisonResponse = true;
            // Clean - Reset the data
            scope.compareDisplayData = angular.copy(baseData);
            // Initialise - Convert the raw data retrieved to view ready data on the scope
            initDisplayData(comparisonData, scope.compareDisplayData, true);
          }
        });

        scope.$watch(() => Session.currencySymbol, (newValue, oldValue) => {
          if (newValue !== oldValue) {
            scope.currencySymbol = newValue;
          }
        });

        scope.drillDownChart = function (points, evt) {
          /*
          ...possibly this example might resolve the click on labels issue. - revisit but our setup us more complex
          https://stackoverflow.com/questions/36357832/how-to-make-labels-clickable-in-angular-chart
          var pointsClicked = $scope.chart.getPointsAtEvent(evt);
          if (!pointsClicked || pointsClicked.length == 0) return;
          if (pointsClicked[0].label) $scope.label = 'You clicked on ' + pointsClicked[0].label;
          */
          // console.log(points); // console.log(evt); // console.log(scope.filters);
          if (points && points.length) {
            const pointsData = points[0];
            let drillValue;
            let data;
            let displayData;
            if (pointsData && pointsData._chart && pointsData._chart.canvas && pointsData._chart.canvas.id) {
              let field = pointsData._chart.canvas.id; // ie distributionChannel
              const index = pointsData._index;
              // Test if comparison chart to set the data source
              const isComparisonChart = field.slice(-1) === 'B';
              // var data = (isComparisonChart) ? scope.comparisonData : scope.analysisData;

              // Need to test the displayData to prevent drilldown on 'Other'
              if (isComparisonChart) {
                data = scope.comparisonData;
                displayData = scope.compareDisplayData;
              } else {
                data = scope.analysisData;
                ({ displayData } = scope);
              }

              // Strip the column identifier
              field = field.substring(0, field.length - 1);
              // console.log({isComparisonChart, field});

              // If we've succesfully hacked the data we need... proceed
              if (data[field] && data[field].length && data[field][index]) {
                let displayField = field;
                // display fields use 'releases', 'tracks', 'works' instead, so remove the 'Id' from those to select from displayData
                if (['releaseIds', 'trackIds', 'workIds'].includes(field)) {
                  displayField = field.replace('Id', '');
                }
                if (displayData[displayField] && displayData[displayField].data) {
                  const barOrPie = displayData[displayField].data.bar || displayData[displayField].data.pie;
                  if (Array.isArray(barOrPie) && data[field].length > barOrPie.length && barOrPie.length - 1 === index) {
                    // This has data truncated to 'Other' && is a drilldown on 'Other' - so don't proceed
                    return;
                  }
                }

                // This may need extended/refactored if more id based charts are added
                if (['releaseIds', 'trackIds', 'workIds'].includes(field)) {
                  drillValue = data[field][index].id;// console.log({catdata: data[field][index]});
                } else {
                  drillValue = data[field][index].type;
                }
                // console.log({drillValue, field});
                // console.log(field, index, drillValue);
                // Lookup field type and if multiple then convert string to array
                drillDownWorker(field, drillValue, isComparisonChart);
              }
            }
          }
        };

        scope.drillDownTable = function (field, drillValue, isComparisonChart) {
          // console.log({field}, {drillValue});
          if (drillValue !== 'Other') {
            drillDownWorker(field, drillValue, isComparisonChart);
          }
        };

        scope.drillDownDummy = function () {
          // This exixts to avoid a seperate directive or code duplication for costs

        };

        function initDisplayData(dataIn, dataOut, isComparison) {
          loadTotals(dataIn, dataOut);
          dataToLabelsAndData(dataIn.distributionChannels, dataOut.distributionChannels, { limit: 12, removeNegative: true }, isComparison);
          dataToLabelsAndData(dataIn.configurations, dataOut.configurations, { limit: 12, removeNegative: true }, isComparison);
          dataToLabelsAndData(dataIn.sources, dataOut.sources, { limit: 12 }, isComparison);
          dataToLabelsAndData(dataIn.subSources, dataOut.subSources, { limit: 12 }, isComparison);
          dataToLabelsAndData(dataIn.territories, dataOut.territories, { limit: 12, mapTerritory: true }, isComparison);
          dataToLabelsAndData(dataIn.costs, dataOut.costs, { limit: 12, removeNegative: true }, isComparison);
          dataToLabelsAndData(dataIn.topArtists, dataOut.topArtists, { limit: 20 }, isComparison);
          dataToLabelsAndData(dataIn.topLabels, dataOut.topLabels, { limit: 12 }, isComparison);
          dataToLabelsAndData(dataIn.releaseIds, dataOut.releases, { catalogue: true, limit: 100, barAndPieLimit: 20 }, isComparison);
          dataToLabelsAndData(dataIn.trackIds, dataOut.tracks, { catalogue: true, limit: 100, barAndPieLimit: 20 }, isComparison);
          dataToLabelsAndData(dataIn.workIds, dataOut.works, { catalogue: true, limit: 100, barAndPieLimit: 20 }, isComparison);
          loadRevenueOverTime(dataIn.revenueOverTime, dataOut, isComparison);
          loadAverageStreamRates(dataIn.averageStreamRates, dataOut, isComparison);
          loadContractBreakdown(dataIn.contractBreakdown, dataOut, isComparison);
        }

        function drillDownWorker(field, drillValue, isComparisonChart) {
          // console.log({field},{drillValue},{isComparisonChart});
          const data = (isComparisonChart) ? scope.comparisonData : scope.analysisData;
          const filters = (isComparisonChart) ? scope.comparisonFilters : scope.filters;
          let reloadData = false;
          // console.log('drillDownWorker > field',field);
          // console.log('drillDownWorker > drillValue',drillValue);
          // Test the length of scope.analysisData[field] and only proceed if > 1 to
          // avoid pointless drilldown and api lookup which will retreive the same data
          if (data[field]) {
            if (data[field].length === 1) {
              // check for existance of this field in the filter block to reverse the drilldown
              filters.filterblocks.forEach((block) => {
                block.filterRows.forEach((row, i) => {
                  // console.log(row.key, field);
                  if (row.key === field) {
                    // Row exists - remove from filters - Timing here is critical as we also need to remove used flag from option!
                    // Trigger the key watcher on row to freeup selection of this option key
                    row.key = undefined;
                    // Need to allow the filter row watcher time to update option as unused before removing row
                    setTimeout(() => {
                      block.filterRows.splice(i, 1);
                      // If block is empty now add starter row
                      if (block.filterRows.length === 0) {
                        block.filterRows.push({});
                      }
                    }, 500);

                    reloadData = true;
                  }
                });
              });
            } else if (data[field].length > 1) {
              reloadData = true;
              scope.fieldOptions.forEach((option) => {
                if (option.value === field) {
                  // we have the right field option
                  if (option.type === 'multi') {
                    // convert to array
                    drillValue = [drillValue];
                  }
                }
              });

              // now check for existance of this field in the filter block
              filters.filterblocks.forEach((block) => {
                let updateRow = null;
                // if drilling down, the value for this value should be replaced
                block.filterRows.forEach((row, i) => {
                  if (i === 0 && Object.keys(row).length < 2) {
                    // If 1st row in block is empty on drilldown- use this row (< 2 to account for $$hashKey)
                    row.key = field;
                    updateRow = row;
                  } else if (row.key === field) {
                    // Row exists - store to update
                    updateRow = row;
                  }
                });
                // Add drillValue to query object
                if (updateRow) {
                  updateRow.values = drillValue;
                } else {
                  block.filterRows.push({
                    key: field,
                    values: drillValue,
                  });
                }
              });
            }
            if (reloadData) {
              scope.getAnalyticsData();
              scope.loadCurrentCatalogue(filters.filterblocks);
            }
          }
        }

        function dataToLabelsAndData(data, writeObject, options, isComparison) {
          let top;
          let rest;
          let otherTotal;
          if (!options) { options = {}; }
          if (data && data.length) {
            if (isComparison) {
              scope.emptyComparisonResponse = false;
            } else {
              scope.emptyAnalyticsResponse = false;
            }
            data = data.sort((a, b) => {
              if (a.value < b.value) {
                return 1;
              }
              return -1;
            });
            if (options.limit) {
              top = data.slice(0, options.limit - 1);
              rest = data.slice(options.limit - 1);
              otherTotal = 0;
              rest.forEach((item) => { otherTotal += item.value; });
              if (otherTotal > 0) { top.push({ id: 'Other', name: 'Other', type: 'Other', value: otherTotal }); }
              data = top;
            }
            const total = getTotal(data);

            let barData = angular.copy(data);
            // if bar and pie charts have different limits than the main limit, reduce down further to account for this
            if (options.barAndPieLimit) {
              top = barData.slice(0, options.barAndPieLimit - 1);
              rest = barData.slice(options.barAndPieLimit - 1);
              otherTotal = 0;
              rest.forEach((item) => { otherTotal += item.value; });
              if (otherTotal > 0) { top.push({ id: 'Other', name: 'Other', type: 'Other', value: otherTotal }); }
              barData = top;
            }
            barData = barData.map(mapGraphData(total, options));

            if (options.catalogue) {
              // For catalogue we want full data displayed in table (tables display rawData). Therefore copy from data before this is reduced. Also need to add rawType used for drill down.
              writeObject.rawData = data.map((row) => { row.rawType = row.type; return row; });
              data = data.map(mapGraphData(total, options));
            } else {
              data = data.map(mapGraphData(total, options));
              // For others we want the reduced data displayed in table (tables display rawData)
              writeObject.rawData = data;
            }
            // Preserve negatives for bar graphs but exclude for pie (labels must exactly reflect data)
            let pieData = angular.copy(barData);
            pieData = pieData.map((item) => { if (item.value > 0) { return item; } }).filter(Boolean);

            writeObject.data = {
              bar: barData.map((item) => item.value),
              pie: pieData.map((item) => item.value),
            };

            writeObject.labels = {
              bar: barData.map(mapLabels(options)),
              pie: pieData.map(mapLabels(options)),
            };
          }
        }

        function mapLabels(options) {
          return function (item) {
            if (!item.type) { item.type = 'Other'; }
            return options.hidePercentage ? item.type : `${item.type} - ${item.percentage}%`;
          };
        }

        function mapGraphData(total, options) {
          return function (item) {
            const rawType = item.type; // needed for drilldown on mapped territories table

            let { type } = item;
            if (options.catalogue && item.type !== 'Other') {
              type = `${item.title} - ${item.type}`;
            }

            if (options.mapTerritory) {
              type = mapTerritory(item.type);
            }
            return {
              type,
              rawType,
              percentage: ((item.value / total) * 100).toFixed(2),
              value: item.value.toFixed(2).toLocaleString('en'),
            };
          };
        }

        function loadTotals(analysis, displayData) {
          displayData.totals = {
            units: analysis.totalUnits || 0,
            revenue: analysis.totalRevenue || 0,
            costs: analysis.totalCosts || 0,
          };
        }

        function loadRevenueOverTime(revenueOverTimeData, displayData, isComparison) {
          if (revenueOverTimeData && revenueOverTimeData.length) {
            const labels = revenueOverTimeData.map((item) => item.date);
            const figures = revenueOverTimeData.map((item) => item.value.toFixed(2).toLocaleString('en'));
            displayData.revenueOverTime.labels = labels;
            displayData.revenueOverTime.figures = figures;

            if (isComparison) {
              scope.emptyComparisonResponse = false;
              // we have a comparison so try to build a merged chart
              // pull the figures from main filters' data on the scope and add merged to scope.compareDisplayData
              if (scope.displayData.revenueOverTime.figures && scope.displayData.revenueOverTime.figures.length) {
                displayData.revenueOverTimeMerged = {};
                displayData.revenueOverTimeMerged.series = [' Main Filter', ' Comparison'];
                displayData.revenueOverTimeMerged.labels = labels;
                displayData.revenueOverTimeMerged.figures = [
                  scope.displayData.revenueOverTime.figures,
                  figures,
                ];
              }
            } else {
              scope.emptyAnalyticsResponse = false;
            }

            // console.log('revenueOverTime ', (isComparison) ? 'comparison' : 'main', displayData.revenueOverTime);
            // console.log('revenueOverTimeMerged ', (isComparison) ? 'comparison' : 'main', displayData.revenueOverTimeMerged);
          }
        }

        function loadAverageStreamRates(averageStreamRatesData, displayData, isComparison) {
          if (averageStreamRatesData && averageStreamRatesData.length) {
            if (isComparison) {
              scope.emptyComparisonResponse = false;
            } else {
              scope.emptyAnalyticsResponse = false;
            }
            displayData.averageStreamRates = averageStreamRatesData.map((item) => ({
              source: item.source,
              subSource: item.subSource,
              averageStreamRate: item.averageStreamRate ? item.averageStreamRate.toFixed(6).toLocaleString('en') : '',
            }));
          }
        }

        function loadContractBreakdown(contractBreakdownData, displayData, isComparison) {
          if (contractBreakdownData && contractBreakdownData.length) {
            if (isComparison) {
              scope.emptyComparisonResponse = false;
            } else {
              scope.emptyAnalyticsResponse = false;
            }
            displayData.contractBreakdown = contractBreakdownData.map((item) => ({
              contractName: item.contractName,
              revenue: item.revenue ? item.revenue.toFixed(2).toLocaleString('en') : '',
              royalty: item.royalty ? item.royalty.toFixed(2).toLocaleString('en') : '',
            }));
          }
        }

        function getTotal(data) {
          let total = 0;
          data.forEach((item) => { total += item.value; });
          return total;
        }

        function mapTerritory(value) {
          const territories = { DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: "Cote d'Ivoire", DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: '(Netherlands Antilles) Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthélemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Surimap', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'U.S.A', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', UK: 'United Kingdom', GB: 'UK', AX: 'Åland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa' };
          if (territories[value]) {
            return territories[value];
          }
          return value;
        }

        // Depreciated - catalogue now uses  dataToLabelsAndData
        // function loadFeaturedData(analysis, displayData, isComparison) {
        //   let hasData = false;
        //   if (analysis.releaseIds && analysis.releaseIds.length) {
        //     hasData = true;
        //     displayData.releases = analysis.releaseIds.sort((a, b) => b.value - a.value).slice(0, 50);
        //   }
        //   if (analysis.trackIds && analysis.trackIds.length) {
        //     hasData = true;
        //     displayData.tracks = analysis.trackIds.sort((a, b) => b.value - a.value).slice(0, 50);
        //   }
        //   if (analysis.workIds && analysis.workIds.length) {
        //     hasData = true;
        //     displayData.works = analysis.workIds.sort((a, b) => b.value - a.value).slice(0, 50);
        //   }
        //   if (hasData) {
        //     if (isComparison) {
        //       scope.emptyComparisonResponse = false;
        //     } else {
        //       scope.emptyAnalyticsResponse = false;
        //     }
        //   }
        // }
      },
    };
  }]);
