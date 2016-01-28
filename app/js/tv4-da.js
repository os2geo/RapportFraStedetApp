(function (global) {
    var lang = {
        INVALID_TYPE: "Ugyldig type: {type} (skal være {expected})",
        ENUM_MISMATCH: "Ulovlig værdi: {value}",
        ANY_OF_MISSING: "Data matcher ingen af skemaerne i \"anyOf\"",
        ONE_OF_MISSING: "Data matcher ingen af skemaerne i \"oneOf\"",
        ONE_OF_MULTIPLE: "Data matcher flere skemaer i \"oneOf\": index {index1} og {index2}",
        NOT_PASSED: "Data matcher sskema fra \"not\"",
        // Numeric errors
        NUMBER_MULTIPLE_OF: "{multipleOf} er ikke divisor i {value}",
        NUMBER_MINIMUM: "Værdien {value} må ikke være mindre end {minimum}",
        NUMBER_MINIMUM_EXCLUSIVE: "Værdien {value} skal være større end {minimum}",
        NUMBER_MAXIMUM: "Værdien {value} må ikke være større {maximum}",
        NUMBER_MAXIMUM_EXCLUSIVE: "Værdien {value} skal være mindre {maximum}",
        NUMBER_NOT_A_NUMBER: "Værdien {value} er ikke et gyldigt tal",
        // String errors
        STRING_LENGTH_SHORT: "Teksten er for kort ({length} tegn), skal mindst være {minimum} tegn",
        STRING_LENGTH_LONG: "Teksten er for lang ({length} tegn), må højest være {maximum} tegn",
        STRING_PATTERN: "Teksten matcher ikke formatet: {pattern}",
        // Object errors
        OBJECT_PROPERTIES_MINIMUM: "For få parametre ({propertyCount}), skal mindst være {minimum}",
        OBJECT_PROPERTIES_MAXIMUM: "For mange parametre ({propertyCount}), må højest være {maximum}",
        OBJECT_REQUIRED: "Mangler påkrævet felt: {key}",
        OBJECT_ADDITIONAL_PROPERTIES: "Ekstra felter er ikke tilladt",
        OBJECT_DEPENDENCY_KEY: "Fejl i afhængighed - felt påkrævet: {missing} (pga. feltet: {key})",
        // Array errors
        ARRAY_LENGTH_SHORT: "Listen er for kort ({length}), skal mindst være {minimum}",
        ARRAY_LENGTH_LONG: "Listen er for lang ({length}), må højest være {maximum}",
        ARRAY_UNIQUE: "Værdierne i listen er ikke unikke (index {match1} og {match2})",
        ARRAY_ADDITIONAL_ITEMS: "Ekstra værdi er ikke tilladt",
        // Format errors
        FORMAT_CUSTOM: "Validering mislykkedes ({message})",
        KEYWORD_CUSTOM: "Forkert parameter: {key} ({message})",
        // Schema structure
        CIRCULAR_REFERENCE: "Cirkular $refs: {urls}",
        // Non-standard validation options
        UNKNOWN_PROPERTY: "Ukendt felt (findes ikke i skema)"
    };

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../tv4'], function (tv4) {
            tv4.addLanguage('sv-SE', lang);
            return tv4;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS. Define export.
        var tv4 = require('../tv4');
        tv4.addLanguage('sv-SE', lang);
        module.exports = tv4;
    } else {
        // Browser globals
        global.tv4.addLanguage('da-DK', lang);
    }
})(this);