import Widget from '../../js/widget';
import support from '../../js/support';
import $ from 'jquery';
import types from '../../js/types';
import { isNumber, getPasteData } from '../../js/utils';
import 'bootstrap-datepicker';
import '../../js/dropdown.jquery';

/**
 * Extends eternicode's bootstrap-datepicker without changing the original.
 * https://github.com/eternicode/bootstrap-datepicker
 * @extends Widget
 */
class DatepickerExtended extends Widget {

    static get selector() {
        return '.question input[type="date"]:not([readonly])';
    }

    static condition() {
        const badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

        /*
         * Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
         * already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
         * existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
         * This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then
         * attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
         *
         * browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
         * webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
         */

        return !support.touch || !support.inputTypes.date || badSamsung.test( navigator.userAgent );
    }

    _init() {
        this.settings = ( this.props.appearances.includes( 'year' ) ) ? {
            format: 'yyyy',
            startView: 'decade',
            minViewMode: 'years'
        } : ( this.props.appearances.includes( 'month-year' ) ) ? {
            format: 'yyyy-mm',
            startView: 'year',
            minViewMode: 'months'
        } : {
            format: 'yyyy-mm-dd',
            startView: 'month',
            minViewMode: 'days'
        };

        this.$fakeDateI = this._createFakeDateInput( this.settings.format );

        this._setChangeHandler( this.$fakeDateI );
        this._setFocusHandler( this.$fakeDateI );
        this._setResetHandler( this.$fakeDateI );

        this.$fakeDateI.datepicker( {
            format: this.settings.format,
            autoclose: true,
            todayHighlight: true,
            startView: this.settings.startView,
            minViewMode: this.settings.minViewMode,
            forceParse: false
        } );

        this.value = this.element.value;
    }

    /**
     * Creates fake date input elements
     * @param  {string} format the date format
     * @return {jQuery}        the jQuery-wrapped fake date input element
     */
    _createFakeDateInput( format ) {
        const $dateI = $( this.element );
        const $fakeDate = $( `<div class="widget date"><input class="ignore input-small" type="text" placeholder="${format}" /></div>` )
            .append( this.resetButtonHtml );
        const $fakeDateI = $fakeDate.find( 'input' );

        $dateI.hide().after( $fakeDate );

        return $fakeDateI;
    }

    /**
     * Copy manual changes that were not detected by bootstrap-datepicker (one without pressing Enter) to original date input field
     *
     * @param { jQuery } $fakeDateI Fake date input element
     */
    _setChangeHandler( $fakeDateI ) {
        const settings = this.settings;

        $fakeDateI.on( 'change paste', e => {
            let convertedValue = '';
            let value = e.type === 'paste' ? getPasteData( e ) : this.value;

            if ( value.length > 0 ) {
                // Note: types.date.convert considers numbers to be a number of days since the epoch
                // as this is what the XPath evaluator may return.
                // For user-entered input, we want to consider a Number value to be incorrect, expect for year input.
                if ( isNumber( value ) && settings.format !== 'yyyy' ) {
                    convertedValue = '';
                } else {
                    value = this._toActualDate( value );
                    convertedValue = types.date.convert( value );
                }
            }

            $fakeDateI.val( this._toDisplayDate( convertedValue ) ).datepicker( 'update' );

            // Here we have to do something unusual to prevent native inputs from automatically
            // changing 2012-12-32 into 2013-01-01
            // convertedValue is '' for invalid 2012-12-32
            if ( convertedValue === '' && e.type === 'paste' ) {
                e.stopImmediatePropagation();
            }

            // Avoid triggering unnecessary change events as they mess up sensitive custom applications (OC)
            if ( this.originalInputValue !== convertedValue ) {
                this.originalInputValue = convertedValue;
            }

            return false;
        } );
    }

    /**
     * Reset button handler
     *
     * @param { jQuery } $fakeDateI Fake date input element
     */
    _setResetHandler( $fakeDateI ) {
        $fakeDateI.next( '.btn-reset' ).on( 'click', () => {
            if ( this.originalInputValue ) {
                this.value = '';
            }
        } );
    }

    /**
     * Handler for focus events.
     * These events on the original input are used to check whether to display the 'required' message
     *
     * @param { jQuery } $fakeDateI Fake date input element
     */
    _setFocusHandler( $fakeDateI ) {
        // Handle focus on original input (goTo functionality)
        $( this.element ).on( 'applyfocus', () => {
            $fakeDateI[ 0 ].focus();
        } );
    }

    _toActualDate( date = '' ) {
        date = date.trim();
        return date && this.settings.format === 'yyyy' && date.length < 5 ? `${date}-01-01` : ( date && this.settings.format === 'yyyy-mm' && date.length < 8 ? `${date}-01` : date );
    }

    _toDisplayDate( date = '' ) {
        date = date.trim();
        return date && this.settings.format === 'yyyy' ? date.substring( 0, 4 ) : ( this.settings.format === 'yyyy-mm' ? date.substring( 0, 7 ) : date );
    }

    update() {
        this.value = this.element.value;
    }

    get displayedValue() {
        return this.question.querySelector( '.widget input' ).value;
    }

    get value() {
        return this._toActualDate( this.displayedValue );
    }

    set value( date ) {
        this.$fakeDateI.datepicker( 'setDate', this._toDisplayDate( date ) );
    }

}

export default DatepickerExtended;
