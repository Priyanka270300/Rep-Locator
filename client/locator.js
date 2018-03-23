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

      var getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
          sURLVariables = sPageURL.split('&'),
          sParameterName,
          i;
    
        for (i = 0; i < sURLVariables.length; i++) {
          sParameterName = sURLVariables[i].split('=');
    
          if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
          }
        }
      };

      let getParamState = getUrlParameter('state');
      let getParamCounty = getUrlParameter('county');
      let getParamZip = getUrlParameter('zip');
      
      let hasParams = false;
      let hasResults = false;
      let hasErrors = false;

      locator.initStates = (config) => {
        if(typeof config.stateInput !== 'undefined') {
          for(let stateOption of stateOptions) {
            let option = document.createElement('option');
            option.value = stateOption.abbr;
            option.innerText = stateOption.state;
            config.stateInput.appendChild(option);
          }
        }
      };

      locator.init = (config) => {
        locator.brand = config.brand;
        locator.map = config.map;
        locator.stateInput = config.stateInput;
        locator.countyInput = config.countyInput;
        locator.zipInput = config.zipInput;
        locator.resetForm = config.resetForm;
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
  
          if(typeof getParamState !== 'undefined' && getParamState != '') {
            locator.stateInput.value = getParamState;
            hasParams = true;
          }

        }
        if(typeof locator.countyInput !== 'undefined') {
          locator.countyInput.oninput = queryApi;
          locator.countyInput.onpropertychange = locator.countyInput.oninput; // for IE8

          if(typeof getParamCounty !== 'undefined'  && getParamCounty != '') {
            locator.countyInput.value = getParamCounty;
            hasParams = true;
          }

        }
        if(typeof locator.zipInput !== 'undefined') {
          locator.zipInput.oninput = queryApi;
          locator.zipInput.onpropertychange = locator.zipInput.oninput; // for IE8

          if(typeof getParamZip !== 'undefined' && getParamZip != '') {
            locator.zipInput.value = getParamZip;
            hasParams = true;
          }
        }

        // If reset form element exists
        if(typeof locator.resetForm !== 'undefined') {
          
          locator.resetForm.addEventListener('click', function(e) {
            // Reset form
            let searchForm = locator.stateInput.parentElement;
            searchForm.reset();
            // Clear results
            locator.resultsBox.innerHTML = '<div class="status enter-search">Enter search criteria to view results.</div>';
            hasResults = false;

            // Don't refresh page
            e.preventDefault();
            
          });

        }        

        // If query string exists, run it
        if(hasParams) {
          queryApi();
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

        fetch(url).then(function(response) {
          return response.json();
        }).then(function(results) {
        
          if(results.length != '') {
            hasResults = true;
          } else {
            hasResults = false;
          }

          let hasState = params.state != '';
          let hasCounty = params.county != '';
          let hasZip = params.zip != '';

          // It it's completely empty, don't display everything, you malicious machine.
          if(!hasState && !hasCounty && !hasZip) {
            hasResults = false;
          } else if((hasCounty || hasZip) && !hasResults) {
            hasErrors = true;
          } else {
            hasErrors = false;
            hasResults = true;
          }
          
          displayResults(results);
          
        });
      }

      function displayResults(results) {

        // Results and no errors!
        if(hasResults && !hasErrors) {

          locator.resultsBox.innerHTML = '';

          for(let result of results) {
            let repWrapper = document.createElement('div');
            repWrapper.setAttribute('class', 'rep');
            repWrapper.setAttribute('data-rep', result.rep_code);
            repWrapper.innerHTML = Mustache.render(locator.repTemplate, result);
            locator.resultsBox.appendChild(repWrapper);
          } 
          
          // No results and no errors
        } else if(!hasResults && !hasErrors) {
          locator.resultsBox.innerHTML = '<div class="status enter-search">Enter search criteria to view results.</div>';
        } else if(!hasResults && hasErrors) {
          locator.resultsBox.innerHTML = '<div class="status check-search">Hmm... we can\'t find anything. Try checking your search.</div>';
        }


      }

    }((window.repLocator = typeof Object.create !== 'undefined' ? Object.create(null) : {}), document, window));
  },
});
