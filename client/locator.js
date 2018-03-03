import polyfill from 'dynamic-polyfill';
import Mustache from 'mustache';

polyfill({
  fills: ['fetch'],
  afterFill() {
    (function(repLocator, document, window, undefined) {
      let locator = repLocator;

      let stateOptions = [
        {abbr: '', state: 'Choose a State'},
        {abbr: 'AL', state: 'Alabama'},
        {abbr: 'AK', state: 'Alaska'},
        {abbr: 'AZ', state: 'Arizona'},
        {abbr: 'AR', state: 'Arkansas'},
        {abbr: 'CA', state: 'California'},
        {abbr: 'CO', state: 'Colorado'},
        {abbr: 'CT', state: 'Connecticut'},
        {abbr: 'DE', state: 'Delaware'},
        {abbr: 'DC', state: 'District of Columbia'},
        {abbr: 'FL', state: 'Florida'},
        {abbr: 'GA', state: 'Georgia'},
        {abbr: 'HI', state: 'Hawaii'},
        {abbr: 'ID', state: 'Idaho'},
        {abbr: 'IL', state: 'Illinois'},
        {abbr: 'IN', state: 'Indiana'},
        {abbr: 'IA', state: 'Iowa'},
        {abbr: 'KS', state: 'Kansas'},
        {abbr: 'KY', state: 'Kentucky'},
        {abbr: 'LA', state: 'Louisiana'},
        {abbr: 'ME', state: 'Maine'},
        {abbr: 'MD', state: 'Maryland'},
        {abbr: 'MA', state: 'Massachusetts'},
        {abbr: 'MI', state: 'Michigan'},
        {abbr: 'MN', state: 'Minnesota'},
        {abbr: 'MS', state: 'Mississippi'},
        {abbr: 'MO', state: 'Missouri'},
        {abbr: 'MT', state: 'Montana'},
        {abbr: 'NE', state: 'Nebraska'},
        {abbr: 'NV', state: 'Nevada'},
        {abbr: 'NH', state: 'New Hampshire'},
        {abbr: 'NJ', state: 'New Jersey'},
        {abbr: 'NM', state: 'New Mexico'},
        {abbr: 'NY', state: 'New York'},
        {abbr: 'NC', state: 'North Carolina'},
        {abbr: 'ND', state: 'North Dakota'},
        {abbr: 'OH', state: 'Ohio'},
        {abbr: 'OK', state: 'Oklahoma'},
        {abbr: 'OR', state: 'Oregon'},
        {abbr: 'PA', state: 'Pennsylvania'},
        {abbr: 'PR', state: 'Puerto Rico'},
        {abbr: 'RI', state: 'Rhode Island'},
        {abbr: 'SC', state: 'South Carolina'},
        {abbr: 'SD', state: 'South Dakota'},
        {abbr: 'TN', state: 'Tennessee'},
        {abbr: 'TX', state: 'Texas'},
        {abbr: 'UT', state: 'Utah'},
        {abbr: 'VT', state: 'Vermont'},
        {abbr: 'VA', state: 'Virginia'},
        {abbr: 'WA', state: 'Washington'},
        {abbr: 'WV', state: 'West Virginia'},
        {abbr: 'WI', state: 'Wisconsin'},
        {abbr: 'WY', state: 'Wyoming'},
      ];

      locator.init = (config) => {
        locator.brand = config.brand;
        locator.map = config.map;
        locator.stateInput = config.stateInput;
        locator.countyInput = config.countyInput;
        locator.zipInput = config.zipInput;
        locator.resultsBox = config.resultsBox;
        locator.repTemplate = config.repTemplate;

        // Populate the state select
        if(typeof locator.stateInput !== 'undefined') {
          for(let stateOption of stateOptions) {
            let option = document.createElement('option');
            option.value = stateOption.abbr;
            option.innerText = stateOption.state;
            locator.stateInput.appendChild(option);
          }
        }

        // Set input onchange states
        if(typeof locator.stateInput !== 'undefined') {
          locator.stateInput.oninput = queryApi;
          locator.stateInput.onpropertychange = locator.stateInput.oninput; // for IE8
        }
        if(typeof locator.countyInput !== 'undefined') {
          locator.countyInput.oninput = queryApi;
          locator.countyInput.onpropertychange = locator.countyInput.oninput; // for IE8
        }
        if(typeof locator.zipInput !== 'undefined') {
          locator.zipInput.oninput = queryApi;
          locator.zipInput.onpropertychange = locator.zipInput.oninput; // for IE8
        }

        // Hook up the map to the states
        if(typeof locator.map !== 'undefined' && typeof locator.stateInput !== 'undefined') {
          locator.map.addEventListener('click', (e) => {

            if(e.target.tagName.toLowerCase() == 'path' || e.target.tagName.toLowerCase() == 'text') {
              let stateElem = e.target.parentNode;
              locator.stateInput.value = stateElem.getAttribute('class');
              locator.stateInput.oninput();
            }
          });
        }

      };

      function queryApi() {
        var url = new URL(process.env.LOCATOR_API_DOMAIN + '/api/search/reps_by_location'),
          params = {brand: locator.brand, state: locator.stateInput.value, county: locator.countyInput.value, zip: locator.zipInput.value};
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        console.log(url);
        fetch(url).then(function(response) {
          return response.json();
        }).then(function(results) {
          displayResults(results);
        });
      }

      function displayResults(results) {
        locator.resultsBox.innerHTML = '';
        for(let result of results) {

          let repWrapper = document.createElement('div');
          repWrapper.setAttribute('class', 'rep');
          repWrapper.setAttribute('data-rep', result.rep_code);
          repWrapper.innerHTML = Mustache.render(locator.repTemplate, result);
          locator.resultsBox.appendChild(repWrapper);
        }
      }

    }((window.repLocator = typeof Object.create !== 'undefined' ? Object.create(null) : {}), document, window));
  },
});
