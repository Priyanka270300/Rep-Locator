import polyfill from 'dynamic-polyfill';
import Mustache from 'mustache';

polyfill({
  fills: ['fetch'],
  afterFill() {
    (function(repLocator, document, window, undefined) {

      function debounce(func, wait, immediate) {
        var timeout;

        // This is the function that is actually executed when
        // the DOM event is triggered.
        return function executedFunction() {
          // Store the context of this and any
          // parameters passed to executedFunction
          var context = this;
          var args = arguments;

          // The function to be called after
          // the debounce time has elapsed
          var later = function() {
            // null timeout to indicate the debounce ended
            timeout = null;

            // Call function now if you did not on the leading end
            if (!immediate) func.apply(context, args);
          };

          // Determine if you should call the function
          // on the leading or trail end
          var callNow = immediate && !timeout;

          // This will reset the waiting every function execution.
          // This is the step that prevents the function from
          // being executed because it will never reach the
          // inside of the previous setTimeout
          clearTimeout(timeout);

          // Restart the debounce waiting period.
          // setTimeout returns a truthy value (it differs in web vs node)
          timeout = setTimeout(later, wait);

          // Call immediately if you're dong a leading
          // end execution
          if (callNow) func.apply(context, args);
        };
      };

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
      var CAstateOptions = [
        { abbr: "", state: "Select State" },
        { abbr: "CAN-BCO", state: "British Columbia" },
        { abbr: "CAN-LAB", state: "Labrador" },
        { abbr: "CAN-MAN", state: "Manatoba" },
        { abbr: "CAN-NBR", state: "New Brunswick" },
        { abbr: "CAN-NFL", state: "Newfoundland" },
        { abbr: "CAN-NWT", state: "Northwest Territories" },
        { abbr: "CAN-NSC", state: "Nova Scotia" },
        { abbr: "CAN-NUN", state: "Nunavut" },
        { abbr: "CAN-ONT", state: "Ontario" },
        { abbr: "CAN-PRI", state: "Prince Edward Island" },
        { abbr: "CAN-QUE", state: "Quebec" },
        { abbr: "CAN-SAS", state: "Saskatchewan" },
        { abbr: "CAN-YUK", state: "Yukon" },
      ];
      let countryOptions = [
        { abbr: "", country: "Choose a country" },
        { abbr: "USA", country: "USA" }
      ];


      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      let hasURLParams = urlParams.size > 0;

      let getParamCountry = urlParams.get('country') ?? false;
      let getParamState = urlParams.get('state') ?? false;
      let getParamCounty = urlParams.get('county') ?? false;
      let getParamZip = urlParams.get('zip') ?? false;

      let hasParams = false;
      let hasResults = false;
      let hasErrors = false;


      locator.initCountries = async (config) => {
        await updateCountries(config);
        return true;
      };

      locator.updateStatesOptions = async (locator) => {
        await updateStates(locator);
        return true;
      };

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

      locator.init = async (config) => {
        locator.brand = config.brand;
        locator.map = config.map;
        locator.worldMap = config.worldMap;
        locator.stateInput = config.stateInput;
        locator.stateInputLabel = config.stateInputLabel;
        locator.countyInput = config.countyInput;
        locator.countyInputLabel = config.countyInputLabel;
        locator.countryInput = config.countryInput;
        locator.countryInputLabel = config.countryInputLabel;
        locator.zipInput = config.zipInput;
        locator.zipInputLabel = config.zipInputLabel;
        locator.resetForm = config.resetForm;
        locator.resultsBox = config.resultsBox;
        locator.repTemplate = config.repTemplate;
        locator.fallbackTemplate = config.fallbackTemplate;
        locator.countryList = [];
        await updateCountriesList(locator);

        if (locator.countryList.length > 1) {
          var country = locator.countryInput.value;
          if(country !== 'USA' && !hasURLParams) {
            hasParams = true;
            locator.map.style.display = "none";
            locator.worldMap.style.display = "block";
            if (typeof locator.stateInput !== "undefined") {
                locator.stateInput.style.display = "none"; 
                locator.stateInput.value = '';
            }
            if (typeof locator.stateInputLabel !== "undefined") {
                locator.stateInputLabel.style.display = "none"; 
            }
            if (typeof locator.countyInput !== "undefined") {
                locator.countyInput.style.display = "none"; 
                locator.countyInput.value = '';
            }
            if (typeof locator.countyInputLabel !== "undefined") {
                locator.countyInputLabel.style.display = "none"; 
            }
            if (typeof locator.zipInput !== "undefined") {
                locator.zipInput.style.display = "none"; 
                locator.zipInput.value = '';
            }
            if (typeof locator.zipInputLabel !== "undefined") {
                locator.zipInputLabel.style.display = "none"; 
            }
          }
          else {
            hasParams = false;
            locator.map.style.display = "block";
            locator.worldMap.style.display = "none";
            if (typeof locator.stateInput !== "undefined") {
                locator.stateInput.style.display = "block"; 
            }
            if (typeof locator.stateInputLabel !== "undefined") {
                locator.stateInputLabel.style.display = "block"; 
            }
            if (typeof locator.countyInput !== "undefined") {
                locator.countyInput.style.display = "block"; 
            }
            if (typeof locator.countyInputLabel !== "undefined") {
                locator.countyInputLabel.style.display = "block"; 
            }
            if (typeof locator.zipInput !== "undefined") {
                locator.zipInput.style.display = "block"; 
            }
            if (typeof locator.zipInputLabel !== "undefined") {
                locator.zipInputLabel.style.display = "block"; 
            }
          } 
        }
        else {
          if (typeof locator.countryInput !== "undefined") {
            locator.countryInput.style.display = "none"; 
          }
          if (typeof locator.countryInputLabel !== "undefined") {
            locator.countryInputLabel.style.display = "none"; 
          }
          if (typeof locator.worldMap !== "undefined") {
            locator.worldMap.style.display = "none"; 
          }
        }

        // Populate the state select
        if(typeof locator.stateInput !== 'undefined' && !config.noPopulateState) {
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
          locator.countyInput.oninput = debounce(queryApi, 500);
          // locator.countyInput.oninput = queryApi;
          locator.countyInput.onpropertychange = locator.countyInput.oninput; // for IE8

          if(typeof getParamCounty !== 'undefined'  && getParamCounty != '') {
            locator.countyInput.value = getParamCounty;
            hasParams = true;
          }

        }
        if (locator.brand == "RR" || locator.brand == "PM" || locator.brand == "ST" || locator.brand == "AT" || locator.brand == "PB" || locator.brand == "RS"){
          if (typeof locator.countryInput !== "undefined" && locator.countryList.length > 1) {
            await updateCountries(locator)
          }
          if (typeof locator.countryInput !== "undefined") {
            locator.countryInput.onpropertychange = locator.countryInput.oninput;

            // Pre-select the country from the URL param (?country=...)
            if (typeof getParamCountry !== "undefined" && getParamCountry != "") {
                locator.countryInput.value = getParamCountry;
                hasParams = true;

                var preselectCountry = locator.countryInput.value;
                if (preselectCountry !== 'USA') {
                    locator.map.style.display = "none";
                    locator.worldMap.style.display = "block";
                } else {
                    locator.map.style.display = "block";
                    locator.worldMap.style.display = "none";
                }

                // Reload the state options for the selected country so the
                // state dropdown matches the chosen country, then apply the
                // state URL param (?state=...) against them.
                if (preselectCountry && typeof locator.stateInput !== "undefined") {
                    locator.stateInput.innerHTML = "";
                    await locator.updateStatesOptions(locator);
                    if (typeof getParamState !== "undefined" && getParamState != "") {
                        locator.stateInput.value = getParamState;
                    }
                }
            }

            locator.countryInput.addEventListener("change", async function(e) {
                var country = locator.countryInput.value;
                if(country !== 'USA') {
                  hasParams = true;
                  locator.map.style.display = "none";
                  locator.worldMap.style.display = "block";
                  if (typeof locator.stateInput !== "undefined") {
                      locator.stateInput.style.display = "none"; 
                      locator.stateInput.value = '';
                  }
                  if (typeof locator.stateInputLabel !== "undefined") {
                      locator.stateInputLabel.style.display = "none"; 
                  }
                  if (typeof locator.countyInput !== "undefined") {
                      locator.countyInput.style.display = "none"; 
                      locator.countyInput.value = '';
                  }
                  if (typeof locator.countyInputLabel !== "undefined") {
                      locator.countyInputLabel.style.display = "none"; 
                  }
                  if (typeof locator.zipInput !== "undefined") {
                      locator.zipInput.style.display = "none"; 
                      locator.zipInput.value = '';
                  }
                  if (typeof locator.zipInputLabel !== "undefined") {
                      locator.zipInputLabel.style.display = "none"; 
                  }
                }
                else {
                  hasParams = false;
                  locator.map.style.display = "block";
                  locator.worldMap.style.display = "none";
                  if (typeof locator.stateInput !== "undefined") {
                      locator.stateInput.style.display = "block"; 
                  }
                  if (typeof locator.stateInputLabel !== "undefined") {
                      locator.stateInputLabel.style.display = "block"; 
    }
                  if (typeof locator.countyInput !== "undefined") {
                      locator.countyInput.style.display = "block"; 
                  }
                  if (typeof locator.countyInputLabel !== "undefined") {
                      locator.countyInputLabel.style.display = "block"; 
                  }
                  if (typeof locator.zipInput !== "undefined") {
                      locator.zipInput.style.display = "block"; 
                  }
                  if (typeof locator.zipInputLabel !== "undefined") {
                      locator.zipInputLabel.style.display = "block"; 
                  }
                }
                var country = locator.countryInput.value;
                if (country) {
                  locator.stateInput.innerHTML = "";
                  await locator.updateStatesOptions(locator);
                  setTimeout(() => {
                        queryApi();
                  },350);
                } else {
                  queryApi();
                }
                // var statesToShow = [];
                // if (country === "Canada") {
                // statesToShow = CAstateOptions;
                // } else {
                //   statesToShow = stateOptions;
                // }
                // statesToShow.forEach(function(stateOption) {
                //   var option = document.createElement("option");
                //   option.value = stateOption.abbr;
                //   option.innerText = stateOption.state;
                //   locator.stateInput.appendChild(option);
                // });
                
            })
          }
        }
        if(typeof locator.zipInput !== 'undefined') {
          locator.zipInput.oninput = debounce(queryApi, 500);
          locator.zipInput.onpropertychange = locator.zipInput.oninput; // for IE8

          if(typeof getParamZip !== 'undefined' && getParamZip != '') {
            locator.zipInput.value = getParamZip;
            hasParams = true;
          }
        }

        // If reset form element exists
        if (typeof locator.resetForm !== "undefined") {
          locator.resetForm.addEventListener("click", function (e) {
            if (typeof locator.stateInput !== "undefined") {
              locator.stateInput.style.display = "block"; 
            }
            if (typeof locator.stateInputLabel !== "undefined") {
              locator.stateInputLabel.style.display = "block"; 
            }
            locator.countyInput.value = "";
            locator.zipInput.value = "";
            locator.stateInput.value = "";
            locator.countryInput.value = "";
            var searchForm = locator.stateInput.parentElement;
            searchForm.reset();
            locator.resultsBox.innerHTML =
              '<div class="status enter-search">Enter search criteria to view results.</div>';
            hasResults = false;
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



      async function updateCountries(locator) {
        try {
          // Update array with API data
          countryOptions = [
            { abbr: "", country: "Choose a country" },
            ...locator.countryList
          ];

          for (var _i2 = 0, _countryOptions2 = countryOptions; _i2 < _countryOptions2.length; _i2++) {
              var countryOption = _countryOptions2[_i2];
              var option = document.createElement("option");
              option.value = countryOption.abbr;
              option.innerText = countryOption.country;
              locator.countryInput.appendChild(option)
          }
          if (typeof locator.countryInput !== "undefined") {
            locator.countryInput.style.display = "block"; 
          }
          if (typeof locator.countryInputLabel !== "undefined") {
            locator.countryInputLabel.style.display = "block"; 
          }
          // return countryOptions;
        } catch (error) {
          console.error("Fetch error:", error);
        }
      }


      async function updateCountriesList(locator) {
        try {
          var url = new URL(process.env.LOCATOR_API_DOMAIN + '/api/search/countries'),
          params = {brand: locator.brand};
          Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

          const response = await fetch(url);
          const data = await response.json();
          locator.countryList = data;
          // return countryOptions;
        } catch (error) {
          console.error("Fetch error:", error);
        }
      }


      async function updateStates(locator) {
        try {
          var url = new URL(process.env.LOCATOR_API_DOMAIN + '/api/search/states'),
          params = {brand: locator.brand, country: locator.countryInput.value};
          Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

          const response = await fetch(url);
          const data = await response.json();

          // Update array with API data
          stateOptions = [
            { abbr: "", state: "Choose a state" },
            ...data
          ];
          var i, L = locator.stateInput.options.length - 1;
          for(i = L; i >= 0; i--) {
            locator.stateInput.remove(i);
          }

          if (stateOptions.length > 1) {
            for (var _i2 = 0, _stateOptions2 = stateOptions; _i2 < _stateOptions2.length; _i2++) {
                var stateOption = _stateOptions2[_i2];
                var option = document.createElement("option");
                option.value = stateOption.abbr;
                option.innerText = stateOption.state;
                locator.stateInput.appendChild(option)
            }
            locator.stateInput.style.display = "block"; 
            if (typeof locator.stateInputLabel !== "undefined") {
                locator.stateInputLabel.style.display = "block"; 
            }
          }
          else {
            if (typeof locator.stateInput !== "undefined") {
                locator.stateInput.style.display = "none"; 
            }
            if (typeof locator.stateInputLabel !== "undefined") {
                locator.stateInputLabel.style.display = "none"; 
            }
          }
          // return stateOptions;
        } catch (error) {
          console.error("Fetch error:", error);
        }
      }

      function queryApi() {
        var url = new URL(process.env.LOCATOR_API_DOMAIN + '/api/search/reps_by_location'),
          params = {brand: locator.brand, country: locator.countryInput.value, state: locator.stateInput.value, county: locator.countyInput.value, zip: locator.zipInput.value};
        
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
          let hasCountry = params.country != '';

          // It it's completely empty, don't display everything, you malicious machine.
          if(!hasCountry && !hasState && !hasCounty && !hasZip ) {
            hasResults = false;
          } else if((hasCounty || hasZip) && !hasResults) {
            hasErrors = true;
          } else if(!hasResults) {
            hasErrors = true;
          } else {
            hasErrors = false;
            hasResults = true;
          }

          displayResults(results);

        });
      }

      function displayResults(results) {

        // Results and no errors
        if(hasResults && !hasErrors) {

          locator.resultsBox.innerHTML = '';

          if (!!locator.fallbackTemplate && (!results || results.length === 0)) {
            let repWrapper = document.createElement('div');
            repWrapper.setAttribute('class', 'rep fallback');
            repWrapper.setAttribute('data-rep', '000');
            repWrapper.innerHTML = locator.fallbackTemplate;
            locator.resultsBox.appendChild(repWrapper);
          }
          else {
            for (let result of results) {
              let repWrapper = document.createElement('div');
              repWrapper.setAttribute('class', 'rep');
              repWrapper.setAttribute('data-rep', result.rep_code);
              repWrapper.innerHTML = Mustache.render(locator.repTemplate, result);
              locator.resultsBox.appendChild(repWrapper);
            }

            // Convert phone + fax into links

            let reps = document.querySelectorAll('.rep');

            reps.forEach(function(item) {
              let phone = item.querySelector('.phone a');
              let fax = item.querySelector('.fax a');
              makeLinks(phone);
              makeLinks(fax);
            });
          }
          // No results and no errors
        } else if(!hasResults && !hasErrors) {
          locator.resultsBox.innerHTML = '<div class="status enter-search">Enter search criteria to view results.</div>';
          // No results and errors
        } else if(!hasResults && hasErrors) {
          locator.resultsBox.innerHTML = '<div class="status check-search">No results found. Please try your search again.</div>';
        }

      }

      // Turn phone + fax into links
      function makeLinks(element) {
        let number = element.innerText;
        number = number.replace(/[^0-9\.]/g, '');
        number = number.replace(/\./g,'');
        element.setAttribute('href', 'tel:'+number+'' );
      }

    }((window.repLocator = typeof Object.create !== 'undefined' ? Object.create(null) : {}), document, window));
  },
});
