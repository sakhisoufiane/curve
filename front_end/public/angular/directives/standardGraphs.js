angular.module('Curve')
  .directive('standardGraphs', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/standard-graphs.html',
      scope: {
        analysisData: '=',
        basis: '=',
      },
      link(scope, element, attr, controller) {
        scope.displayData = {
          channels: {},
          configurations: {},
          territories: {},
          sources: {},
          subSources: {},
          costs: {},
          pieOptions: {
            legend: {
              display: true,
              position: 'top',
            },
          },
          releases: [],
          works: [],
          tracks: [],
        };

        scope.currencySymbol = Session.currencySymbol;

        scope.headers = [
          { title: 'Title', name: 'title', sortable: false, required: true },
          { title: 'Type', name: 'type', sortable: false },
          { title: 'Value', name: 'value', sortable: false, required: true },
        ];

        scope.$watch('analysisData', (analysisData) => {
          if (analysisData && scope.basis) {
            dataToLabelsAndData(analysisData[scope.basis].distributionChannels, scope.displayData.channels, { limit: 10, displayPercentage: true, removeNegative: true });
            dataToLabelsAndData(analysisData[scope.basis].configurations, scope.displayData.configurations, { limit: 10, displayPercentage: true, removeNegative: true });
            dataToLabelsAndData(analysisData[scope.basis].sources, scope.displayData.sources, { limit: 20 });
            dataToLabelsAndData(analysisData[scope.basis].subSources, scope.displayData.subSources, { limit: 20 });
            dataToLabelsAndData(analysisData[scope.basis].territories, scope.displayData.territories, { limit: 20, mapTerritory: true });
            dataToLabelsAndData(analysisData[scope.basis].costs, scope.displayData.costs, { limit: 10, displayPercentage: true, removeNegative: true });
            loadFeaturedData(analysisData[scope.basis]);
          }
        });

        function dataToLabelsAndData(data, writeObject, options) {
          if (!options) { options = {}; }
          if (data) {
            data = data.sort((a, b) => {
              if (a.value < b.value) {
                return 1;
              }
              return -1;
            });
            if (options.limit) {
              const top = data.slice(0, options.limit - 1);
              const rest = data.slice(options.limit - 1);
              let otherTotal = 0;
              rest.forEach((item) => { otherTotal += item.value; });
              if (otherTotal > 0) { top.push({ name: 'Other', type: 'Other', value: otherTotal }); }
              data = top;
            }
            if (options.removeNegative) {
              data = data.map((item) => { if (item.value > 0) { return item; } }).filter(Boolean);
            }
            const total = getTotal(data);
            data = data.map((item) => ({ type: item.type, percentage: ((item.value / total) * 100).toFixed(2), value: item.value.toFixed(2) }));
            writeObject.rawData = data;
            writeObject.labels = data.map((item) => {
              if (!item.type) { item.type = 'Other'; }
              if (options.mapTerritory) { item.type = mapTerritory(item.type); }
              return options.displayPercentage ? `${item.type} - ${item.percentage}%` : item.type;
            });
            writeObject.data = data.map((item) => item.value);
          }
        }

        function getTotal(data) {
          let total = 0;
          data.forEach((item) => { total += item.value; });
          return total;
        }

        function mapTerritory(value) {
          const territories = { DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: "Cote d'Ivoire", DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: '(Netherlands Antilles) Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthélemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Surimap', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', XK: 'Kosovo', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Åland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa' };
          if (territories[value]) {
            return territories[value];
          }
          return value;
        }

        function loadFeaturedData(analysis) {
          if (analysis.releases) {
            scope.displayData.releases = analysis.releases.sort((a, b) => b.value - a.value).slice(0, 100);
          }
          if (analysis.tracks) {
            scope.displayData.tracks = analysis.tracks.sort((a, b) => b.value - a.value).slice(0, 100);
          }
          if (analysis.works) {
            scope.displayData.works = analysis.works.sort((a, b) => b.value - a.value).slice(0, 100);
          }
        }
      },
    };
  }]);
