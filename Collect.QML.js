if(!Array.prototype.indexOf){
	Array.prototype.indexOf = function(obj, start){
		 for(var i = (start || 0), j = this.length; i < j; i++){
			 if(this[i] === obj) return i;
		 }
		 return -1;
	}
}

let sCollectionTypeId = 'O'; // Specimen
let sState = 'QLD';
let sProvider = 'www.qml.com.au';
var oCatalogue = null;
// var sWebAPIHost = window.location == undefined || window.location.hostname.indexOf('.com.au') !== -1 ? 'https://webapi.healius.com.au' : 'http://api'; // without trailing slash!
var sWebAPIHost = 'https://webapi.healius.com.au';
var sJobURL = sWebAPIHost + '/collect/jobs/';
var sCatalogueURL = sWebAPIHost + '/collect/catalogue/';
var sLocationSearchURL = sWebAPIHost + '/collect/search/';
var initialized = false;
var oFound;

catalogueLoad();

jQuery(document).ready(function(){
	if(document.forms['Form']){
		document.forms['Form'].onsubmit = function(){
			jobSubmit();
			return false;
		};
	}
	init();
});



function init(){
	//console.log('init called');

	// Add clear button to datepicker
	var dpFunc = jQuery.datepicker._generateHTML; //record the original
	jQuery.datepicker._generateHTML = function(inst){
		var thishtml = jQuery( dpFunc.call(jQuery.datepicker, inst) ); //call the original
		thishtml = jQuery('<div />').append(thishtml); //add a wrapper div for jQuery context

		// locate the button panel and add our button - with a custom css class.
		jQuery('.ui-datepicker-buttonpane', thishtml).append(
			jQuery('<button class="ui-datepicker-clear ui-state-default ui-priority-primary ui-corner-all">Clear</button>')
			.click(function(){
				jQuery.datepicker._clearDate(inst.input);
			})
		);
		thishtml = thishtml.children(); //remove the wrapper div
		return thishtml; //assume okay to return a jQuery
	};

	jQuery('#collect-dialog-ok').dialog({
		  autoOpen: false
		, close: function(){
			formJobReset();
		}
		, dialogClass: 'collect-form-dialog'
		, draggable: false
		, resizable: false
		, modal: true
		, buttons: {
			Ok: function(){
				jQuery(this).dialog('close');
			}
		}
	});

	jQuery('#collect-dialog-error').dialog({
		  autoOpen: false
		, dialogClass: 'collect-form-dialog'
		, draggable: false
		, resizable: false
		, modal: true
		, buttons: {
			Ok: function(){
				jQuery(this).dialog('close');
			}
		}
	});

	jQuery('#collect-form-code')
		.on('change', function(){
			//console.log('change', e);
			enabledDisablePickupLocationCheckButton();
		})
		.on('change blur', function(e){
			//console.log('blur', e);
			enabledDisablePickupLocationCheckButton();
		})
		.keyup(function(e){
			//console.log('keyup', e);
			enabledDisablePickupLocationCheckButton();
		})
		.keypress(function(e){
			//console.log('keypress', e);
			if(e.which === 13){ // Enter pressed
				locationGet('pickup', jQuery(this).val());
				e.preventDefault();
			}
		})
	;

	jQuery('#collect-form-pickup-location-check')
		.button({disabled: true})
		.click(function(){
			locationGet('pickup', jQuery('#collect-form-code').val());
			return false;
		})
	;

/*
	jQuery('#collect-form input[name=collect-form-priority]:radio')
		.change(function(){
			if(!jQuery(this).prop('checked')) return;
			var urgent = jQuery(this).val() === 'urgent';
			jQuery('#collect-form-required-by').prop('disabled', !urgent);
			jQuery('#collect-form-required-by-date + .input-group-btn > .btn').button('option', 'disabled', !urgent);
		})
	;
*/

	jQuery('#collect-form-pickup-location-confirm')
		.change(function(){
			if(jQuery(this).prop('checked')){
				jQuery('#collect-form-pickup-location-check').button('option', 'disabled', true)
				jQuery('#collect-form-pickup-location, #collect-form-pickup-location-search').prop('disabled', true);
				jQuery('#collect-form-job').prop('disabled', false).show('fade', function(){
					jQuery('#collect-form-patient-fname').focus();
				});
				jQuery('#collect-form-actions').prop('disabled', false).show('fade', function(){
					jQuery('#collect-form-submit').button('option', 'disabled', false);
				});
			} else {
				jQuery('#collect-form-pickup-location-check').button('option', 'disabled', false)
				jQuery('#collect-form-submit').button('option', 'disabled', true);
				jQuery('#collect-form-pickup-location, #collect-form-pickup-location-search').prop('disabled', false);
				jQuery('#collect-form-job').prop('disabled', true).hide('fade');
				jQuery('#collect-form-actions').prop('disabled', true).hide('fade');
			}
		})
	;

/*
	jQuery('#collect-form-required-by-date')
		.datepicker({
			  minDate: 0
			, showAnim: false
			, firstDay: 1
			, showButtonPanel: true
			, dateFormat: 'D, d M yy'
			, onClose: function(dateText, instance){
				var date = jQuery(this).datepicker('getDate');
				if(date == null){
					jQuery('#collect-form-required-by-time').prop('disabled', true);
				} else {
					jQuery('#collect-form-required-by-time')
						.empty()
						.append(createOptions(getAvailableTimes(date), 'time', 'time'))
						.prop('disabled', false)
					;
				}
				//console.log('Date changed', date);
			}
		})
	;
*/

	jQuery('.datepicker + .input-group-btn > .btn')
		.button({disabled: false})
		.click(function(){
			var datepicker = jQuery(this).parent().prev();
			datepicker.datepicker(datepicker.datepicker('widget').is(':visible') ? 'hide' : 'show');
		})
	;

	jQuery('#collect-form-submit')
		.button({disabled: true})
	;

	jQuery('#collect-form-reset')
		.button()
		.click(function(){
			formJobReset();
		})
	;

	jQuery('#collect-search-reset').click(function(event) {
		event.preventDefault();

		jQuery('#collect-form-pickup-location-confirm').prop( "checked", false );

		jQuery('#collect-form-pickup-location-check').button('option', 'disabled', false)
		jQuery('#collect-form-submit').button('option', 'disabled', true);
		jQuery('#collect-form-pickup-location, #collect-form-pickup-location-search').prop('disabled', false);
		jQuery('#collect-form-job').prop('disabled', true).hide('fade');
		jQuery('#collect-form-actions').prop('disabled', true).hide('fade');

		jQuery('#collect-form-pickup-location, #collect-form-pickup-location-confirmation, #collect-form-job, #collect-form-actions').hide();
		jQuery('#collect-form-code').val('').focus();

		enabledDisablePickupLocationCheckButton();
	});

	enabledDisablePickupLocationCheckButton();

	initialized = true;
	catalogueInit();

	//console.log('init done');
}


function formJobReset(){
	var login = jQuery('#collect-form-code').val();

	jQuery('#collect-form-pickup-location-search, #collect-form-pickup-location').prop('disabled', false);
	//jQuery('#collect-form-job, #collect-form-required-by').prop('disabled', true);
	jQuery('#collect-form-pickup-location, #collect-form-pickup-location-confirmation, #collect-form-job, #collect-form-actions').hide('fade', function(){
		document.forms['Form'].reset();

		//jQuery('#collect-form-specimen-location-details').prop('disabled', true);
		jQuery('#collect-form-job .datepicker').datepicker('setDate', null);
		jQuery('#collect-form-submit').button('option', 'disabled', true);
		jQuery('#collect-form-code').val(login);
		enabledDisablePickupLocationCheckButton();
		jQuery('#collect-form-code').focus();
	});
}


function catalogueLoad(){
	//console.log('Catalogue load started', sCatalogueURL);
	jQuery.get(sCatalogueURL)
		.done(function(result){
			console.log('Catalogue load finished (SUCCESS)', result);
			oCatalogue = {
				  aCollectionTypes: result.collectionTypes
				, aSpecLocations:   result.specLocations
				, aStates:          result.states
				, aTests:           result.tests
				, oTimes:           result.times
//				, aAllowedRegions:  result.allowedRegions
				, aAllowedRegions:  ['BRI','BEW', 'GCP', 'IPS']
			};
			catalogueInit();
		})
		.fail(function(reason){
			console.log('Catalogue load finished (FAIL)', reason);
			jQuery('#collect-message').html('<p class="urgent">Initialization error' + errorMessagePrint(reason, ': ') + '</p>').show();
		})
	;
}


function errorMessagePrint(reason, prefix){
	var s = reason && reason.responseText ? reason.responseText : null;
	try{
		var o = JSON.parse(s);
		if(o.message) s = o.message;
	}catch(e){
		// just ignore
	}
	return s == null ? '' : (prefix + s);
}


function catalogueInit(){
	if(!(initialized && oCatalogue)) return;

	if(window.localStorage){
		var code = window.localStorage.getItem('doctor-code');
		// if(code != null) jQuery('#collect-form-code').val(code);
	}

	jQuery('#collect-form-surgery-state').empty().html(createOptions(oCatalogue.aStates, 'id', 'id'));

	jQuery('#collect-form-tests-list').empty();
	if(oCatalogue.aTests){
		var a = [];
		for(var i = 0, n = oCatalogue.aTests.length; i < n; ++i){
			if(oCatalogue.aTests[i].collection_types && oCatalogue.aTests[i].collection_types.indexOf(sCollectionTypeId) !== -1) a.push(oCatalogue.aTests[i]);
		}
		if(a.length){
			jQuery('#collect-form-tests-list').append(createCheckboxes('tests', a, 'id', 'name'));
			if(jQuery('#collect-form-tests-custom').prop('required')){
				jQuery('#collect-form-tests-list')
					.find('input:checkbox')
					.prop('required', true)
					.change(function(){
						jQuery('#collect-form-tests-custom, #collect-form-tests-list input:checkbox').prop('required', jQuery('#collect-form-tests-list input:checkbox:checked').length === 0);
					})
				;
			}
		}
	}

	jQuery('#collect-form-speciment-locations-list')
		.empty()
		.append(createRadios('spec_location', oCatalogue.aSpecLocations, 'id', 'name', null/*default*/, null/*checked*/, true/*required*/))
		.find('input:radio').change(function(){
			jQuery('#collect-form-specimen-location-details')
				.prop('disabled', false)
				.prop('required', jQuery(this).val() == 255)
				.focus()
			;
		});
	;

	enabledDisablePickupLocationCheckButton();
}


/*
function getAvailableTimes(date){
	var aTimes = [];
	var now = new Date();
	if(
		   date != null
		&& date.getFullYear() >= now.getFullYear()
		&& date.getMonth() >= now.getMonth()
		&& date.getDay() >= now.getDay()
	){
		var isToday = date.getFullYear() == now.getFullYear() && date.getMonth() == now.getMonth() && date.getDay() == now.getDay();
		for(var i = 0, n = (oCatalogue.oTimes.to - oCatalogue.oTimes.from) / oCatalogue.oTimes.step; i < n; ++i){
			var mins = oCatalogue.oTimes.from + i * oCatalogue.oTimes.step;
			var h = Math.floor(mins / 60);
			var m = Math.floor(mins - h * 60);
			if(!isToday || (h > now.getHours() || (h == now.getHours() && m > now.getMinutes()))){
				aTimes.push({time: (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m});
			}
		}
	}
	//console.log('getAvailableTimes', date, aTimes);
	return aTimes;
}
*/


function enabledDisablePickupLocationCheckButton(){
	var o = jQuery('#collect-form-code');
	var disabled = !oCatalogue || o.val() == null || o.val().length < 3;
	jQuery('#collect-form-pickup-location-check').button('option', 'disabled', disabled);
}


function locationGet(sType, sText){
	if(sText == '') return;
	if(window.localStorage) window.localStorage.setItem('doctor-code', sText);
	//console.log('locationGet started', sCollectionTypeId, sType, sLocationSearchURL, sText);

	var searchMessage = jQuery('#collect-form-pickup-location-search-message');
	var confirmation  = jQuery('#collect-form-pickup-location-confirmation');
	var location      = jQuery('#collect-form-pickup-location');

	jQuery('#collect-form-pickup-location-check-loader').show();

	oFound = null;
	jQuery.get(sLocationSearchURL + '?ctype=' + encodeURIComponent(sCollectionTypeId) + '&type=' + encodeURIComponent(sType) + '&text=' + encodeURIComponent(sText))
		.done(function(result){
			//console.log('locationGet finished (SUCCESS)', result);
			if(result){
				searchMessage.clearQueue();
				hide(searchMessage);

				oFound = result;
				jQuery('#collect-form-doctor-name').val((result.title ? (result.title + ' ') : '') + (result.first_name ? (result.first_name + ' ') : '') + (result.last_name ? result.last_name : ''));
				jQuery('#collect-form-surgery-name').val(result.surgery.name);
				jQuery('#collect-form-surgery-phone').val(phoneFormat(result.surgery.phone, '61'));
				jQuery('#collect-form-surgery-address').val(result.surgery.addr);
				jQuery('#collect-form-surgery-city').val(result.surgery.city);
				jQuery('#collect-form-surgery-postcode').val(result.surgery.postcode);
				jQuery('#collect-form-surgery-state').val(result.surgery.state);

				checkSurgery();
				confirmation.find('.option').hide();
				if(oFound.surgery && !oFound.surgery.bAllowed){
					confirmation.find('.option.option-outside-servicing-area').show();
				} else if(isDataIncomplete()){
					confirmation.find('.option.option-incomplete').show();
				} else {
					confirmation.find('.option.option-ok').show();
				}

				show(location);
				show(confirmation);
				enabledDisablePickupLocationConfirmCheckbox(true);
			} else {
				searchMessage.find('.option').hide();
				searchMessage.find('.option.option-not-found').show();
				show(searchMessage);
				hide(location);
				hide(confirmation);
				enabledDisablePickupLocationConfirmCheckbox(false/*disable*/);

				jQuery('#collect-form-pickup-location input:text').val('');
				jQuery('#collect-form-surgery-state').val(sState);
			}
		})
		.fail(function(reason){
			console.log('locationGet finished (FAIL)', reason);

			var message = 'Error occured' + errorMessagePrint(reason, ': ');
			hide(location);
			hide(confirmation);

			searchMessage.find('.option').hide();
			searchMessage.find('.option.option-custom-message').html('<b>' + message + '</b>').show();
			searchMessage.clearQueue();
			show(searchMessage);
			enabledDisablePickupLocationConfirmCheckbox(false/*disable*/);
		})
		.always(function(){
			jQuery('#collect-form-pickup-location-check-loader').hide();
		})
	;
}


function show(el){
	if(el.css('display') == 'none') el.show('fade');
}


function hide(el){
	if(el.css('display') != 'none') el.hide('fade');
}


function checkSurgery(){
	if(!oFound.surgery) return;
	oFound.surgery.bAllowed = !oCatalogue.aAllowedRegions || oCatalogue.aAllowedRegions.indexOf(oFound.surgery.region) !== -1;
}


function isDataIncomplete(){
	var result = false;

	jQuery('#collect-form-pickup-location input').each(function(){
		if(jQuery(this).prop('required') && jQuery(this).val() == '') result = true;
	});

	return result;
}


function enabledDisablePickupLocationConfirmCheckbox(enabled){
	jQuery('#collect-form-pickup-location-confirm').prop('disabled', !enabled);
}


function jobSubmit(){

	var tests = [];
	jQuery('#collect-form-tests-list input:checkbox:checked').each(function(){
		tests.push(jQuery(this).val());
	});

	var required_by = null;
/*
	if(jQuery('#collect-form input[name=collect-form-priority]:radio:checked').val() === 'urgent'){
		required_by = '';
		var date = jQuery('#collect-form-required-by-date').datepicker('getDate');
		if(date == null) date = new Date() + 1000 * 60 * 60 * 24; // tomorrow

		var m = date.getMonth() + 1;
		var d = date.getDate();
		required_by += date.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
		var time = jQuery('#collect-form-required-by-time').val();
		required_by += ' ' + (time == null ? '00:00' : time) + ':00';
	}
*/

	var data = {
		  provider:           sProvider
		, addr:               jQuery('#collect-form-surgery-address').val()
		, city:               jQuery('#collect-form-surgery-city').val()
		, closing_time:       jQuery('#collect-form-closing-time').val()
		, collection_type_id: sCollectionTypeId
		, doctor_id:          oFound ? oFound.code : null
		, doctor_name:        jQuery('#collect-form-doctor-name').val()
		, location_details:   jQuery('#collect-form-specimen-location-details').val()
		, location_type:      oFound ? 'surgery' : 'custom'
		, name:               jQuery('#collect-form-surgery-name').val()
		, phone:              jQuery('#collect-form-surgery-phone').val()
		, postcode:           jQuery('#collect-form-surgery-postcode').val()
		, p_fname:            jQuery('#collect-form-patient-fname').val()
		, p_lname:            jQuery('#collect-form-patient-lname').val()
		, required_by:        required_by
		, spec_location_id:   jQuery('#collect-form-speciment-locations-list input:radio:checked').val()
		, state:              jQuery('#collect-form-surgery-state').val()
		, surgery_id:         oFound ? oFound.surgery.code : null
		, tests:              tests
		, tests_custom:       jQuery('#collect-form-tests-custom').val()
		//, urgent:             jQuery('#collect-form input[name=collect-form-priority]:radio:checked').val() === 'urgent'
	};
	//console.log('jobSubmit started', sJobURL, data);

	// alert(JSON.stringify(data));

	jQuery.post(sJobURL, JSON.stringify(data))
		.done(function(response){
			console.log('jobSubmit finished (SUCCESS)', response);
			jQuery('#collect-dialog-job-id').text(response.collection_type_id + '-' + response.id);
			jQuery('#collect-dialog-ok').dialog('open');
		})
		.fail(function(reason){
			console.log('jobSubmit finished (FAIL)', reason);
			try{
				var o = JSON.parse(reason.responseText);
				if(o.message) jQuery('#collect-dialog-message').text(o.message);
			}catch(e){
				// just ignore
			}
			jQuery('#collect-dialog-error').dialog('open');
		});
}


function createElement(sTagName, sClassName, sTextContent){
	var el = document.createElement(sTagName);
	if(sClassName != null) el.className = sClassName;
	if(sTextContent != null) el.appendChild(document.createTextNode(sTextContent));
	return el;
}


function createHTMLIcon(sName, sClasses, sTitle){
	var el = createElement('I', 'fa fa-' + sName);
	if(sClasses != null) el.className += ' ' + sClasses;
	if(sTitle != null) el.setAttribute('title', sTitle);
	return el;
}


function createHTMLTitleElement(sText, sAfter){
	var oTitleHTMLElement = createElement('DIV', 'title', sText);
	if(sAfter === undefined) sAfter = ': ';
	if(sAfter != null) oTitleHTMLElement.appendChild(document.createTextNode(sAfter));
	return oTitleHTMLElement;
};


function createOptions(aItems, sValueField, sLabelField, oDefault){
	var createOption = function(value, label, bChecked){
		var el = document.createElement('OPTION');
		el.value = value;
		if(bChecked) el.setAttribute('selected', true);
		el.appendChild(document.createTextNode(label));
		return el;
	}
	var fragment = document.createDocumentFragment();
	if(oDefault != null){
		fragment.appendChild(createOption(oDefault[sValueField], oDefault[sLabelField], true));
	}
	for(var i = 0, n = aItems.length; i < n; ++i){
		fragment.appendChild(createOption(aItems[i][sValueField], aItems[i][sLabelField]));
	}
	return fragment;
}


function createRadios(sFieldName, aItems, sValueField, sLabelField, oDefault, sChecked, bRequired){
	var createItem = function(sValue, sLabel, sChecked, bRequired){
		var el = document.createElement('INPUT');
		el.type = 'radio';
		el.name = sFieldName;
		el.value = sValue;
		if(sChecked != null && sChecked == sValue) el.setAttribute('checked', true);
		if(bRequired) el.setAttribute('required', true);
		var label = document.createElement('LABEL');
		label.appendChild(el);
		label.appendChild(document.createTextNode(' ' + sLabel));
		var div = document.createElement('DIV');
		div.className = 'radio';
		div.appendChild(label);
		return div;
	}
	var fragment = document.createDocumentFragment();
	if(oDefault != null){
		fragment.appendChild(createItem(oDefault[sValueField], oDefault[sLabelField], sChecked, bRequired));
	}
	for(var i = 0, n = aItems.length; i < n; ++i){
		//fragment.appendChild(createItem(aItems[i][sValueField], aItems[i][sLabelField], oDefault == null ? 2/*reception*/ : null));
		fragment.appendChild(createItem(aItems[i][sValueField], aItems[i][sLabelField], sChecked, bRequired));
	}
	return fragment;
}


function createCheckboxes(sFieldName, aItems, sValueField, sLabelField, oDefault){
	var createItem = function(sValue, sLabel, bChecked){
		var el = document.createElement('INPUT');
		el.type = 'checkbox';
		el.name = sFieldName;
		el.value = sValue;
		if(bChecked) el.setAttribute('checked', true);
		var label = document.createElement('LABEL');
		label.appendChild(el);
		label.appendChild(document.createTextNode(' ' + sLabel));
		var div = document.createElement('DIV');
		div.className = 'checkbox';
		div.appendChild(label);
		return div;
	}
	var fragment = document.createDocumentFragment();
	if(oDefault != null){
		fragment.appendChild(createItem(oDefault[sValueField], oDefault[sLabelField]));
	}
	for(var i = 0, n = aItems.length; i < n; ++i){
		fragment.appendChild(createItem(aItems[i][sValueField], aItems[i][sLabelField]));
	}
	return fragment;
}


function phoneFormat(sPhoneNumber, sDefaultCountryCode, sDefaultStateCode){
	if(!sPhoneNumber) return '';

	var sValue = sPhoneNumber.toString().trim();
	sValue = sValue.replace(' ', '', 'g');
	if(sValue.indexOf('+') === 0) sValue = sValue.slice(1);
	if(sValue.indexOf('0') === 0) sValue = sValue.slice(1);

	if(sValue.match(/[^0-9]/)) return sPhoneNumber;

	var country, state, number;
	var group_len = 4;
	switch(sValue.length){
		case 6: // 139999
			country = sValue.slice(0, 2);
			state = null;
			number = sValue.slice(2);
			group_len = 2;
			break;
		case 8: // 4444 5555
			country = sDefaultCountryCode | 61;
			state = sDefaultStateCode | 7;
			number = sValue;
			break;
		case 9:  // 7 4444 5555
			country = sDefaultCountryCode | 61;
			state = sValue.slice(0, 1);
			number = sValue.slice(1);
			break;
		case 10: // 1300 111 222
			country = sValue.slice(0, 4);
			state = null;
			number = sValue.slice(4);
			group_len = 3;
			break;
		case 11: // 617 4444 5555
			country = sValue.slice(0, 2);
			state = sValue.slice(2, 3);
			number = sValue.slice(3);
			break;
		default:
			return sPhoneNumber;
	}

	var a = [number.slice(0, group_len), number.slice(group_len)];
	if(state != null) a.unshift((state < 10 ? '0' : '') + state);
	if(country != sDefaultCountryCode) a.unshift(country);
	return a.join(' ');
}
