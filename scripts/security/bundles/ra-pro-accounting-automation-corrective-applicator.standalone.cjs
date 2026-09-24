#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js
var require_ra_pro_accounting_automation_corrective_apply_constants = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js"(exports2, module2) {
    "use strict";
    var ARTIFACT_COMMIT = "772911b236bb24fbb9b06b104732a7495c790a07";
    var EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
    var DATABASE_URL_ENV2 = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL";
    var APPLY_AUTHORIZATION_TOKEN2 = "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_20260922";
    var FORBIDDEN_DATABASE_URL_ENVS = Object.freeze([
      "DATABASE_URL",
      "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL",
      "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
      "CONTAINMENT_APPLY_DATABASE_URL",
      "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
    ]);
    var FEATURE_FLAG_ENV = "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION";
    var ADVISORY_LOCK = Object.freeze({
      name: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY",
      key1: 1380008769,
      // RACA
      key2: 539363618
    });
    var PRIOR_HISTORY_COUNT = 190;
    var POST_HISTORY_COUNT = 191;
    var CONSUMED_ORIGINAL_ATTEMPT_ID = "apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f";
    var MIGRATIONS = Object.freeze([
      Object.freeze({
        version: "20260922003200",
        name: "ra_pro_accounting_automation_service_role_least_privilege",
        path: "supabase/migrations/20260922003200_ra_pro_accounting_automation_service_role_least_privilege.sql",
        oid: "2c24cdfdd087db0020296ebf3b1d077513b4744c",
        sha256: "34f81879c8e5a457ea4025ac36f9961cfcab2e275ae73d71337aa69887dd407f",
        bytes: 3982
      })
    ]);
    var ORIGINAL_COMMITTED_MIGRATIONS = Object.freeze([
      Object.freeze({
        version: "20260917044537",
        name: "ra_pro_weekly_completeness_findings",
        path: "supabase/migrations/20260917044537_ra_pro_weekly_completeness_findings.sql",
        oid: "788de3e4b600c0aac57738c9ca3509d1b7e76d49",
        sha256: "7ce512e9e58a589766db12e6179300bf7f8ba8918a50685cfff5820989925430",
        bytes: 6952
      }),
      Object.freeze({
        version: "20260917180140",
        name: "ra_pro_month_end_review_packages",
        path: "supabase/migrations/20260917180140_ra_pro_month_end_review_packages.sql",
        oid: "929054aec3d08bbf45d13d2a23f187f6200005dd",
        sha256: "ea22749b259a9b14a8cb8c5c575495430262057179d148496d506aaeebbbff10",
        bytes: 3997
      })
    ]);
    var CORRECTIVE_TABLES = Object.freeze([
      "ra_pro_weekly_completeness_runs",
      "ra_pro_weekly_completeness_findings",
      "ra_pro_month_end_review_packages"
    ]);
    var TOOLING_AUTHORIZATION_PATH = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json";
    var EVIDENCE_PIN_AUTHORITY_COMMIT2 = "f550842cd6dd837671599ee8c65bb6ba3932aa62";
    var EVIDENCE_PIN_AUTHORITY_AUTH_OID = "5f3845b14f12b715019e785f40702814a1471b45";
    var EVIDENCE_PIN_AUTHORITY_AUTH_SHA256 = "1c94fea33c01d6ce4fae0e596abbcec81bb59bb55f77fd70207e78ff0940450e";
    var EVIDENCE_PIN_AUTHORITY_AUTH_BYTES = 11452;
    var STANDALONE_BUNDLE_PATH = "scripts/security/bundles/ra-pro-accounting-automation-corrective-applicator.standalone.cjs";
    var EXPECTED_STANDALONE_BUNDLE_SHA256 = "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";
    var STANDALONE_BUNDLE_OID = "PENDING_BUNDLE_OID_PLACEHOLDER_000000000000";
    var STANDALONE_BUNDLE_SHA256 = "PENDING_BUNDLE_SHA256_PLACEHOLDER_00000000000000000000000000000000";
    var STANDALONE_BUNDLE_BYTES = 0;
    var SELF_AUTHORITY_MODULES = Object.freeze([
      "scripts/security/apply-ra-pro-accounting-automation-corrective.js",
      "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js",
      "scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js",
      "scripts/security/ra-pro-accounting-automation-corrective-evidence.js",
      "scripts/security/ra-pro-accounting-automation-corrective-evidence-decode-frame.js",
      "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js",
      "scripts/security/git-blob-authority.js",
      "scripts/security/verify-ra-pro-accounting-automation-corrective-apply-authority.js"
    ]);
    module2.exports = {
      ADVISORY_LOCK,
      APPLY_AUTHORIZATION_TOKEN: APPLY_AUTHORIZATION_TOKEN2,
      ARTIFACT_COMMIT,
      CONSUMED_ORIGINAL_ATTEMPT_ID,
      CORRECTIVE_TABLES,
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
      EVIDENCE_PIN_AUTHORITY_AUTH_OID,
      EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
      EVIDENCE_PIN_AUTHORITY_COMMIT: EVIDENCE_PIN_AUTHORITY_COMMIT2,
      EXPECTED_PROJECT_REF,
      EXPECTED_STANDALONE_BUNDLE_SHA256,
      FEATURE_FLAG_ENV,
      FORBIDDEN_DATABASE_URL_ENVS,
      MIGRATIONS,
      ORIGINAL_COMMITTED_MIGRATIONS,
      POST_HISTORY_COUNT,
      PRIOR_HISTORY_COUNT,
      SELF_AUTHORITY_MODULES,
      STANDALONE_BUNDLE_BYTES,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_SHA256,
      TOOLING_AUTHORIZATION_PATH
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/postgres-array/index.js"(exports2) {
    "use strict";
    exports2.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-types/lib/arrayParser.js"(exports2, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/postgres-date/index.js"(exports2, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/xtend/mutable.js"(exports2, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/postgres-interval/index.js"(exports2, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/postgres-bytea/index.js"(exports2, module2) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-types/lib/textParsers.js"(exports2, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-int8/index.js"(exports2, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-types/lib/binaryParsers.js"(exports2, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-types/lib/builtins.js"(exports2, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-types/index.js"(exports2) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports2.getTypeParser = getTypeParser;
    exports2.setTypeParser = setTypeParser;
    exports2.arrayParser = arrayParser;
    exports2.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/defaults.js"(exports2, module2) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/utils.js"(exports2, module2) {
    "use strict";
    var defaults = require_defaults();
    var { isDate } = require("util/types");
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (defaults.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/utils.js"(exports2, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/cert-signatures.js"(exports2, module2) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module2.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/crypto/sasl.js"(exports2, module2) {
    "use strict";
    var crypto = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/type-overrides.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-connection-string/index.js"(exports2, module2) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module2.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/connection-parameters.js"(exports2, module2) {
    "use strict";
    var dns = require("dns");
    var defaults = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/result.js
var require_result = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/result.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/query.js
var require_query = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/query.js"(exports2, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && connection.parsedStatements[this.name];
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoticeMessage = exports2.DataRowMessage = exports2.CommandCompleteMessage = exports2.ReadyForQueryMessage = exports2.NotificationResponseMessage = exports2.BackendKeyDataMessage = exports2.AuthenticationMD5Password = exports2.ParameterStatusMessage = exports2.ParameterDescriptionMessage = exports2.RowDescriptionMessage = exports2.Field = exports2.CopyResponse = exports2.CopyDataMessage = exports2.DatabaseError = exports2.copyDone = exports2.emptyQuery = exports2.replicationStart = exports2.portalSuspended = exports2.noData = exports2.closeComplete = exports2.bindComplete = exports2.parseComplete = void 0;
    exports2.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports2.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports2.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports2.noData = {
      name: "noData",
      length: 5
    };
    exports2.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports2.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports2.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports2.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports2.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports2.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports2.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports2.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports2.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports2.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports2.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports2.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports2.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports2.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports2.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports2.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports2.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports2.NoticeMessage = NoticeMessage;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/buffer-writer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
    };
    exports2.Writer = Writer;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/serializer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32(Buffer.byteLength(initialResponse)).addString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      const len = types.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(Buffer.byteLength(mappedVal));
          paramWriter.addString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      writeValues(values, config.valueMapper);
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports2.serialize = serialize;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/buffer-reader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++] !== 0) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports2.BufferReader = BufferReader;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports2.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.int32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-protocol/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseError = exports2.serialize = exports2.parse = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports2, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
    exports2.parse = parse;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-cloudflare/dist/empty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = {};
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/stream.js"(exports2, module2) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module2.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var { getStream, getSecureStream } = require_stream();
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.ssl = config.ssl || false;
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          const options = {
            socket: self.stream
          };
          if (self.ssl !== true) {
            Object.assign(options, self.ssl);
            if ("key" in self.ssl) {
              options.key = self.ssl.key;
            }
          }
          const net = require("net");
          if (net.isIP && net.isIP(host) === 0) {
            options.servername = host;
          }
          try {
            self.stream = getSecureStream(options);
          } catch (err) {
            return self.emit("error", err);
          }
          self.attachListeners(self.stream);
          self.stream.on("error", reportStreamError);
          self.emit("sslconnect");
        });
      }
      attachListeners(stream) {
        parse(stream, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/split2/index.js
var require_split2 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/split2/index.js"(exports2, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pgpass/lib/helper.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pgpass/lib/index.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/client.js
var require_client = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/client.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = require("util");
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults = require_defaults();
    var Connection = require_connection();
    var crypto = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this.binary = c.binary || defaults.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            con.requestSsl();
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (this._getActiveQuery() || !this._queryable) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client.Query = Query;
    module2.exports = Client;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg-pool/index.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool = class extends EventEmitter {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool;
  }
});

// scripts/security/stubs/pg-native-failclosed.js
var require_pg_native_failclosed = __commonJS({
  "scripts/security/stubs/pg-native-failclosed.js"() {
    "use strict";
    var err = new Error(
      "PG_NATIVE_DISABLED: sealed containment applicator forbids pg-native resolution"
    );
    err.code = "PG_NATIVE_DISABLED";
    throw err;
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/native/query.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/native/client.js"(exports2, module2) {
    var nodeUtils = require("util");
    var Native;
    try {
      Native = require_pg_native_failclosed();
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util.inherits(Client, EventEmitter);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      this.native.end(function() {
        self._connected = false;
        self._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self.emit("end");
          if (cb) cb();
        });
      });
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client.prototype.isConnected = function() {
      return this._connected;
    };
    Client.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/native/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// ../../../../../finsight-reports-ra321/node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "../../../../../finsight-reports-ra321/node_modules/pg/lib/index.js"(exports2, module2) {
    "use strict";
    var Client = require_client();
    var defaults = require_defaults();
    var Connection = require_connection();
    var Result = require_result();
    var utils = require_utils();
    var Pool = require_pg_pool();
    var TypeOverrides = require_type_overrides();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.TypeOverrides = TypeOverrides;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
      this.Result = Result;
      this.utils = utils;
    };
    var clientConstructor = Client;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module2.exports = new PG(clientConstructor);
    Object.defineProperty(module2.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module2.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// scripts/security/git-blob-authority.js
var require_git_blob_authority = __commonJS({
  "scripts/security/git-blob-authority.js"(exports2, module2) {
    "use strict";
    var { createHash } = require("node:crypto");
    var { execFileSync } = require("node:child_process");
    var path = require("node:path");
    var ROOT = path.resolve(__dirname, "../..");
    function sha256Buffer(buf) {
      return createHash("sha256").update(buf).digest("hex");
    }
    function assertBinaryBuffer(buf, label) {
      if (!Buffer.isBuffer(buf)) {
        throw new Error(`${label}: expected Buffer from git cat-file`);
      }
    }
    function gitEnvForCwd(cwd) {
      const env = { ...process.env };
      const n = Number(env.GIT_CONFIG_COUNT || 0);
      env.GIT_CONFIG_COUNT = String(n + 1);
      env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
      env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
      return env;
    }
    function loadGitBlob(commit, pathRel, opts = {}) {
      if (!commit || !/^[0-9a-f]{7,40}$/i.test(commit)) {
        throw new Error(`invalid commit for git blob load: ${String(commit)}`);
      }
      if (!pathRel || pathRel.includes("\0") || path.isAbsolute(pathRel)) {
        throw new Error(`invalid path for git blob load: ${String(pathRel)}`);
      }
      const cwd = opts.cwd || ROOT;
      const buf = execFileSync("git", ["cat-file", "blob", `${commit}:${pathRel}`], {
        cwd,
        env: gitEnvForCwd(cwd)
        // binary-safe: no encoding
      });
      assertBinaryBuffer(buf, pathRel);
      return buf;
    }
    function gitBlobOid(commit, pathRel, opts = {}) {
      const cwd = opts.cwd || ROOT;
      return execFileSync("git", ["rev-parse", `${commit}:${pathRel}`], {
        cwd,
        env: gitEnvForCwd(cwd),
        encoding: "utf8"
      }).trim();
    }
    function assertUtf8LfNoBom(buf, label = "blob") {
      assertBinaryBuffer(buf, label);
      if (buf.length >= 3 && buf[0] === 239 && buf[1] === 187 && buf[2] === 191) {
        throw new Error(`${label}: UTF-8 BOM forbidden`);
      }
      if (buf.includes(13)) {
        throw new Error(`${label}: CR/CRLF bytes forbidden; require LF-only`);
      }
      new TextDecoder("utf-8", { fatal: true }).decode(buf);
    }
    function loadAndVerifyGitBlob(spec) {
      const {
        commit,
        path: pathRel,
        expectedOid,
        expectedSha256,
        expectedBytes,
        cwd
      } = spec;
      let oid;
      let buffer;
      try {
        oid = gitBlobOid(commit, pathRel, { cwd });
        buffer = loadGitBlob(commit, pathRel, { cwd });
      } catch (err) {
        const e = new Error(`GIT_BLOB_LOAD_FAILED: ${err.message}`);
        e.code = "GIT_BLOB_LOAD_FAILED";
        throw e;
      }
      assertUtf8LfNoBom(buffer, pathRel);
      const digest = sha256Buffer(buffer);
      const bytes = buffer.length;
      if (expectedOid && oid !== expectedOid) {
        const e = new Error(
          `BLOCKED_PIN_MISMATCH: blob OID for ${pathRel} at ${commit}: got ${oid}, expected ${expectedOid}`
        );
        e.code = "BLOCKED_PIN_MISMATCH";
        throw e;
      }
      if (expectedSha256 && digest !== expectedSha256) {
        const e = new Error(
          `BLOCKED_PIN_MISMATCH: SHA-256 for ${pathRel}: got ${digest}, expected ${expectedSha256}`
        );
        e.code = "BLOCKED_PIN_MISMATCH";
        throw e;
      }
      if (expectedBytes != null && bytes !== expectedBytes) {
        const e = new Error(
          `BLOCKED_PIN_MISMATCH: byte length for ${pathRel}: got ${bytes}, expected ${expectedBytes}`
        );
        e.code = "BLOCKED_PIN_MISMATCH";
        throw e;
      }
      return {
        buffer,
        oid,
        sha256: digest,
        bytes,
        source: "git_blob",
        commit,
        path: pathRel
      };
    }
    function stripOuterBeginCommit(fullSqlUtf8) {
      if (typeof fullSqlUtf8 !== "string") {
        throw new Error("stripOuterBeginCommit: expected string");
      }
      if (fullSqlUtf8.includes("\r")) {
        throw new Error("stripOuterBeginCommit: CR bytes forbidden");
      }
      const beginMatches = [...fullSqlUtf8.matchAll(/^BEGIN;/gm)];
      const commitMatches = [...fullSqlUtf8.matchAll(/^COMMIT;/gm)];
      if (beginMatches.length !== 1 || commitMatches.length !== 1) {
        throw new Error(
          `stripOuterBeginCommit: expected exactly one outer BEGIN; and one COMMIT; (begin=${beginMatches.length}, commit=${commitMatches.length})`
        );
      }
      const beginIdx = beginMatches[0].index;
      const commitIdx = commitMatches[0].index;
      if (commitIdx <= beginIdx) {
        throw new Error("stripOuterBeginCommit: COMMIT; before BEGIN;");
      }
      if (!fullSqlUtf8.slice(beginIdx).startsWith("BEGIN;\n")) {
        throw new Error("stripOuterBeginCommit: BEGIN; must be followed by LF");
      }
      const afterCommit = fullSqlUtf8.slice(commitIdx);
      if (!/^COMMIT;\n?$/.test(afterCommit)) {
        throw new Error("stripOuterBeginCommit: COMMIT; must terminate the file");
      }
      const inner = fullSqlUtf8.slice(beginIdx + "BEGIN;\n".length, commitIdx);
      if (!inner.trim()) {
        throw new Error("stripOuterBeginCommit: empty inner body");
      }
      return inner;
    }
    function assertNoDropCascade(sql) {
      if (/\bDROP\s+(VIEW|TABLE|SCHEMA|FUNCTION|MATERIALIZED\s+VIEW)\b[\s\S]{0,200}?\bCASCADE\b/i.test(sql)) {
        throw new Error("DROP ... CASCADE detected in SQL artifact");
      }
    }
    module2.exports = {
      ROOT,
      sha256Buffer,
      loadGitBlob,
      gitBlobOid,
      assertUtf8LfNoBom,
      loadAndVerifyGitBlob,
      stripOuterBeginCommit,
      assertNoDropCascade
    };
  }
});

// scripts/security/embedded-supabase-prod-ca-2021.js
var require_embedded_supabase_prod_ca_2021 = __commonJS({
  "scripts/security/embedded-supabase-prod-ca-2021.js"(exports2, module2) {
    "use strict";
    var OFFICIAL_SUPABASE_PROD_CA_2021_PEM = "-----BEGIN CERTIFICATE-----\nMIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL\nBQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l\ndyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh\nc2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow\nazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD\nYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug\nUm9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW\nQyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q\nDmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2\nGtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi\ncvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4\nO4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt\nNaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX\nuXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt\naUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU\ntVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b\nVW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6\njB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx\nCea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2\nCMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P\no/bKiIz+Fq8=\n-----END CERTIFICATE-----\n";
    var OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256 = "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa";
    module2.exports = {
      OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256
    };
  }
});

// scripts/security/ra-pro-accounting-automation-tls-ca.js
var require_ra_pro_accounting_automation_tls_ca = __commonJS({
  "scripts/security/ra-pro-accounting-automation-tls-ca.js"(exports2, module2) {
    "use strict";
    var crypto = require("node:crypto");
    var tls = require("node:tls");
    var { X509Certificate } = crypto;
    var {
      OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256
    } = require_embedded_supabase_prod_ca_2021();
    var FORBIDDEN_SSLMODES = /* @__PURE__ */ new Set(["disable", "allow", "prefer", "no-verify"]);
    function tlsPolicyError(code, message) {
      const e = new Error(message || code);
      e.code = code;
      e.phase = "tls_policy";
      return e;
    }
    function assertNoTlsBypass(env = process.env) {
      const reject = String(env.NODE_TLS_REJECT_UNAUTHORIZED ?? "").trim();
      if (reject === "0") {
        throw tlsPolicyError(
          "BLOCKED_TLS_BYPASS",
          "BLOCKED_TLS_BYPASS: NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden"
        );
      }
      for (const name of ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"]) {
        if (env[name] != null && String(env[name]).length > 0) {
          throw tlsPolicyError(
            "BLOCKED_TLS_BYPASS",
            `BLOCKED_TLS_BYPASS: ${name} is forbidden`
          );
        }
      }
    }
    function assertNoForbiddenSslMode(sslmode) {
      const mode = String(sslmode || "");
      if (FORBIDDEN_SSLMODES.has(mode) || FORBIDDEN_SSLMODES.has(mode.toLowerCase())) {
        throw tlsPolicyError(
          "BLOCKED_TLS_BYPASS",
          `BLOCKED_TLS_BYPASS: sslmode=${mode || "(empty)"} is forbidden`
        );
      }
    }
    function countCertificates(pem) {
      return (String(pem || "").match(/-----BEGIN CERTIFICATE-----/g) || []).length;
    }
    function assertCaValidityWindow(x509) {
      const now = Date.now();
      const from = Date.parse(x509.validFrom);
      const to = Date.parse(x509.validTo);
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: cannot parse CA validity window");
      }
      if (now < from) {
        throw tlsPolicyError("BLOCKED_TLS_CA_NOT_YET_VALID", "BLOCKED_TLS_CA_NOT_YET_VALID: CA not yet valid");
      }
      if (now > to) {
        throw tlsPolicyError("BLOCKED_TLS_CA_EXPIRED", "BLOCKED_TLS_CA_EXPIRED: CA certificate expired");
      }
    }
    function loadPinnedCaFromPem(pemInput, expectedDerSha256 = null) {
      if (pemInput == null || Array.isArray(pemInput) && pemInput.length !== 1) {
        throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: CA material must be exactly one certificate");
      }
      const pemText = Buffer.isBuffer(pemInput) ? pemInput.toString("utf8") : String(pemInput);
      if (countCertificates(pemText) !== 1) {
        throw tlsPolicyError(
          countCertificates(pemText) === 0 ? "BLOCKED_TLS_CA_INVALID" : "BLOCKED_TLS_CA_EXTRA",
          countCertificates(pemText) === 0 ? "BLOCKED_TLS_CA_INVALID: PEM certificate marker missing" : "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden"
        );
      }
      let x509;
      try {
        x509 = new X509Certificate(pemText);
      } catch {
        throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: X509 parse failed");
      }
      assertCaValidityWindow(x509);
      const derSha = crypto.createHash("sha256").update(x509.raw).digest("hex");
      if (expectedDerSha256 != null && String(expectedDerSha256).toLowerCase() !== derSha) {
        throw tlsPolicyError(
          "BLOCKED_TLS_CA_PIN_MISMATCH",
          "BLOCKED_TLS_CA_PIN_MISMATCH: embedded/official CA DER fingerprint mismatch"
        );
      }
      const canonical = pemText.endsWith("\n") ? pemText : `${pemText}
`;
      return Object.freeze({
        pem: canonical,
        der_sha256: derSha,
        pem_sha256: crypto.createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex"),
        bytes: Buffer.byteLength(canonical),
        valid_from: x509.validFrom,
        valid_to: x509.validTo,
        subject: x509.subject
      });
    }
    function loadOfficialEmbeddedCa() {
      const loaded = loadPinnedCaFromPem(
        OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
        OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256
      );
      if (!String(loaded.subject).includes("Supabase Root 2021 CA")) {
        throw tlsPolicyError("TLS_CA_SUBJECT_MISMATCH", "TLS_CA_SUBJECT_MISMATCH: official CA subject mismatch");
      }
      return loaded;
    }
    function buildVerifySsl(hostname, caPem, env = process.env) {
      assertNoTlsBypass(env);
      if (!hostname || typeof hostname !== "string") {
        throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: hostname required");
      }
      const ca = caPem ? loadPinnedCaFromPem(caPem, null) : loadOfficialEmbeddedCa();
      return {
        rejectUnauthorized: true,
        ca: ca.pem,
        checkServerIdentity: tls.checkServerIdentity,
        minVersion: "TLSv1.2",
        servername: hostname
      };
    }
    function buildProductionSsl(hostname, env = process.env) {
      return buildVerifySsl(hostname, null, env);
    }
    function buildDisposableVerifySsl(opts = {}) {
      assertNoTlsBypass(opts.env || {});
      if (opts.rejectUnauthorized === false || opts.sslmode) {
        if (opts.rejectUnauthorized === false || FORBIDDEN_SSLMODES.has(String(opts.sslmode || "").toLowerCase())) {
          throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: verification disable is forbidden");
        }
      }
      if (opts.extraCaPem) {
        throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden");
      }
      if (!opts.caPem) {
        throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: disposable CA missing");
      }
      const loaded = loadPinnedCaFromPem(opts.caPem, opts.expectedDerSha256 || null);
      return buildVerifySsl(opts.servername, loaded.pem, opts.env || {});
    }
    module2.exports = {
      FORBIDDEN_SSLMODES,
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
      OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
      assertNoForbiddenSslMode,
      assertNoTlsBypass,
      buildDisposableVerifySsl,
      buildProductionSsl,
      loadOfficialEmbeddedCa,
      loadPinnedCaFromPem,
      tlsPolicyError
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js
var require_ra_pro_accounting_automation_corrective_apply_authorization = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js"(exports2, module2) {
    "use strict";
    var fs = require("node:fs");
    var path = require("node:path");
    var { execFileSync } = require("node:child_process");
    var {
      APPLY_AUTHORIZATION_TOKEN: APPLY_AUTHORIZATION_TOKEN2,
      CONSUMED_ORIGINAL_ATTEMPT_ID,
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
      EVIDENCE_PIN_AUTHORITY_AUTH_OID,
      EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
      EVIDENCE_PIN_AUTHORITY_COMMIT: EVIDENCE_PIN_AUTHORITY_COMMIT2,
      EXPECTED_PROJECT_REF,
      MIGRATIONS,
      ORIGINAL_COMMITTED_MIGRATIONS,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var { loadAndVerifyGitBlob } = require_git_blob_authority();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_APPLY_AUTHORIZATION_V1";
    var AUTH_REL = TOOLING_AUTHORIZATION_PATH;
    var ATTEMPT_RE = /^apply-[0-9a-f]{12}-[0-9a-f]{32}$/;
    var HEX40 = /^[0-9a-f]{40}$/;
    var ORIGINAL_VERSIONS = new Set(ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.version));
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "authorization";
      return error;
    }
    function gitEnv(cwd) {
      const env = { ...process.env };
      const n = Number(env.GIT_CONFIG_COUNT || 0);
      env.GIT_CONFIG_COUNT = String(n + 1);
      env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
      env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
      env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-disposable";
      env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-disposable@invalid";
      env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-disposable";
      env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-disposable@invalid";
      return env;
    }
    function gitText(args, cwd) {
      return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
    }
    function isAncestor(ancestor, descendant, cwd) {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
          cwd,
          env: gitEnv(cwd),
          stdio: "ignore"
        });
        return true;
      } catch {
        return false;
      }
    }
    function assertNoAuthEnvOverride(env) {
      for (const key of Object.keys(env || {})) {
        if (/CORRECTIVE.*(AUTH|AUTHORITY|PUBLICATION_COMMIT|EXECUTABLE_COMMIT|EVIDENCE_AUTHORITY)/i.test(key) && env[key] && !/DATABASE_URL|APPLY_TOKEN|APPLY_DATABASE/i.test(key)) {
          throw blocked("AUTHORITY_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function canonicalUnpublishedAuthorization() {
      return {
        status: "UNPUBLISHED",
        protocol: PROTOCOL,
        apply_authorized: false,
        authorized_executable_commit: null,
        attempt_id: null,
        project_ref: null,
        database_url_env: null,
        apply_authorization_token: null,
        bundle: null,
        migrations: null,
        publication_role: "later_descendant_commit",
        note: "Corrective apply authorization is unpublished until a separate reviewed publication. Evidence and the apply token do not authorize apply. Never reuse the consumed dual-package attempt."
      };
    }
    function loadToolingAuthorization(inputs = {}) {
      if (typeof inputs === "string") {
        const cwd2 = inputs;
        const commit2 = arguments[1];
        if (!commit2) {
          throw blocked(
            "AUTHORITY_COMMIT_REQUIRED",
            "loadToolingAuthorization requires an explicit commit; worktree reads are harness-only"
          );
        }
        return loadToolingAuthorization({ cwd: cwd2, commit: commit2 });
      }
      assertNoAuthEnvOverride(inputs.env || process.env);
      const cwd = inputs.cwd || process.cwd();
      if (inputs.allowWorktreeAuthLoad === true) {
        if (inputs.testOnlyHarnessContext !== true) {
          throw blocked(
            "HARNESS_CONTEXT_REQUIRED",
            "worktree AUTH load requires testOnlyHarnessContext === true"
          );
        }
        const abs = path.join(cwd, AUTH_REL);
        const buffer = fs.readFileSync(abs);
        const auth = JSON.parse(buffer.toString("utf8"));
        return {
          auth,
          loaded: {
            buffer,
            oid: null,
            sha256: null,
            bytes: buffer.length,
            source: "worktree_harness",
            path: AUTH_REL
          },
          source: "worktree_harness"
        };
      }
      const commit = String(inputs.commit || "").toLowerCase();
      if (!HEX40.test(commit)) {
        throw blocked(
          "AUTHORITY_COMMIT_REQUIRED",
          "explicit 40-hex commit required for tooling authorization before credentials"
        );
      }
      const loaded = loadAndVerifyGitBlob({
        commit,
        path: AUTH_REL,
        cwd,
        expectedOid: inputs.expectedOid,
        expectedSha256: inputs.expectedSha256,
        expectedBytes: inputs.expectedBytes
      });
      return {
        auth: JSON.parse(loaded.buffer.toString("utf8")),
        loaded,
        source: "git_blob"
      };
    }
    function resolveEvidenceAuthorityCommit(inputs = {}) {
      if (inputs.evidenceAuthorityCommit != null && String(inputs.evidenceAuthorityCommit).length) {
        const got = String(inputs.evidenceAuthorityCommit).toLowerCase();
        if (!HEX40.test(got)) {
          throw blocked("EVIDENCE_AUTHORITY_COMMIT_INVALID", got);
        }
        if (got !== EVIDENCE_PIN_AUTHORITY_COMMIT2) {
          if (!(inputs.testOnlyHarnessContext === true && inputs.allowDisposableEvidenceAuthority === true)) {
            throw blocked(
              "EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN",
              `only ${EVIDENCE_PIN_AUTHORITY_COMMIT2} is evidence pin authority`
            );
          }
          return got;
        }
      }
      return EVIDENCE_PIN_AUTHORITY_COMMIT2;
    }
    function loadEvidencePinAuthority2(inputs = {}) {
      const cwd = inputs.cwd || process.cwd();
      const commit = resolveEvidenceAuthorityCommit(inputs);
      const usePinnedSeals = commit === EVIDENCE_PIN_AUTHORITY_COMMIT2;
      return loadToolingAuthorization({
        cwd,
        commit,
        env: inputs.env,
        expectedOid: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_OID : inputs.expectedOid,
        expectedSha256: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_SHA256 : inputs.expectedSha256,
        expectedBytes: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_BYTES : inputs.expectedBytes
      });
    }
    function resolveExecutableCommit(inputs = {}) {
      if (inputs.dryRunAuthorizationMap && inputs.dryRunAuthorizationMap.authorized_executable_commit) {
        const commit = String(inputs.dryRunAuthorizationMap.authorized_executable_commit).toLowerCase();
        if (!HEX40.test(commit)) {
          throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
        }
        if (inputs.executableCommit && String(inputs.executableCommit).toLowerCase() !== commit) {
          throw blocked(
            "EXECUTABLE_COMMIT_RECHECK_MISMATCH",
            "recheck executable does not match dry-run authorization map"
          );
        }
        return commit;
      }
      if (inputs.testOnlyHarnessContext === true && (inputs.allowDisposablePublicationCommit === true || inputs.allowLocalhostForHarness === true || inputs.allowDisposableDryRunPublicationCommit === true)) {
        if (inputs.executableCommit != null && String(inputs.executableCommit).length) {
          const commit = String(inputs.executableCommit).toLowerCase();
          if (!HEX40.test(commit)) {
            throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
          }
          return commit;
        }
        return gitText(["rev-parse", "HEAD"], inputs.cwd || process.cwd()).toLowerCase();
      }
      if (inputs.applyMode === true && inputs.executableCommit != null && String(inputs.executableCommit).length) {
        const commit = String(inputs.executableCommit).toLowerCase();
        if (!HEX40.test(commit)) {
          throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
        }
        return commit;
      }
      if (inputs.executableCommit != null && String(inputs.executableCommit).length) {
        throw blocked(
          "DRY_RUN_AUTHORIZATION_REQUIRED",
          "--executable-commit alone is not authority; validated dry-run authorization publication required"
        );
      }
      throw blocked(
        "DRY_RUN_AUTHORIZATION_REQUIRED",
        "validated dry-run authorization map required before credentials"
      );
    }
    function resolveApplyAuthorizationCommit(inputs = {}) {
      if (inputs.applyAuthorizationCommit != null && String(inputs.applyAuthorizationCommit).length) {
        const commit = String(inputs.applyAuthorizationCommit).toLowerCase();
        if (!HEX40.test(commit)) {
          throw blocked("APPLY_AUTHORIZATION_COMMIT_INVALID", commit);
        }
        return commit;
      }
      if (inputs.publicationCommit != null && String(inputs.publicationCommit).length) {
        const commit = String(inputs.publicationCommit).toLowerCase();
        if (!HEX40.test(commit)) {
          throw blocked("APPLY_AUTHORIZATION_COMMIT_INVALID", commit);
        }
        if (inputs.allowDisposablePublicationCommit === true && inputs.testOnlyHarnessContext === true) {
          return commit;
        }
        return commit;
      }
      return resolveExecutableCommit(inputs);
    }
    function assertEvidenceAuthorityAncestry(evidenceAuthorityCommit, executableCommit, cwd) {
      if (evidenceAuthorityCommit === executableCommit) return;
      if (!isAncestor(evidenceAuthorityCommit, executableCommit, cwd)) {
        throw blocked(
          "EVIDENCE_AUTHORITY_ANCESTRY",
          "executable must be equal to or a descendant of evidence pin authority"
        );
      }
    }
    function recheckEvidencePinAuthority(inputs = {}) {
      const loaded = loadEvidencePinAuthority2(inputs);
      const commit = resolveEvidenceAuthorityCommit(inputs);
      if (commit === EVIDENCE_PIN_AUTHORITY_COMMIT2) {
        if (loaded.loaded.oid !== EVIDENCE_PIN_AUTHORITY_AUTH_OID) {
          throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", loaded.loaded.oid);
        }
        if (loaded.loaded.sha256 !== EVIDENCE_PIN_AUTHORITY_AUTH_SHA256) {
          throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", loaded.loaded.sha256);
        }
        if (loaded.loaded.bytes !== EVIDENCE_PIN_AUTHORITY_AUTH_BYTES) {
          throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", String(loaded.loaded.bytes));
        }
      }
      return {
        evidence_authority_commit: commit,
        evidence_authority_auth_oid: loaded.loaded.oid,
        evidence_authority_auth_sha256: loaded.loaded.sha256,
        evidence_authority_auth_bytes: loaded.loaded.bytes,
        source: loaded.source
      };
    }
    function assertAttemptNotConsumed(attemptId) {
      if (String(attemptId || "") === CONSUMED_ORIGINAL_ATTEMPT_ID) {
        throw blocked(
          "CORRECTIVE_CONSUMED_ORIGINAL_ATTEMPT_FORBIDDEN",
          CONSUMED_ORIGINAL_ATTEMPT_ID
        );
      }
    }
    function assertCorrectiveMigrationsAllowlist(packed) {
      if (!Array.isArray(packed) || packed.length !== 1) {
        throw blocked("CORRECTIVE_MIGRATIONS_ALLOWLIST", `length ${packed ? packed.length : 0}`);
      }
      const version = packed[0].migration ? packed[0].migration.version : packed[0].version;
      if (version !== MIGRATIONS[0].version) {
        throw blocked("CORRECTIVE_MIGRATIONS_ALLOWLIST", String(version));
      }
      for (const item of packed) {
        const v = item.migration ? item.migration.version : item.version;
        const p = item.migration ? item.migration.path : item.path;
        if (ORIGINAL_VERSIONS.has(String(v)) || ORIGINAL_COMMITTED_MIGRATIONS.some((o) => o.path === p)) {
          throw blocked("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN", String(v || p));
        }
      }
    }
    function assertAuthMigrationsCorrectiveOnly(record) {
      const migrations = record && record.migrations;
      if (migrations == null) return;
      if (!Array.isArray(migrations) || migrations.length !== 1) {
        throw blocked("CORRECTIVE_AUTH_MIGRATIONS_INVALID", "must be length 1");
      }
      if (migrations[0].version !== MIGRATIONS[0].version) {
        throw blocked("CORRECTIVE_AUTH_MIGRATIONS_INVALID", String(migrations[0].version));
      }
      for (const row of migrations) {
        if (ORIGINAL_VERSIONS.has(String(row.version))) {
          throw blocked("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN", row.version);
        }
      }
    }
    function assertApplyBlockedWhenUnpublished(auth) {
      const record = auth && auth.production_apply_authorization || {};
      if (record.status === "AUTHORIZED" && record.apply_authorized === true) {
        assertAttemptNotConsumed(record.attempt_id);
        assertAuthMigrationsCorrectiveOnly(record);
        return record;
      }
      throw blocked(
        "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS",
        "corrective production_apply_authorization is UNPUBLISHED"
      );
    }
    function mktree(lines, cwd) {
      const input = lines.length ? `${lines.join("\n")}
` : "";
      return execFileSync("git", ["mktree"], {
        cwd,
        env: gitEnv(cwd),
        input,
        encoding: "utf8"
      }).trim();
    }
    function replacePathInTree(tree, parts, blob, cwd) {
      const lines = gitText(["ls-tree", tree], cwd).split(/\n/).filter(Boolean);
      const name = parts[0];
      let found = false;
      const next = lines.map((line) => {
        const tab = line.indexOf("	");
        if (line.slice(tab + 1) !== name) return line;
        found = true;
        if (parts.length === 1) return `100644 blob ${blob}	${name}`;
        const old = line.slice(0, tab).split(" ")[2];
        const child = replacePathInTree(old, parts.slice(1), blob, cwd);
        return `040000 tree ${child}	${name}`;
      });
      if (!found) {
        if (parts.length === 1) {
          next.push(`100644 blob ${blob}	${name}`);
        } else {
          const emptyTree = mktree([], cwd);
          const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
          next.push(`040000 tree ${child}	${name}`);
        }
      }
      return mktree(next, cwd);
    }
    function commitPublicationTree(cwd, parent, authObject) {
      const text = `${JSON.stringify(authObject, null, 2)}
`;
      if (text.includes("\r")) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "crlf");
      const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
        cwd,
        env: gitEnv(cwd),
        input: text,
        encoding: "utf8"
      }).trim();
      const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
      const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
      return execFileSync(
        "git",
        ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective apply authorization"],
        { cwd, env: gitEnv(cwd), encoding: "utf8" }
      ).trim();
    }
    function createDisposablePublicationCommit(inputs = {}) {
      if (inputs.allowDisposablePublicationCommit !== true) {
        throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
      }
      if (inputs.testOnlyHarnessContext !== true) {
        throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
      }
      const cwd = inputs.cwd || process.cwd();
      const executable = String(
        inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd)
      ).toLowerCase();
      if (!HEX40.test(executable)) throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable");
      const attemptId = String(inputs.attemptId || "");
      if (!ATTEMPT_RE.test(attemptId)) throw blocked("APPLY_ATTEMPT_ID_INVALID", attemptId);
      assertAttemptNotConsumed(attemptId);
      const { auth } = loadToolingAuthorization({ cwd, commit: executable });
      if ((auth.production_apply_authorization || {}).status === "AUTHORIZED") {
        throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
      }
      const migrations = (auth.migrations || MIGRATIONS).map((row) => ({
        version: row.version,
        path: row.path,
        oid: row.oid,
        sha256: row.sha256,
        bytes: row.bytes
      }));
      assertCorrectiveMigrationsAllowlist(migrations.map((m) => ({ migration: m })));
      auth.production_apply_authorization = {
        status: "AUTHORIZED",
        protocol: PROTOCOL,
        apply_authorized: true,
        authorized_executable_commit: executable,
        attempt_id: attemptId,
        project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
        database_url_env: auth.database_url_env || DATABASE_URL_ENV2,
        apply_authorization_token: auth.apply_authorization_token || APPLY_AUTHORIZATION_TOKEN2,
        bundle: auth.standalone_bundle || null,
        migrations,
        publication_role: "later_descendant_commit",
        note: "Disposable corrective publication for harness only. Publication SHA is not stored here."
      };
      const before = gitText(["rev-parse", "HEAD"], cwd);
      const publication = commitPublicationTree(cwd, executable, auth);
      const after = gitText(["rev-parse", "HEAD"], cwd);
      if (before !== after) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "HEAD moved");
      return { publicationCommit: publication, executableCommit: executable, headUnchanged: true };
    }
    function assertCorrectiveApplyAuthorized(inputs = {}) {
      inputs = { ...inputs, applyMode: true };
      const cwd = inputs.cwd || process.cwd();
      assertNoAuthEnvOverride(inputs.env || process.env);
      if (inputs.allowDisposablePublicationCommit === true) {
        if (inputs.testOnlyHarnessContext !== true) {
          throw blocked("HARNESS_CONTEXT_REQUIRED", "disposable apply auth");
        }
        const commit2 = resolveApplyAuthorizationCommit(inputs);
        const { auth: auth2 } = loadToolingAuthorization({ cwd, commit: commit2, env: inputs.env });
        return assertApplyBlockedWhenUnpublished(auth2);
      }
      const commit = resolveApplyAuthorizationCommit(inputs);
      const executable = resolveExecutableCommit(inputs);
      if (commit !== executable) {
        if (!isAncestor(executable, commit, cwd) || commit === executable) {
          throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "publication must strictly descend executable");
        }
        const names = gitText(["diff", "--name-only", executable, commit], cwd).split(/\n/).filter(Boolean);
        if (names.length !== 1 || names[0] !== AUTH_REL) {
          throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
        }
      }
      const { auth } = loadToolingAuthorization({ cwd, commit, env: inputs.env });
      return assertApplyBlockedWhenUnpublished(auth);
    }
    module2.exports = {
      AUTH_REL,
      PROTOCOL,
      EVIDENCE_PIN_AUTHORITY_COMMIT: EVIDENCE_PIN_AUTHORITY_COMMIT2,
      assertApplyBlockedWhenUnpublished,
      assertAttemptNotConsumed,
      assertCorrectiveApplyAuthorized,
      assertCorrectiveMigrationsAllowlist,
      assertEvidenceAuthorityAncestry,
      canonicalUnpublishedAuthorization,
      createDisposablePublicationCommit,
      loadEvidencePinAuthority: loadEvidencePinAuthority2,
      loadToolingAuthorization,
      recheckEvidencePinAuthority,
      resolveApplyAuthorizationCommit,
      resolveEvidenceAuthorityCommit,
      resolveExecutableCommit
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js
var require_ra_pro_accounting_automation_corrective_dry_run_authorization = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js"(exports2, module2) {
    "use strict";
    var path = require("node:path");
    var { execFileSync } = require("node:child_process");
    var {
      EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
      EVIDENCE_PIN_AUTHORITY_AUTH_OID,
      EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
      EVIDENCE_PIN_AUTHORITY_COMMIT: EVIDENCE_PIN_AUTHORITY_COMMIT2,
      EXPECTED_PROJECT_REF,
      STANDALONE_BUNDLE_BYTES,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_SHA256,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var { loadAndVerifyGitBlob } = require_git_blob_authority();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_DRY_RUN_AUTHORIZATION_V1";
    var AUTH_REL = TOOLING_AUTHORIZATION_PATH;
    var RECORD_KEY = "production_dry_run_authorization";
    var BLOCKED_UNPUBLISHED = "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS";
    var HEX40 = /^[0-9a-f]{40}$/;
    var HEX64 = /^[0-9a-f]{64}$/;
    var ATTEMPT_RE = /^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$/;
    var BOOTSTRAP_REL = "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
    var CEREMONY_REL = "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
    var RECORD_KEYS = Object.freeze([
      "status",
      "protocol",
      "dry_run_authorized",
      "authorized_executable_commit",
      "attempt_id",
      "project_ref",
      "bundle",
      "bootstrap",
      "ceremony",
      "evidence_pin_authority",
      "precondition_evidence",
      "pre_apply_live_evidence",
      "publication_role",
      "note"
    ]);
    var ARTIFACT_MAP = Object.freeze({
      authorization_record: "publication_commit",
      bundle_bootstrap_ceremony: "authorized_executable_commit"
    });
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "dry_run_authorization";
      return error;
    }
    function gitEnv(cwd) {
      const env = { ...process.env };
      const n = Number(env.GIT_CONFIG_COUNT || 0);
      env.GIT_CONFIG_COUNT = String(n + 1);
      env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
      env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
      env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-dryrun-disposable";
      env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-dryrun-disposable@invalid";
      env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-dryrun-disposable";
      env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-dryrun-disposable@invalid";
      return env;
    }
    function gitText(args, cwd) {
      return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
    }
    function canonicalUnpublishedDryRunAuthorization() {
      return {
        status: "UNPUBLISHED",
        protocol: PROTOCOL,
        dry_run_authorized: false,
        authorized_executable_commit: null,
        attempt_id: null,
        project_ref: null,
        bundle: null,
        bootstrap: null,
        ceremony: null,
        evidence_pin_authority: null,
        precondition_evidence: null,
        pre_apply_live_evidence: null,
        publication_role: "later_descendant_commit",
        note: "Corrective dry-run execution authorization is unpublished until a separate reviewed one-object publication names authorized_executable_commit and a unique attempt_id. The publication commit SHA is not stored here. --executable-commit alone is never authority."
      };
    }
    function loadAuthFromGit(commit, cwd) {
      const loaded = loadAndVerifyGitBlob({ commit, path: AUTH_REL, cwd });
      return { auth: JSON.parse(loaded.buffer.toString("utf8")), loaded };
    }
    function isAncestor(ancestor, descendant, cwd) {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
          cwd,
          env: gitEnv(cwd),
          stdio: "ignore"
        });
        return true;
      } catch {
        return false;
      }
    }
    function assertNoAuthorizationEnv(env) {
      for (const key of Object.keys(env || {})) {
        if (/CORRECTIVE.*(DRY_RUN.*AUTH|DRYRUN.*AUTH|EXECUTABLE_COMMIT|AUTHORITY_PUBLICATION)/i.test(key) && env[key] && !/DATABASE_URL|APPLY_TOKEN/i.test(key)) {
          throw blocked("DRY_RUN_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function resolvePublicationCommit(inputs, cwd) {
      if (inputs.publicationCommit != null) {
        const commit = String(inputs.publicationCommit || "").toLowerCase();
        if (!HEX40.test(commit)) {
          throw blocked("DRY_RUN_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "shape");
        }
        return commit;
      }
      return gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
    }
    function assertNotCircularPin(publication, executable, blobText) {
      if (!HEX40.test(String(executable || "")) || executable === publication || String(blobText || "").includes(publication)) {
        throw blocked("DRY_RUN_AUTHORIZATION_CIRCULAR_TIP", "publication commit must not name itself");
      }
    }
    function assertAllowlist(executable, publication, cwd) {
      if (!isAncestor(executable, publication, cwd) || executable === publication) {
        throw blocked("DRY_RUN_AUTHORIZATION_ANCESTRY", "executable must be a strict ancestor");
      }
      const names = gitText(["diff", "--name-only", executable, publication], cwd).split(/\n/).filter(Boolean);
      if (names.length !== 1 || names[0] !== AUTH_REL) {
        throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
      }
      const left = loadAuthFromGit(executable, cwd).auth;
      const right = loadAuthFromGit(publication, cwd).auth;
      const prior = left[RECORD_KEY] || {};
      if (prior.status !== "UNPUBLISHED" || prior.dry_run_authorized !== false || prior.authorized_executable_commit || prior.attempt_id) {
        throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "executable record is not unpublished");
      }
      left[RECORD_KEY] = null;
      right[RECORD_KEY] = null;
      if (JSON.stringify(left) !== JSON.stringify(right)) {
        throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "non-authorization json changed");
      }
    }
    function requireSeal(seal, label) {
      if (!seal || !HEX40.test(String(seal.oid || "")) || !HEX64.test(String(seal.sha256 || "")) || !Number.isInteger(seal.bytes)) {
        throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", label);
      }
    }
    function assertBlob(commit, rel, seal, cwd, code) {
      requireSeal(seal, rel);
      try {
        loadAndVerifyGitBlob({
          commit,
          path: rel,
          expectedOid: seal.oid,
          expectedSha256: seal.sha256,
          expectedBytes: seal.bytes,
          cwd
        });
      } catch (err) {
        throw blocked(code, err && err.message ? err.message : rel);
      }
    }
    function assertEvidencePinBinding(record) {
      const pin = record.evidence_pin_authority || {};
      if (String(pin.commit || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_COMMIT2) {
        throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "commit");
      }
      if (String(pin.auth_blob_oid || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_OID) {
        throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth oid");
      }
      if (String(pin.auth_blob_sha256 || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_SHA256) {
        throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth sha");
      }
      if (pin.auth_blob_bytes !== EVIDENCE_PIN_AUTHORITY_AUTH_BYTES) {
        throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth bytes");
      }
    }
    function assertRecordSeals(record, executable, cwd) {
      if (record.project_ref !== EXPECTED_PROJECT_REF) {
        throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "project");
      }
      if (!ATTEMPT_RE.test(String(record.attempt_id || ""))) {
        throw blocked("DRY_RUN_ATTEMPT_ID_INVALID", String(record.attempt_id || ""));
      }
      assertEvidencePinBinding(record);
      const bundle = record.bundle || {};
      requireSeal(bundle, "bundle");
      if (bundle.path !== STANDALONE_BUNDLE_PATH) {
        throw blocked("DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH", "path");
      }
      assertBlob(executable, STANDALONE_BUNDLE_PATH, bundle, cwd, "DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH");
      const bootstrap = record.bootstrap || {};
      if (bootstrap.path !== BOOTSTRAP_REL) {
        throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "bootstrap path");
      }
      assertBlob(executable, BOOTSTRAP_REL, bootstrap, cwd, "DRY_RUN_AUTHORIZATION_SEAL_MISSING");
      const ceremony = record.ceremony || {};
      if (ceremony.path !== CEREMONY_REL) {
        throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "ceremony path");
      }
      assertBlob(executable, CEREMONY_REL, ceremony, cwd, "DRY_RUN_AUTHORIZATION_SEAL_MISSING");
      for (const key of ["precondition_evidence", "pre_apply_live_evidence"]) {
        const seal = record[key] || {};
        requireSeal(seal, key);
        if (!HEX40.test(String(seal.source_commit || "").toLowerCase())) {
          throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", `${key} source_commit`);
        }
      }
    }
    function describeDryRunArtifactMap(inputs = {}) {
      const cwd = inputs.cwd || process.cwd();
      assertNoAuthorizationEnv(inputs.env || {});
      const publication = resolvePublicationCommit(inputs, cwd);
      const { auth, loaded } = loadAuthFromGit(publication, cwd);
      if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
        throw blocked("DRY_RUN_AUTHORIZATION_WORKTREE_SUBSTITUTE", "auth object");
      }
      const record = auth[RECORD_KEY] || {};
      const base = {
        protocol: PROTOCOL,
        publication_commit: publication,
        authorization_publication_blob_oid: loaded.oid,
        authorized_executable_commit: null,
        attempt_id: null,
        bundle_oid: null,
        dry_run_authorized: false,
        artifact_map: ARTIFACT_MAP,
        blocked: null
      };
      if (record.status !== "AUTHORIZED" || record.dry_run_authorized !== true) {
        return { ...base, blocked: BLOCKED_UNPUBLISHED };
      }
      const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
      if (extraRecordKeys.length) {
        throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
      }
      for (const key of RECORD_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", key);
        }
      }
      const executable = String(record.authorized_executable_commit || "").toLowerCase();
      assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
      assertAllowlist(executable, publication, cwd);
      assertRecordSeals(record, executable, cwd);
      return {
        ...base,
        authorized_executable_commit: executable,
        attempt_id: record.attempt_id,
        bundle_oid: record.bundle.oid,
        bundle_sha256: record.bundle.sha256,
        bundle_bytes: record.bundle.bytes,
        dry_run_authorized: true,
        blocked: null,
        evidence_pin_authority_commit: record.evidence_pin_authority.commit,
        evidence_pin_authority_auth_oid: record.evidence_pin_authority.auth_blob_oid,
        seals: {
          bundle: record.bundle,
          bootstrap: record.bootstrap,
          ceremony: record.ceremony,
          precondition_evidence: record.precondition_evidence,
          pre_apply_live_evidence: record.pre_apply_live_evidence,
          evidence_pin_authority: record.evidence_pin_authority
        }
      };
    }
    function preflightDryRunAuthorization(inputs = {}) {
      try {
        return describeDryRunArtifactMap(inputs);
      } catch (err) {
        return {
          blocked: err.code || "DRY_RUN_AUTHORIZATION_PREFLIGHT_FAILED",
          dry_run_authorized: false,
          publication_commit: inputs.publicationCommit || null,
          authorization_publication_blob_oid: null,
          authorized_executable_commit: null,
          attempt_id: null
        };
      }
    }
    function recheckDryRunAuthorizationPin2(inputs = {}) {
      const cwd = inputs.cwd || process.cwd();
      const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
      const expectCommit = String(inputs.expectCommit || "").toLowerCase();
      const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
      const expectBundle = String(inputs.expectBundleOid || "").toLowerCase();
      const expectAttempt = String(inputs.expectAttemptId || "");
      if (![expectExecutable, expectCommit, expectOid, expectBundle].every((value) => HEX40.test(value))) {
        throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "pin shape");
      }
      if (!ATTEMPT_RE.test(expectAttempt)) {
        throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "attempt shape");
      }
      if (inputs.expectLiveRef != null && String(inputs.expectLiveRef).length) {
        const live = gitText(["rev-parse", String(inputs.expectLiveRef)], cwd).toLowerCase();
        if (live !== expectCommit) {
          throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "live ref swapped after preflight");
        }
      }
      if (!isAncestor(expectExecutable, expectCommit, cwd) || expectExecutable === expectCommit) {
        throw blocked("DRY_RUN_AUTHORIZATION_ANCESTRY", "executable moved after preflight");
      }
      const bundleAtExecutable = gitText(
        ["rev-parse", `${expectExecutable}:${STANDALONE_BUNDLE_PATH}`],
        cwd
      ).toLowerCase();
      let bundleAtPublication = "";
      try {
        bundleAtPublication = gitText(
          ["rev-parse", `${expectCommit}:${STANDALONE_BUNDLE_PATH}`],
          cwd
        ).toLowerCase();
      } catch (err) {
        throw blocked(
          "DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH",
          err && err.message ? err.message : "publication bundle"
        );
      }
      if (bundleAtExecutable !== expectBundle || bundleAtPublication !== expectBundle) {
        throw blocked("DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH", "bundle moved after preflight");
      }
      const { loaded } = loadAuthFromGit(expectCommit, cwd);
      if (loaded.oid !== expectOid) {
        throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "authorization blob changed");
      }
      const decision = describeDryRunArtifactMap({ cwd, publicationCommit: expectCommit });
      if (decision.blocked) throw blocked(decision.blocked, "recheck");
      if (decision.publication_commit !== expectCommit || decision.authorization_publication_blob_oid !== expectOid || decision.authorized_executable_commit !== expectExecutable || decision.bundle_oid !== expectBundle || decision.attempt_id !== expectAttempt) {
        throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "map drift");
      }
      return decision;
    }
    function assertDryRunAuthorizedBeforeCredentials2(inputs = {}) {
      const map = describeDryRunArtifactMap(inputs);
      if (map.blocked || map.dry_run_authorized !== true) {
        throw blocked(map.blocked || BLOCKED_UNPUBLISHED, "dry-run unauthorized");
      }
      return map;
    }
    function mktree(lines, cwd) {
      const input = lines.length ? `${lines.join("\n")}
` : "";
      return execFileSync("git", ["mktree"], {
        cwd,
        env: gitEnv(cwd),
        input,
        encoding: "utf8"
      }).trim();
    }
    function replacePathInTree(tree, parts, blob, cwd) {
      const lines = gitText(["ls-tree", tree], cwd).split(/\n/).filter(Boolean);
      const name = parts[0];
      let found = false;
      const next = lines.map((line) => {
        const tab = line.indexOf("	");
        if (line.slice(tab + 1) !== name) return line;
        found = true;
        if (parts.length === 1) return `100644 blob ${blob}	${name}`;
        const old = line.slice(0, tab).split(" ")[2];
        const child = replacePathInTree(old, parts.slice(1), blob, cwd);
        return `040000 tree ${child}	${name}`;
      });
      if (!found) {
        if (parts.length === 1) {
          next.push(`100644 blob ${blob}	${name}`);
        } else {
          const emptyTree = mktree([], cwd);
          const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
          next.push(`040000 tree ${child}	${name}`);
        }
      }
      return mktree(next, cwd);
    }
    function commitPublicationTree(cwd, parent, authObject) {
      const text = `${JSON.stringify(authObject, null, 2)}
`;
      if (text.includes("\r")) throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "crlf");
      const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
        cwd,
        env: gitEnv(cwd),
        input: text,
        encoding: "utf8"
      }).trim();
      const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
      const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
      return execFileSync(
        "git",
        ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective dry-run authorization"],
        { cwd, env: gitEnv(cwd), encoding: "utf8" }
      ).trim();
    }
    function sealAtCommit(commit, rel, cwd) {
      const loaded = loadAndVerifyGitBlob({ commit, path: rel, cwd });
      return {
        path: rel,
        oid: loaded.oid,
        sha256: loaded.sha256,
        bytes: loaded.bytes,
        line_endings: "LF"
      };
    }
    function createDisposableDryRunPublicationCommit(inputs = {}) {
      if (inputs.allowDisposableDryRunPublicationCommit !== true) {
        throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
      }
      if (inputs.testOnlyHarnessContext !== true) {
        throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
      }
      const cwd = inputs.cwd || process.cwd();
      const executable = String(inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd)).toLowerCase();
      if (!HEX40.test(executable)) throw blocked("DRY_RUN_AUTHORIZATION_ANCESTRY", "executable");
      const attemptId = String(inputs.attemptId || "");
      if (!ATTEMPT_RE.test(attemptId)) throw blocked("DRY_RUN_ATTEMPT_ID_INVALID", attemptId);
      const { auth } = loadAuthFromGit(executable, cwd);
      if ((auth[RECORD_KEY] || {}).status === "AUTHORIZED") {
        throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
      }
      const prePub = auth.precondition_publication || {};
      const livePub = auth.pre_apply_live_publication || {};
      auth[RECORD_KEY] = {
        status: "AUTHORIZED",
        protocol: PROTOCOL,
        dry_run_authorized: true,
        authorized_executable_commit: executable,
        attempt_id: attemptId,
        project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
        bundle: {
          path: STANDALONE_BUNDLE_PATH,
          oid: auth.standalone_bundle && auth.standalone_bundle.oid || STANDALONE_BUNDLE_OID,
          sha256: auth.standalone_bundle && auth.standalone_bundle.sha256 || STANDALONE_BUNDLE_SHA256,
          bytes: auth.standalone_bundle && auth.standalone_bundle.bytes || STANDALONE_BUNDLE_BYTES
        },
        bootstrap: sealAtCommit(executable, BOOTSTRAP_REL, cwd),
        ceremony: sealAtCommit(executable, CEREMONY_REL, cwd),
        evidence_pin_authority: {
          commit: EVIDENCE_PIN_AUTHORITY_COMMIT2,
          auth_path: AUTH_REL,
          auth_blob_oid: EVIDENCE_PIN_AUTHORITY_AUTH_OID,
          auth_blob_sha256: EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
          auth_blob_bytes: EVIDENCE_PIN_AUTHORITY_AUTH_BYTES
        },
        precondition_evidence: {
          path: prePub.evidence_path,
          source_commit: prePub.evidence_source_commit,
          oid: prePub.evidence_blob_oid,
          sha256: prePub.evidence_sha256,
          bytes: prePub.evidence_bytes
        },
        pre_apply_live_evidence: {
          path: livePub.evidence_path,
          source_commit: livePub.evidence_source_commit,
          oid: livePub.evidence_blob_oid,
          sha256: livePub.evidence_sha256,
          bytes: livePub.evidence_bytes
        },
        publication_role: "later_descendant_commit",
        note: "Disposable corrective dry-run publication for harness only. Publication SHA is not stored here."
      };
      const before = gitText(["rev-parse", "HEAD"], cwd);
      const publication = commitPublicationTree(cwd, executable, auth);
      const after = gitText(["rev-parse", "HEAD"], cwd);
      if (before !== after) throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "HEAD moved");
      if (JSON.stringify(auth).includes(publication)) {
        throw blocked("DRY_RUN_AUTHORIZATION_CIRCULAR_TIP", "publication embedded");
      }
      return {
        publicationCommit: publication,
        executableCommit: executable,
        attemptId,
        authorization_publication_blob_oid: gitText(["rev-parse", `${publication}:${AUTH_REL}`], cwd),
        headUnchanged: true
      };
    }
    module2.exports = {
      ARTIFACT_MAP,
      ATTEMPT_RE,
      AUTH_REL,
      BLOCKED_UNPUBLISHED,
      BOOTSTRAP_REL,
      CEREMONY_REL,
      PROTOCOL,
      RECORD_KEY,
      RECORD_KEYS,
      assertDryRunAuthorizedBeforeCredentials: assertDryRunAuthorizedBeforeCredentials2,
      assertNotCircularPin,
      canonicalUnpublishedDryRunAuthorization,
      createDisposableDryRunPublicationCommit,
      describeDryRunArtifactMap,
      loadAuthFromGit,
      preflightDryRunAuthorization,
      recheckDryRunAuthorizationPin: recheckDryRunAuthorizationPin2
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-evidence-schema.js
var require_ra_pro_accounting_automation_corrective_evidence_schema = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-evidence-schema.js"(exports2, module2) {
    "use strict";
    var {
      ORIGINAL_COMMITTED_MIGRATIONS,
      CORRECTIVE_TABLES,
      CONSUMED_ORIGINAL_ATTEMPT_ID,
      PRIOR_HISTORY_COUNT,
      EXPECTED_PROJECT_REF,
      MIGRATIONS
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var BASE_TABLE_PRIVS = Object.freeze([
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
      "REFERENCES",
      "TRIGGER"
    ]);
    var EXCESS_PRIVS = Object.freeze([
      "UPDATE",
      "DELETE",
      "TRUNCATE",
      "REFERENCES",
      "TRIGGER"
    ]);
    var SUBJECT_ROLES = Object.freeze(["service_role", "authenticated", "anon"]);
    var CATALOG_ROLES = Object.freeze(["service_role", "authenticated", "anon", "PUBLIC"]);
    var TARGET_FUNCTIONS = Object.freeze([
      "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)",
      "public.persist_ra_pro_month_end_review_package(jsonb)"
    ]);
    var TARGET_POLICIES = Object.freeze([
      "ra_pro_weekly_runs_service_role_insert",
      "ra_pro_weekly_runs_service_role_select",
      "ra_pro_weekly_runs_firm_member_select",
      "ra_pro_weekly_findings_service_role_insert",
      "ra_pro_weekly_findings_service_role_select",
      "ra_pro_weekly_findings_firm_member_select",
      "ra_pro_month_end_service_insert",
      "ra_pro_month_end_service_select",
      "ra_pro_month_end_member_select"
    ]);
    var POST_COMMIT_POLICIES = Object.freeze([
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_insert", "a", "service_role"],
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_select", "r", "service_role"],
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_firm_member_select", "r", "authenticated"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_insert", "a", "service_role"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_select", "r", "service_role"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_firm_member_select", "r", "authenticated"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_insert", "a", "service_role"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_select", "r", "service_role"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_member_select", "r", "authenticated"]
    ]);
    var SENTINEL_RELATIONS = Object.freeze([
      "invoices",
      "bills",
      "payments",
      "journal_entries",
      "provider_write_attempts"
    ]);
    var SENTINEL_EXPECTED_STATE = Object.freeze({
      invoices: "absent",
      bills: "absent",
      payments: "absent",
      journal_entries: "absent",
      provider_write_attempts: "absent"
    });
    var SENTINEL_ABSENT_PROOF = Object.freeze({
      present: false,
      count: "unavailable",
      mutations: "not_applicable"
    });
    var AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES = Object.freeze([
      "vercel_production_exact_key_names"
    ]);
    var NON_AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES = Object.freeze([
      "local_process",
      "process_env",
      "unavailable",
      "non_authoritative",
      "unknown",
      "fixture_guess"
    ]);
    var WEBHOOK_STATUSES = Object.freeze(["received", "processing", "retryable"]);
    var TABLE_COLUMNS = Object.freeze({
      ra_pro_weekly_completeness_runs: Object.freeze([
        Object.freeze({ name: "id", type: "uuid", nullable: false }),
        Object.freeze({ name: "firm_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "firm_client_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "company_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "accounting_sync_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "provider", type: "text", nullable: false }),
        Object.freeze({ name: "week_ending", type: "date", nullable: false }),
        Object.freeze({ name: "status", type: "text", nullable: false }),
        Object.freeze({ name: "finding_count", type: "int4", nullable: false }),
        Object.freeze({ name: "summary", type: "jsonb", nullable: false }),
        Object.freeze({ name: "idempotency_key", type: "text", nullable: false }),
        Object.freeze({ name: "completed_at", type: "timestamptz", nullable: false }),
        Object.freeze({ name: "created_at", type: "timestamptz", nullable: false })
      ]),
      ra_pro_weekly_completeness_findings: Object.freeze([
        Object.freeze({ name: "id", type: "uuid", nullable: false }),
        Object.freeze({ name: "run_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "category", type: "text", nullable: false }),
        Object.freeze({ name: "code", type: "text", nullable: false }),
        Object.freeze({ name: "severity", type: "text", nullable: false }),
        Object.freeze({ name: "item_count", type: "int4", nullable: false }),
        Object.freeze({ name: "amount_cents", type: "int8", nullable: true }),
        Object.freeze({ name: "evidence", type: "jsonb", nullable: false }),
        Object.freeze({ name: "created_at", type: "timestamptz", nullable: false })
      ]),
      ra_pro_month_end_review_packages: Object.freeze([
        Object.freeze({ name: "id", type: "uuid", nullable: false }),
        Object.freeze({ name: "firm_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "firm_client_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "company_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "accounting_sync_id", type: "uuid", nullable: false }),
        Object.freeze({ name: "provider", type: "text", nullable: false }),
        Object.freeze({ name: "period_end", type: "date", nullable: false }),
        Object.freeze({ name: "status", type: "text", nullable: false }),
        Object.freeze({ name: "review_package", type: "jsonb", nullable: false }),
        Object.freeze({ name: "idempotency_key", type: "text", nullable: false }),
        Object.freeze({ name: "completed_at", type: "timestamptz", nullable: false }),
        Object.freeze({ name: "created_at", type: "timestamptz", nullable: false })
      ])
    });
    var TABLE_INDEXES = Object.freeze({
      ra_pro_weekly_completeness_runs: Object.freeze([
        Object.freeze({ name: "ra_pro_weekly_runs_firm_period_idx", unique: false, columns: Object.freeze(["firm_id", "week_ending"]) }),
        Object.freeze({ name: "ra_pro_weekly_runs_client_period_idx", unique: false, columns: Object.freeze(["firm_client_id", "week_ending"]) })
      ]),
      ra_pro_weekly_completeness_findings: Object.freeze([
        Object.freeze({ name: "ra_pro_weekly_findings_run_idx", unique: false, columns: Object.freeze(["run_id", "severity", "category"]) })
      ]),
      ra_pro_month_end_review_packages: Object.freeze([
        Object.freeze({ name: "ra_pro_month_end_firm_period_idx", unique: false, columns: Object.freeze(["firm_id", "period_end"]) }),
        Object.freeze({ name: "ra_pro_month_end_client_period_idx", unique: false, columns: Object.freeze(["firm_client_id", "period_end"]) })
      ])
    });
    var CONSTRAINT_NAME_BINDING_POLICY = Object.freeze({
      exact_name_bound: Object.freeze([]),
      structurally_canonicalized: "all_pk_unique_fk_check_from_original_migrations"
    });
    function fk(columns, referencedTable, referencedColumns, deleteAction = "RESTRICT") {
      return Object.freeze({
        name_binding: "structural",
        kind: "foreign_key",
        columns: Object.freeze([...columns]),
        referenced_table: referencedTable,
        referenced_columns: Object.freeze([...referencedColumns]),
        match_option: "SIMPLE",
        update_action: "NO ACTION",
        delete_action: deleteAction,
        deferrable: false,
        initially_deferred: false
      });
    }
    function pk(columns) {
      return Object.freeze({
        name_binding: "structural",
        kind: "primary_key",
        columns: Object.freeze([...columns]),
        deferrable: false,
        initially_deferred: false
      });
    }
    function uq(columns) {
      return Object.freeze({
        name_binding: "structural",
        kind: "unique",
        columns: Object.freeze([...columns]),
        nulls_distinct: true,
        deferrable: false,
        initially_deferred: false
      });
    }
    function chk(checkExprNormalized) {
      return Object.freeze({
        name_binding: "structural",
        kind: "check",
        columns: Object.freeze([]),
        check_expr_normalized: checkExprNormalized,
        deferrable: false,
        initially_deferred: false
      });
    }
    var TABLE_CONSTRAINTS = Object.freeze({
      ra_pro_weekly_completeness_runs: Object.freeze([
        pk(["id"]),
        uq(["idempotency_key"]),
        uq(["firm_client_id", "week_ending", "accounting_sync_id"]),
        fk(["firm_id"], "firms", ["id"]),
        fk(["firm_client_id"], "firm_clients", ["id"]),
        fk(["company_id"], "companies", ["id"]),
        fk(["accounting_sync_id"], "accounting_syncs", ["id"]),
        chk("provider IN ('quickbooks','xero')"),
        chk("status IN ('clear','review_required','blocked')"),
        chk("finding_count >= 0"),
        chk("idempotency_key ~ '^[a-f0-9]{64}$'")
      ]),
      ra_pro_weekly_completeness_findings: Object.freeze([
        pk(["id"]),
        uq(["run_id", "code"]),
        fk(["run_id"], "ra_pro_weekly_completeness_runs", ["id"]),
        chk("category IN ('bank_activity','order_to_invoice','accounts_receivable','accounts_payable','source_data')"),
        chk("code ~ '^[a-z0-9_]+$'"),
        chk("severity IN ('review','block')"),
        chk("item_count >= 0")
      ]),
      ra_pro_month_end_review_packages: Object.freeze([
        pk(["id"]),
        uq(["idempotency_key"]),
        uq(["firm_client_id", "period_end", "accounting_sync_id"]),
        fk(["firm_id"], "firms", ["id"]),
        fk(["firm_client_id"], "firm_clients", ["id"]),
        fk(["company_id"], "companies", ["id"]),
        fk(["accounting_sync_id"], "accounting_syncs", ["id"]),
        chk("provider IN ('quickbooks','xero')"),
        chk("status IN ('ready','review_required','blocked')"),
        chk("idempotency_key ~ '^[a-f0-9]{64}$'"),
        chk("(review_package->>'review_only')::boolean IS TRUE"),
        chk("(review_package->>'provider_writes')::boolean IS FALSE")
      ])
    });
    var FUNCTION_SHAPES = Object.freeze([
      Object.freeze({
        signature: "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)",
        security: "INVOKER",
        search_path: "pg_catalog, public",
        language: "plpgsql"
      }),
      Object.freeze({
        signature: "public.persist_ra_pro_month_end_review_package(jsonb)",
        security: "INVOKER",
        search_path: "pg_catalog, public",
        language: "plpgsql"
      })
    ]);
    function blocked(codePrefix, suffix, message) {
      const code = `${codePrefix}_${suffix}`;
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      return error;
    }
    function sortStrings(values) {
      return [...values].map(String).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    }
    function sortPrivilegeArray(values) {
      return sortStrings(values || []);
    }
    function canonicalizePrivilegeList(values) {
      return sortPrivilegeArray(values);
    }
    function canonicalizeInherited(rows) {
      const list = Array.isArray(rows) ? rows : [];
      return list.map((row) => ({
        ancestor: String(row.ancestor || ""),
        privileges: canonicalizePrivilegeList(row.privileges || [])
      })).sort((a, b) => {
        if (a.ancestor !== b.ancestor) return a.ancestor < b.ancestor ? -1 : 1;
        return JSON.stringify(a.privileges).localeCompare(JSON.stringify(b.privileges));
      });
    }
    function canonicalizeUnexpected(rows) {
      const list = Array.isArray(rows) ? rows : [];
      return list.map((row) => ({
        grantee: String(row.grantee || ""),
        privileges: canonicalizePrivilegeList(row.privileges || [])
      })).sort((a, b) => {
        if (a.grantee !== b.grantee) return a.grantee < b.grantee ? -1 : 1;
        return JSON.stringify(a.privileges).localeCompare(JSON.stringify(b.privileges));
      });
    }
    function deepEqualCanonical(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    function effectiveFromDirect(directPrivs, maintainSupported) {
      const set = new Set(directPrivs);
      const matrix = {};
      for (const priv of BASE_TABLE_PRIVS) {
        matrix[priv] = set.has(priv);
      }
      if (maintainSupported) {
        matrix.MAINTAIN = set.has("MAINTAIN");
      }
      return matrix;
    }
    function buildExpectedPrivilegeSurfaces(serverVersionNum) {
      if (!Number.isInteger(serverVersionNum) || serverVersionNum <= 0) {
        throw blocked("CORRECTIVE_EVIDENCE", "VERSION", "server_version_num required");
      }
      const maintainSupported = serverVersionNum >= 17e4;
      const serviceDirect = canonicalizePrivilegeList(
        maintainSupported ? [...BASE_TABLE_PRIVS, "MAINTAIN"] : [...BASE_TABLE_PRIVS]
      );
      const authDirect = canonicalizePrivilegeList(["SELECT"]);
      const emptyDirect = [];
      const tables = {};
      for (const table of CORRECTIVE_TABLES) {
        tables[table] = {
          owner: "postgres",
          direct_catalog: {
            service_role: serviceDirect,
            authenticated: authDirect,
            anon: emptyDirect,
            PUBLIC: emptyDirect
          },
          effective: {
            service_role: effectiveFromDirect(serviceDirect, maintainSupported),
            authenticated: effectiveFromDirect(authDirect, maintainSupported),
            anon: effectiveFromDirect(emptyDirect, maintainSupported)
          },
          inherited_contributions: {
            service_role: [],
            authenticated: [],
            anon: []
          },
          unexpected_grantees: []
        };
      }
      const execute = {};
      for (const signature of TARGET_FUNCTIONS) {
        execute[signature] = {
          service_role: true,
          authenticated: false,
          anon: false,
          PUBLIC: false
        };
      }
      return {
        server_version_num: serverVersionNum,
        maintain_applicability: maintainSupported ? "checked" : "not_supported",
        tables,
        execute
      };
    }
    function assertKeys(obj, keys, codePrefix, suffix) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        throw blocked(codePrefix, suffix, "object required");
      }
      const got = Object.keys(obj).sort();
      const want = [...keys].sort();
      if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
        throw blocked(codePrefix, suffix, "schema keys");
      }
    }
    function assertExact(value, expected, codePrefix, suffix, label) {
      if (value !== expected) throw blocked(codePrefix, suffix, `${label} mismatch`);
    }
    function assertBooleanMatrix(matrix, maintainSupported, codePrefix, suffix, label) {
      if (!matrix || typeof matrix !== "object") {
        throw blocked(codePrefix, suffix, `${label} matrix missing`);
      }
      for (const priv of BASE_TABLE_PRIVS) {
        if (typeof matrix[priv] !== "boolean") {
          throw blocked(codePrefix, suffix, `${label}.${priv} must be boolean`);
        }
      }
      if (maintainSupported) {
        if (typeof matrix.MAINTAIN !== "boolean") {
          throw blocked(codePrefix, suffix, `${label}.MAINTAIN must be boolean on PG17`);
        }
      } else if (Object.prototype.hasOwnProperty.call(matrix, "MAINTAIN")) {
        throw blocked(codePrefix, suffix, `${label}.MAINTAIN forbidden below PG17`);
      }
    }
    function assertDirectArray(arr, maintainSupported, codePrefix, suffix, label) {
      if (!Array.isArray(arr)) throw blocked(codePrefix, suffix, `${label} direct array`);
      const sorted = canonicalizePrivilegeList(arr);
      if (!deepEqualCanonical(arr, sorted) && !deepEqualCanonical(canonicalizePrivilegeList(arr), sorted)) {
      }
      if (new Set(arr).size !== arr.length) {
        throw blocked(codePrefix, suffix, `${label} duplicate privileges`);
      }
      for (const priv of arr) {
        if (!BASE_TABLE_PRIVS.includes(priv) && priv !== "MAINTAIN") {
          throw blocked(codePrefix, suffix, `${label} unknown privilege ${priv}`);
        }
        if (priv === "MAINTAIN" && !maintainSupported) {
          throw blocked(codePrefix, suffix, `${label} MAINTAIN below PG17`);
        }
      }
      if (!maintainSupported && arr.includes("MAINTAIN")) {
        throw blocked(codePrefix, suffix, `${label} MAINTAIN below PG17`);
      }
    }
    function assertNoContradiction(direct, effective, maintainSupported, codePrefix, table, role) {
      const directSet = new Set(direct);
      const privs = maintainSupported ? [...BASE_TABLE_PRIVS, "MAINTAIN"] : [...BASE_TABLE_PRIVS];
      for (const priv of privs) {
        const d = directSet.has(priv);
        const e = effective[priv] === true;
        if (!d && e) {
          throw blocked(
            codePrefix,
            "PRIVILEGE_CONTRADICTION",
            `${table}.${role}.${priv} direct-clean/effective-dirty`
          );
        }
        if (d && !e) {
          throw blocked(
            codePrefix,
            "PRIVILEGE_CONTRADICTION",
            `${table}.${role}.${priv} direct-dirty/effective-clean`
          );
        }
      }
    }
    function assertPreCorrectionPrivilegeSurfaces(observed, codePrefix) {
      if (!observed || typeof observed !== "object") {
        throw blocked(codePrefix, "PRIVILEGE", "privilege_surfaces missing");
      }
      const versionNum = observed.server_version_num;
      if (!Number.isInteger(versionNum) || versionNum <= 0) {
        throw blocked(codePrefix, "VERSION", "server_version_num required");
      }
      const maintainSupported = versionNum >= 17e4;
      const expectedApplicability = maintainSupported ? "checked" : "not_supported";
      assertExact(
        observed.maintain_applicability,
        expectedApplicability,
        codePrefix,
        "MAINTAIN",
        "maintain_applicability"
      );
      const expected = buildExpectedPrivilegeSurfaces(versionNum);
      assertKeys(observed, ["server_version_num", "maintain_applicability", "tables", "execute"], codePrefix, "PRIVILEGE");
      assertKeys(observed.tables, CORRECTIVE_TABLES, codePrefix, "PRIVILEGE");
      for (const table of CORRECTIVE_TABLES) {
        const row = observed.tables[table];
        assertKeys(
          row,
          ["owner", "direct_catalog", "effective", "inherited_contributions", "unexpected_grantees"],
          codePrefix,
          "PRIVILEGE"
        );
        assertExact(row.owner, "postgres", codePrefix, "OWNER", `${table} owner`);
        assertKeys(row.direct_catalog, CATALOG_ROLES, codePrefix, "PRIVILEGE");
        assertKeys(row.effective, SUBJECT_ROLES, codePrefix, "PRIVILEGE");
        assertKeys(row.inherited_contributions, SUBJECT_ROLES, codePrefix, "PRIVILEGE");
        for (const role of CATALOG_ROLES) {
          assertDirectArray(row.direct_catalog[role], maintainSupported, codePrefix, "PRIVILEGE", `${table}.${role}`);
        }
        for (const role of SUBJECT_ROLES) {
          assertBooleanMatrix(row.effective[role], maintainSupported, codePrefix, "PRIVILEGE", `${table}.${role}`);
          assertNoContradiction(
            canonicalizePrivilegeList(row.direct_catalog[role]),
            row.effective[role],
            maintainSupported,
            codePrefix,
            table,
            role
          );
        }
        for (const role of CATALOG_ROLES) {
          const gotDirect = canonicalizePrivilegeList(row.direct_catalog[role]);
          const wantDirect = expected.tables[table].direct_catalog[role];
          if (!deepEqualCanonical(gotDirect, wantDirect)) {
            throw blocked(codePrefix, "PRIVILEGE_DEFECT", `${table}.${role} direct catalog mismatch`);
          }
        }
        for (const role of SUBJECT_ROLES) {
          const wantEff = expected.tables[table].effective[role];
          for (const priv of Object.keys(wantEff)) {
            if (row.effective[role][priv] !== wantEff[priv]) {
              throw blocked(codePrefix, "PRIVILEGE_DEFECT", `${table}.${role}.effective.${priv}`);
            }
          }
          const inherited = canonicalizeInherited(row.inherited_contributions[role]);
          if (inherited.length !== 0) {
            throw blocked(codePrefix, "PRIVILEGE_INHERITED", `${table}.${role} inherited excess not empty`);
          }
          for (const entry of inherited) {
            const excess = entry.privileges.filter(
              (p) => EXCESS_PRIVS.includes(p) || maintainSupported && p === "MAINTAIN"
            );
            if (excess.length) {
              throw blocked(codePrefix, "PRIVILEGE_INHERITED", `${table}.${role}<=${entry.ancestor}`);
            }
          }
        }
        const unexpected = canonicalizeUnexpected(row.unexpected_grantees);
        if (unexpected.length !== 0) {
          throw blocked(codePrefix, "PRIVILEGE_UNEXPECTED", `${table} unexpected grantees present`);
        }
      }
      assertKeys(observed.execute, TARGET_FUNCTIONS, codePrefix, "EXECUTE");
      for (const signature of TARGET_FUNCTIONS) {
        const exec = observed.execute[signature];
        assertKeys(exec, CATALOG_ROLES, codePrefix, "EXECUTE");
        assertExact(exec.service_role, true, codePrefix, "EXECUTE", `${signature} service_role`);
        assertExact(exec.authenticated, false, codePrefix, "EXECUTE", `${signature} authenticated`);
        assertExact(exec.anon, false, codePrefix, "EXECUTE", `${signature} anon`);
        assertExact(exec.PUBLIC, false, codePrefix, "EXECUTE", `${signature} PUBLIC`);
      }
    }
    function canonicalizeColumns(cols) {
      return [...cols || []].map((c) => ({
        name: String(c.name),
        type: String(c.type),
        nullable: Boolean(c.nullable)
      })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
    function canonicalizeIndexes(indexes) {
      return [...indexes || []].map((idx) => ({
        name: String(idx.name),
        unique: Boolean(idx.unique),
        columns: sortStrings(idx.columns || [])
      })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
    function normalizeCheckExpression(expr) {
      let s = String(expr || "").trim();
      s = s.replace(/^CHECK\s*/i, "");
      s = s.replace(/\s+/g, " ").trim();
      if (s.startsWith("(") && s.endsWith(")")) {
        let depth = 0;
        let wrap = true;
        for (let i = 0; i < s.length; i += 1) {
          if (s[i] === "(") depth += 1;
          else if (s[i] === ")") {
            depth -= 1;
            if (depth === 0 && i !== s.length - 1) {
              wrap = false;
              break;
            }
          }
        }
        if (wrap) s = s.slice(1, -1).trim();
      }
      s = s.replace(
        /=\s*ANY\s*\(\s*ARRAY\s*\[([^\]]+)\]\s*\)/gi,
        (_m, inner) => {
          const parts = [...inner.matchAll(/'([^']*)'/g)].map((x) => x[1]).sort();
          return " IN ('" + parts.join("','") + "')";
        }
      );
      s = s.replace(/\s+IN\s*\(/gi, " IN (");
      s = s.replace(/IN\s*\(([^)]+)\)/gi, (_m, inner) => {
        const parts = [...String(inner).matchAll(/'([^']*)'/g)].map((x) => x[1]);
        if (parts.length === 0) return "IN (" + String(inner).replace(/\s+/g, "") + ")";
        return "IN ('" + [...parts].sort().join("','") + "')";
      });
      s = s.replace(/::text/gi, "");
      s = s.replace(/\bTRUE\b/gi, "TRUE").replace(/\bFALSE\b/gi, "FALSE");
      s = s.replace(/\s+/g, " ").trim();
      return s;
    }
    function orderedColumns(columns) {
      return [...columns || []].map(String);
    }
    function structuralConstraintIdentity(constraint) {
      const kind = String(constraint.kind);
      const binding = String(constraint.name_binding || "structural");
      const base = {
        name_binding: binding,
        kind,
        columns: orderedColumns(constraint.columns),
        deferrable: Boolean(constraint.deferrable),
        initially_deferred: Boolean(constraint.initially_deferred)
      };
      if (binding === "exact") {
        base.name = String(constraint.name || "");
      }
      if (kind === "foreign_key") {
        return {
          ...base,
          referenced_table: String(constraint.referenced_table || ""),
          referenced_columns: orderedColumns(constraint.referenced_columns),
          match_option: String(constraint.match_option || "SIMPLE"),
          update_action: String(constraint.update_action || "NO ACTION"),
          delete_action: String(constraint.delete_action || "NO ACTION")
        };
      }
      if (kind === "check") {
        return {
          ...base,
          check_expr_normalized: normalizeCheckExpression(
            constraint.check_expr_normalized || constraint.check_expr || constraint.token || ""
          )
        };
      }
      if (kind === "unique") {
        return {
          ...base,
          nulls_distinct: constraint.nulls_distinct !== false
        };
      }
      if (kind === "primary_key") {
        return base;
      }
      throw blocked("CORRECTIVE_EVIDENCE", "OBJECT_CONSTRAINTS", "unknown kind " + kind);
    }
    function constraintIdentityKey(identity) {
      return JSON.stringify(identity);
    }
    function canonicalizeConstraints(constraints) {
      return [...constraints || []].map((c) => structuralConstraintIdentity(c)).sort((a, b) => constraintIdentityKey(a).localeCompare(constraintIdentityKey(b)));
    }
    function assertConstraintSet(observedConstraints, expectedConstraints, codePrefix, table) {
      if (!Array.isArray(observedConstraints)) {
        throw blocked(codePrefix, "OBJECT_CONSTRAINTS", table + " constraints array");
      }
      const got = canonicalizeConstraints(observedConstraints);
      const want = canonicalizeConstraints(expectedConstraints);
      const gotKeys = got.map(constraintIdentityKey);
      const wantKeys = want.map(constraintIdentityKey);
      if (new Set(gotKeys).size !== gotKeys.length) {
        throw blocked(codePrefix, "OBJECT_CONSTRAINTS", table + " duplicate canonical constraints");
      }
      if (new Set(wantKeys).size !== wantKeys.length) {
        throw blocked(codePrefix, "OBJECT_CONSTRAINTS", table + " sealed duplicate constraints");
      }
      if (!deepEqualCanonical(got, want)) {
        throw blocked(codePrefix, "OBJECT_CONSTRAINTS", table + " constraints drift");
      }
    }
    function assertProviderSentinels(providerSentinels, codePrefix, expectedState = SENTINEL_EXPECTED_STATE) {
      if (!providerSentinels || typeof providerSentinels !== "object" || Array.isArray(providerSentinels)) {
        throw blocked(codePrefix, "SENTINEL", "provider_sentinels object required");
      }
      assertKeys(providerSentinels, SENTINEL_RELATIONS, codePrefix, "SENTINEL");
      for (const rel of SENTINEL_RELATIONS) {
        const expected = expectedState[rel];
        const s = providerSentinels[rel];
        if (!s || typeof s !== "object" || Array.isArray(s)) {
          throw blocked(codePrefix, "SENTINEL", rel + " entry");
        }
        if (expected === "absent") {
          assertKeys(s, ["present", "count", "mutations"], codePrefix, "SENTINEL");
          if (s.present !== false) {
            throw blocked(codePrefix, "SENTINEL", rel + " unexpected presence");
          }
          if (s.count !== "unavailable") {
            throw blocked(codePrefix, "SENTINEL", rel + " absent count must be unavailable");
          }
          if (s.mutations !== "not_applicable") {
            throw blocked(codePrefix, "SENTINEL", rel + " absent mutations must be not_applicable");
          }
          continue;
        }
        if (expected === "present") {
          assertKeys(s, ["present", "count"], codePrefix, "SENTINEL");
          if (s.present !== true) {
            throw blocked(codePrefix, "SENTINEL", rel + " expected present");
          }
          if (!Number.isInteger(s.count) || s.count < 0) {
            throw blocked(codePrefix, "SENTINEL", rel + " count");
          }
          continue;
        }
        throw blocked(codePrefix, "SENTINEL", rel + " unknown sealed expected state");
      }
    }
    function assertAutomationGate(gate, codePrefix) {
      if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
        throw blocked(codePrefix, "AUTOMATION_GATE", "gate missing");
      }
      assertKeys(
        gate,
        ["key", "production_presence", "production_key_name_authority", "effective_state", "value_read"],
        codePrefix,
        "AUTOMATION_GATE"
      );
      assertExact(gate.key, "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", codePrefix, "AUTOMATION_GATE", "key");
      const authority = String(gate.production_key_name_authority || "");
      if (NON_AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES.includes(authority) || !authority) {
        throw blocked(codePrefix, "AUTOMATION_GATE", "non-authoritative Production key-name authority");
      }
      if (!AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES.includes(authority)) {
        throw blocked(codePrefix, "AUTOMATION_GATE", "Production key-name authority not sealed");
      }
      if (gate.production_presence !== "absent" || gate.effective_state !== "closed" || gate.value_read !== false) {
        throw blocked(codePrefix, "AUTOMATION_GATE", "gate closed/absent/value_read");
      }
    }
    function canonicalizePolicies(policies) {
      return [...policies || []].map((p) => ({
        name: String(p.name),
        cmd: String(p.cmd),
        role: String(p.role)
      })).sort((a, b) => {
        if (a.name !== b.name) return a.name < b.name ? -1 : 1;
        if (a.cmd !== b.cmd) return a.cmd < b.cmd ? -1 : 1;
        return a.role < b.role ? -1 : a.role > b.role ? 1 : 0;
      });
    }
    function assertPreCorrectionObjects(observed, codePrefix) {
      if (!observed || typeof observed !== "object") {
        throw blocked(codePrefix, "OBJECT", "objects missing");
      }
      assertKeys(
        observed,
        ["tables", "functions", "provider_sentinels", "partial_corrective_state", "row_counts"],
        codePrefix,
        "OBJECT"
      );
      assertExact(observed.partial_corrective_state, false, codePrefix, "PARTIAL_STATE", "partial_corrective_state");
      if (!Array.isArray(observed.tables) || observed.tables.length !== CORRECTIVE_TABLES.length) {
        throw blocked(codePrefix, "OBJECT", "tables length");
      }
      const byName = new Map(observed.tables.map((t) => [t.name, t]));
      for (const table of CORRECTIVE_TABLES) {
        if (!byName.has(table)) throw blocked(codePrefix, "OBJECT", `missing table ${table}`);
      }
      for (const table of CORRECTIVE_TABLES) {
        const row = byName.get(table);
        assertKeys(
          row,
          ["name", "owner", "rls_enabled", "columns", "indexes", "constraints", "policies"],
          codePrefix,
          "OBJECT"
        );
        assertExact(row.name, table, codePrefix, "OBJECT", "name");
        assertExact(row.owner, "postgres", codePrefix, "OWNER", table);
        assertExact(row.rls_enabled, true, codePrefix, "OBJECT", `${table} rls`);
        const cols = canonicalizeColumns(row.columns);
        const wantCols = canonicalizeColumns(TABLE_COLUMNS[table]);
        if (!deepEqualCanonical(cols, wantCols)) {
          throw blocked(codePrefix, "OBJECT_COLUMNS", `${table} columns drift`);
        }
        const indexes = canonicalizeIndexes(row.indexes);
        const wantIdx = canonicalizeIndexes(TABLE_INDEXES[table]);
        if (!deepEqualCanonical(indexes, wantIdx)) {
          throw blocked(codePrefix, "OBJECT_INDEXES", `${table} indexes drift`);
        }
        assertConstraintSet(row.constraints, TABLE_CONSTRAINTS[table], codePrefix, table);
        const policies = canonicalizePolicies(row.policies);
        const wantPolicies = canonicalizePolicies(
          POST_COMMIT_POLICIES.filter((p) => p[0] === table).map((p) => ({
            name: p[1],
            cmd: p[2],
            role: p[3]
          }))
        );
        if (!deepEqualCanonical(policies, wantPolicies)) {
          throw blocked(codePrefix, "OBJECT_POLICIES", `${table} policies drift`);
        }
      }
      if (!Array.isArray(observed.functions) || observed.functions.length !== FUNCTION_SHAPES.length) {
        throw blocked(codePrefix, "OBJECT_FUNCTIONS", "function count");
      }
      const fnCanon = [...observed.functions].map((f) => ({
        signature: String(f.signature),
        security: String(f.security),
        search_path: String(f.search_path),
        language: String(f.language)
      })).sort((a, b) => a.signature.localeCompare(b.signature));
      const wantFn = [...FUNCTION_SHAPES].map((f) => ({ ...f })).sort((a, b) => a.signature.localeCompare(b.signature));
      if (!deepEqualCanonical(fnCanon, wantFn)) {
        throw blocked(codePrefix, "OBJECT_FUNCTIONS", "function shape drift");
      }
      assertProviderSentinels(observed.provider_sentinels, codePrefix);
      assertKeys(observed.row_counts, CORRECTIVE_TABLES, codePrefix, "ROW_COUNTS");
      for (const table of CORRECTIVE_TABLES) {
        const n = observed.row_counts[table];
        if (!Number.isInteger(n) || n < 0) {
          throw blocked(codePrefix, "ROW_COUNTS", `${table} row_count`);
        }
      }
    }
    function validateOriginals(db, codePrefix) {
      const originals = db.original_committed_migrations;
      if (!Array.isArray(originals) || originals.length !== ORIGINAL_COMMITTED_MIGRATIONS.length) {
        throw blocked(codePrefix, "ORIGINALS", "original migration count");
      }
      for (const expected of ORIGINAL_COMMITTED_MIGRATIONS) {
        const got = originals.find((row) => row.version === expected.version);
        if (!got) throw blocked(codePrefix, "ORIGINALS", `missing ${expected.version}`);
        assertExact(got.count, 1, codePrefix, "ORIGINALS", "count");
        assertExact(got.digest_match, true, codePrefix, "ORIGINALS", "digest");
        assertExact(got.oid, expected.oid, codePrefix, "ORIGINALS", "oid");
        assertExact(got.sha256, expected.sha256, codePrefix, "ORIGINALS", "sha256");
        assertExact(got.bytes, expected.bytes, codePrefix, "ORIGINALS", "bytes");
      }
    }
    function validatePreCorrectionDatabaseReadonly(db, { codePrefix = "CORRECTIVE_PRECONDITION" } = {}) {
      assertExact(db.project_ref, EXPECTED_PROJECT_REF, codePrefix, "PROJECT_MISMATCH", "project_ref");
      assertExact(db.history_count, PRIOR_HISTORY_COUNT, codePrefix, "HISTORY_DRIFT", "history");
      validateOriginals(db, codePrefix);
      assertExact(db.corrective_version, MIGRATIONS[0].version, codePrefix, "CORRECTIVE", "version");
      assertExact(db.corrective_version_count, 0, codePrefix, "CORRECTIVE", "count");
      assertPreCorrectionPrivilegeSurfaces(db.privilege_surfaces, codePrefix);
      assertPreCorrectionObjects(db.objects, codePrefix);
      assertExact(db.linked_firms_count, 0, codePrefix, "LINKED_FIRMS", "linked firms");
      const inventory = db.authorizing_inventory;
      assertKeys(inventory, ["predicate", "total", "company_owned", "firm_owned", "dual_owner"], codePrefix, "INVENTORY");
      assertExact(inventory.predicate, "review_assist_pro_active_and_complimentary", codePrefix, "INVENTORY", "predicate");
      assertExact(inventory.total, 4, codePrefix, "INVENTORY", "total");
      assertExact(inventory.company_owned, 3, codePrefix, "INVENTORY", "company");
      assertExact(inventory.firm_owned, 1, codePrefix, "INVENTORY", "firm");
      assertExact(inventory.dual_owner, 0, codePrefix, "INVENTORY", "dual");
      if (inventory.company_owned + inventory.firm_owned + inventory.dual_owner !== inventory.total) {
        throw blocked(codePrefix, "INVENTORY", "inventory sum");
      }
      if (!Array.isArray(db.webhook_non_terminal_statuses) || db.webhook_non_terminal_statuses.join(",") !== WEBHOOK_STATUSES.join(",")) {
        throw blocked(codePrefix, "WEBHOOK", "statuses");
      }
      assertExact(db.webhook_non_terminal_count, 0, codePrefix, "WEBHOOK", "count");
      assertExact(db.consumed_dual_attempt_id, CONSUMED_ORIGINAL_ATTEMPT_ID, codePrefix, "DUAL_ATTEMPT", "consumed attempt");
    }
    function buildSyntheticPrivilegeSurfaces(serverVersionNum = 16e4) {
      return buildExpectedPrivilegeSurfaces(serverVersionNum);
    }
    function buildSyntheticObjects(rowCounts = null) {
      const counts = rowCounts || {
        ra_pro_weekly_completeness_runs: 0,
        ra_pro_weekly_completeness_findings: 0,
        ra_pro_month_end_review_packages: 0
      };
      const tables = CORRECTIVE_TABLES.map((name) => ({
        name,
        owner: "postgres",
        rls_enabled: true,
        columns: TABLE_COLUMNS[name].map((c) => ({ ...c })),
        indexes: TABLE_INDEXES[name].map((i) => ({ name: i.name, unique: i.unique, columns: [...i.columns] })),
        constraints: TABLE_CONSTRAINTS[name].map((c) => ({ ...c })),
        policies: POST_COMMIT_POLICIES.filter((p) => p[0] === name).map((p) => ({
          name: p[1],
          cmd: p[2],
          role: p[3]
        }))
      }));
      const provider_sentinels = {};
      for (const rel of SENTINEL_RELATIONS) {
        const expected = SENTINEL_EXPECTED_STATE[rel];
        if (expected === "absent") {
          provider_sentinels[rel] = { ...SENTINEL_ABSENT_PROOF };
        } else {
          provider_sentinels[rel] = { present: true, count: 0 };
        }
      }
      return {
        tables,
        functions: FUNCTION_SHAPES.map((f) => ({ ...f })),
        provider_sentinels,
        partial_corrective_state: false,
        row_counts: { ...counts }
      };
    }
    module2.exports = {
      BASE_TABLE_PRIVS,
      EXCESS_PRIVS,
      SUBJECT_ROLES,
      CATALOG_ROLES,
      TARGET_FUNCTIONS,
      TARGET_POLICIES,
      POST_COMMIT_POLICIES,
      SENTINEL_RELATIONS,
      SENTINEL_EXPECTED_STATE,
      SENTINEL_ABSENT_PROOF,
      AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES,
      NON_AUTHORITATIVE_PRODUCTION_KEY_NAME_AUTHORITIES,
      CONSTRAINT_NAME_BINDING_POLICY,
      WEBHOOK_STATUSES,
      TABLE_COLUMNS,
      TABLE_INDEXES,
      TABLE_CONSTRAINTS,
      FUNCTION_SHAPES,
      sortStrings,
      sortPrivilegeArray,
      canonicalizePrivilegeList,
      canonicalizeInherited,
      canonicalizeUnexpected,
      deepEqualCanonical,
      normalizeCheckExpression,
      structuralConstraintIdentity,
      canonicalizeConstraints,
      assertConstraintSet,
      assertProviderSentinels,
      assertAutomationGate,
      buildExpectedPrivilegeSurfaces,
      buildSyntheticPrivilegeSurfaces,
      buildSyntheticObjects,
      assertPreCorrectionPrivilegeSurfaces,
      assertPreCorrectionObjects,
      validatePreCorrectionDatabaseReadonly
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-collection-authorization.js
var require_ra_pro_accounting_automation_corrective_collection_authorization = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-collection-authorization.js"(exports2, module2) {
    "use strict";
    var path = require("node:path");
    var { execFileSync } = require("node:child_process");
    var {
      EXPECTED_PROJECT_REF,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_SHA256,
      STANDALONE_BUNDLE_BYTES,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var { loadAndVerifyGitBlob } = require_git_blob_authority();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_EVIDENCE_COLLECTION_AUTHORIZATION_V1";
    var AUTH_REL = TOOLING_AUTHORIZATION_PATH;
    var RECORD_KEY = "production_collection_authorization";
    var BLOCKED_UNPUBLISHED = "COLLECTION_REMAINS_BLOCKED_BEFORE_PRODUCTION_CONTACT";
    var HEX40 = /^[0-9a-f]{40}$/;
    var HEX64 = /^[0-9a-f]{64}$/;
    var REJECTED_STALE_COLLECTION_TIP_DBDCE968 = "dbdce9680fa996aab4e952567562e0ab7fb9d237";
    var PRECONDITION_CONTRACT_REL = "docs/security/ra-pro-accounting-automation-corrective-apply/PRECONDITION_EVIDENCE_CONTRACT.json";
    var PRE_APPLY_CONTRACT_REL = "docs/security/ra-pro-accounting-automation-corrective-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
    var SCHEMA_REL = "scripts/security/ra-pro-accounting-automation-corrective-evidence-schema.js";
    var PRECONDITION_GATES_REL = "scripts/security/ra-pro-accounting-automation-corrective-precondition-gates.js";
    var PRE_APPLY_GATES_REL = "scripts/security/ra-pro-accounting-automation-corrective-pre-apply-gates.js";
    var COLLECTOR_REL = "scripts/security/ra-pro-accounting-automation-corrective-evidence-collector.js";
    var RECORD_KEYS = Object.freeze([
      "status",
      "protocol",
      "collection_authorized",
      "authorized_executable_commit",
      "project_ref",
      "bundle",
      "precondition_evidence_contract",
      "pre_apply_live_evidence_contract",
      "schema",
      "precondition_gates",
      "pre_apply_gates",
      "collector",
      "publication_role",
      "note"
    ]);
    var ARTIFACT_MAP = Object.freeze({
      authorization_record: "publication_commit",
      contracts_schema_gates_collector_bundle: "authorized_executable_commit"
    });
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "collection_authorization";
      return error;
    }
    function gitEnv(cwd) {
      const env = { ...process.env };
      const n = Number(env.GIT_CONFIG_COUNT || 0);
      env.GIT_CONFIG_COUNT = String(n + 1);
      env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
      env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
      env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-collection-disposable";
      env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-collection-disposable@invalid";
      env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-collection-disposable";
      env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-collection-disposable@invalid";
      return env;
    }
    function gitText(args, cwd) {
      return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
    }
    function canonicalUnpublishedCollectionAuthorization() {
      return {
        status: "UNPUBLISHED",
        protocol: PROTOCOL,
        collection_authorized: false,
        authorized_executable_commit: null,
        project_ref: null,
        bundle: null,
        precondition_evidence_contract: null,
        pre_apply_live_evidence_contract: null,
        schema: null,
        precondition_gates: null,
        pre_apply_gates: null,
        collector: null,
        publication_role: "later_descendant_commit",
        note: "Corrective evidence-collection authorization is unpublished until a separate reviewed one-object publication names authorized_executable_commit. The publication commit SHA is not stored here. dbdce968 is rejected/stale and must never authorize collection."
      };
    }
    function loadAuthFromGit(commit, cwd) {
      const loaded = loadAndVerifyGitBlob({ commit, path: AUTH_REL, cwd });
      return { auth: JSON.parse(loaded.buffer.toString("utf8")), loaded };
    }
    function isAncestor(ancestor, descendant, cwd) {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
          cwd,
          env: gitEnv(cwd),
          stdio: "ignore"
        });
        return true;
      } catch {
        return false;
      }
    }
    function assertNoAuthorizationEnv(env) {
      for (const key of Object.keys(env || {})) {
        if (/CORRECTIVE.*COLLECTION.*AUTH|COLLECTION_AUTHORIZATION/i.test(key) && env[key]) {
          throw blocked("COLLECTION_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function resolvePublicationCommit(inputs, cwd) {
      if (inputs.publicationCommit != null) {
        const commit = String(inputs.publicationCommit || "").toLowerCase();
        if (!HEX40.test(commit)) throw blocked("COLLECTION_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "shape");
        return commit;
      }
      return gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
    }
    function assertNotCircularPin(publication, executable, blobText) {
      if (!HEX40.test(String(executable || "")) || executable === publication || String(blobText || "").includes(publication)) {
        throw blocked("COLLECTION_AUTHORIZATION_CIRCULAR_TIP", "publication commit must not name itself");
      }
      if (String(executable) === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
        throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", REJECTED_STALE_COLLECTION_TIP_DBDCE968);
      }
      if (String(blobText || "").includes(REJECTED_STALE_COLLECTION_TIP_DBDCE968)) {
        throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", "dbdce968 in auth blob");
      }
    }
    function assertAllowlist(executable, publication, cwd) {
      if (!isAncestor(executable, publication, cwd) || executable === publication) {
        throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable must be a strict ancestor");
      }
      const names = gitText(["diff", "--name-only", executable, publication], cwd).split(/\n/).filter(Boolean);
      if (names.length !== 1 || names[0] !== AUTH_REL) {
        throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
      }
      const left = loadAuthFromGit(executable, cwd).auth;
      const right = loadAuthFromGit(publication, cwd).auth;
      const prior = left[RECORD_KEY] || {};
      if (prior.status !== "UNPUBLISHED" || prior.collection_authorized !== false || prior.authorized_executable_commit) {
        throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "executable record is not unpublished");
      }
      left[RECORD_KEY] = null;
      right[RECORD_KEY] = null;
      if (JSON.stringify(left) !== JSON.stringify(right)) {
        throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "non-authorization json changed");
      }
    }
    function requireSeal(seal, label) {
      if (!seal || !HEX40.test(String(seal.oid || "")) || !HEX64.test(String(seal.sha256 || "")) || !Number.isInteger(seal.bytes)) {
        throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", label);
      }
    }
    function assertBlob(commit, rel, seal, cwd, code) {
      requireSeal(seal, rel);
      try {
        loadAndVerifyGitBlob({
          commit,
          path: rel,
          expectedOid: seal.oid,
          expectedSha256: seal.sha256,
          expectedBytes: seal.bytes,
          cwd
        });
      } catch (err) {
        throw blocked(code, err && err.message ? err.message : rel);
      }
    }
    function assertRecordSeals(record, executable, cwd) {
      if (record.project_ref !== EXPECTED_PROJECT_REF) {
        throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", "project");
      }
      const bundle = record.bundle || {};
      requireSeal(bundle, "bundle");
      if (bundle.path !== STANDALONE_BUNDLE_PATH) {
        throw blocked("COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH", "path");
      }
      assertBlob(executable, STANDALONE_BUNDLE_PATH, bundle, cwd, "COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH");
      const pairs = [
        ["precondition_evidence_contract", PRECONDITION_CONTRACT_REL],
        ["pre_apply_live_evidence_contract", PRE_APPLY_CONTRACT_REL],
        ["schema", SCHEMA_REL],
        ["precondition_gates", PRECONDITION_GATES_REL],
        ["pre_apply_gates", PRE_APPLY_GATES_REL],
        ["collector", COLLECTOR_REL]
      ];
      for (const [key, rel] of pairs) {
        const seal = record[key] || {};
        if (seal.path !== rel) throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", key + " path");
        assertBlob(executable, rel, seal, cwd, "COLLECTION_AUTHORIZATION_SEAL_MISSING");
      }
    }
    function describeCollectionArtifactMap(inputs = {}) {
      const cwd = inputs.cwd || process.cwd();
      assertNoAuthorizationEnv(inputs.env || {});
      const publication = resolvePublicationCommit(inputs, cwd);
      const { auth, loaded } = loadAuthFromGit(publication, cwd);
      if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
        throw blocked("COLLECTION_AUTHORIZATION_WORKTREE_SUBSTITUTE", "auth object");
      }
      const record = auth[RECORD_KEY] || {};
      const base = {
        protocol: PROTOCOL,
        publication_commit: publication,
        authorization_publication_blob_oid: loaded.oid,
        authorized_executable_commit: null,
        bundle_oid: null,
        collection_authorized: false,
        artifact_map: ARTIFACT_MAP,
        blocked: null
      };
      if (record.status !== "AUTHORIZED" || record.collection_authorized !== true) {
        return { ...base, blocked: BLOCKED_UNPUBLISHED };
      }
      const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
      if (extraRecordKeys.length) {
        throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
      }
      for (const key of RECORD_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", key);
        }
      }
      const executable = String(record.authorized_executable_commit || "").toLowerCase();
      assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
      assertAllowlist(executable, publication, cwd);
      assertRecordSeals(record, executable, cwd);
      return {
        ...base,
        authorized_executable_commit: executable,
        bundle_oid: record.bundle.oid,
        bundle_sha256: record.bundle.sha256,
        bundle_bytes: record.bundle.bytes,
        collection_authorized: true,
        blocked: null,
        seals: {
          precondition_evidence_contract: record.precondition_evidence_contract,
          pre_apply_live_evidence_contract: record.pre_apply_live_evidence_contract,
          schema: record.schema,
          precondition_gates: record.precondition_gates,
          pre_apply_gates: record.pre_apply_gates,
          collector: record.collector,
          bundle: record.bundle
        }
      };
    }
    function preflightCollectionAuthorization(inputs = {}) {
      try {
        return describeCollectionArtifactMap(inputs);
      } catch (err) {
        return {
          blocked: err.code || "COLLECTION_AUTHORIZATION_PREFLIGHT_FAILED",
          collection_authorized: false,
          publication_commit: inputs.publicationCommit || null,
          authorization_publication_blob_oid: null,
          authorized_executable_commit: null
        };
      }
    }
    function recheckCollectionAuthorizationPin(inputs = {}) {
      const cwd = inputs.cwd || process.cwd();
      const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
      const expectCommit = String(inputs.expectCommit || "").toLowerCase();
      const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
      const expectBundle = String(inputs.expectBundleOid || "").toLowerCase();
      if (![expectExecutable, expectCommit, expectOid, expectBundle].every((value) => HEX40.test(value))) {
        throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "pin shape");
      }
      const head = gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
      if (head !== expectCommit) {
        throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "HEAD changed after preflight");
      }
      if (!isAncestor(expectExecutable, head, cwd) || expectExecutable === head) {
        throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable moved after preflight");
      }
      const bundleAtExecutable = gitText(
        ["rev-parse", `${expectExecutable}:${STANDALONE_BUNDLE_PATH}`],
        cwd
      ).toLowerCase();
      let bundleAtHead = "";
      try {
        bundleAtHead = gitText(["rev-parse", `${head}:${STANDALONE_BUNDLE_PATH}`], cwd).toLowerCase();
      } catch (err) {
        throw blocked(
          "COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH",
          err && err.message ? err.message : "publication bundle"
        );
      }
      if (bundleAtExecutable !== expectBundle || bundleAtHead !== expectBundle) {
        throw blocked("COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH", "bundle moved after preflight");
      }
      const { loaded } = loadAuthFromGit(head, cwd);
      if (loaded.oid !== expectOid) {
        throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "authorization blob changed");
      }
      const decision = describeCollectionArtifactMap({ cwd, publicationCommit: head });
      if (decision.blocked) throw blocked(decision.blocked, "recheck");
      if (decision.publication_commit !== expectCommit || decision.authorization_publication_blob_oid !== expectOid || decision.authorized_executable_commit !== expectExecutable || decision.bundle_oid !== expectBundle) {
        throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "map drift");
      }
      return decision;
    }
    function assertCollectionAuthorityBeforeObservation(inputs = {}) {
      const map = describeCollectionArtifactMap(inputs);
      if (map.blocked || map.collection_authorized !== true) {
        throw blocked(map.blocked || BLOCKED_UNPUBLISHED, "collection unauthorized");
      }
      return map;
    }
    function mktree(lines, cwd) {
      const input = lines.length ? `${lines.join("\n")}
` : "";
      return execFileSync("git", ["mktree"], {
        cwd,
        env: gitEnv(cwd),
        input,
        encoding: "utf8"
      }).trim();
    }
    function replacePathInTree(tree, parts, blob, cwd) {
      const lines = gitText(["ls-tree", tree], cwd).split(/\n/).filter(Boolean);
      const name = parts[0];
      let found = false;
      const next = lines.map((line) => {
        const tab = line.indexOf("	");
        if (line.slice(tab + 1) !== name) return line;
        found = true;
        if (parts.length === 1) return `100644 blob ${blob}	${name}`;
        const old = line.slice(0, tab).split(" ")[2];
        const child = replacePathInTree(old, parts.slice(1), blob, cwd);
        return `040000 tree ${child}	${name}`;
      });
      if (!found) {
        if (parts.length === 1) {
          next.push(`100644 blob ${blob}	${name}`);
        } else {
          const emptyTree = mktree([], cwd);
          const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
          next.push(`040000 tree ${child}	${name}`);
        }
      }
      return mktree(next, cwd);
    }
    function commitPublicationTree(cwd, parent, authObject) {
      const text = `${JSON.stringify(authObject, null, 2)}
`;
      if (text.includes("\r")) throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "crlf");
      const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
        cwd,
        env: gitEnv(cwd),
        input: text,
        encoding: "utf8"
      }).trim();
      const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
      const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
      return execFileSync(
        "git",
        ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective collection authorization"],
        { cwd, env: gitEnv(cwd), encoding: "utf8" }
      ).trim();
    }
    function sealAtCommit(commit, rel, cwd) {
      const loaded = loadAndVerifyGitBlob({ commit, path: rel, cwd });
      return {
        path: rel,
        oid: loaded.oid,
        sha256: loaded.sha256,
        bytes: loaded.bytes,
        line_endings: "LF"
      };
    }
    function createDisposableCollectionPublicationCommit(inputs = {}) {
      if (inputs.allowDisposablePublicationCommit !== true) {
        throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
      }
      const cwd = inputs.cwd || process.cwd();
      const executable = String(inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd)).toLowerCase();
      if (!HEX40.test(executable)) throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable");
      if (executable === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
        throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", executable);
      }
      const { auth } = loadAuthFromGit(executable, cwd);
      if ((auth[RECORD_KEY] || {}).status === "AUTHORIZED") {
        throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
      }
      auth[RECORD_KEY] = {
        status: "AUTHORIZED",
        protocol: PROTOCOL,
        collection_authorized: true,
        authorized_executable_commit: executable,
        project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
        bundle: {
          path: STANDALONE_BUNDLE_PATH,
          oid: auth.standalone_bundle && auth.standalone_bundle.oid || STANDALONE_BUNDLE_OID,
          sha256: auth.standalone_bundle && auth.standalone_bundle.sha256 || STANDALONE_BUNDLE_SHA256,
          bytes: auth.standalone_bundle && auth.standalone_bundle.bytes || STANDALONE_BUNDLE_BYTES
        },
        precondition_evidence_contract: sealAtCommit(executable, PRECONDITION_CONTRACT_REL, cwd),
        pre_apply_live_evidence_contract: sealAtCommit(executable, PRE_APPLY_CONTRACT_REL, cwd),
        schema: sealAtCommit(executable, SCHEMA_REL, cwd),
        precondition_gates: sealAtCommit(executable, PRECONDITION_GATES_REL, cwd),
        pre_apply_gates: sealAtCommit(executable, PRE_APPLY_GATES_REL, cwd),
        collector: sealAtCommit(executable, COLLECTOR_REL, cwd),
        publication_role: "later_descendant_commit",
        note: "Disposable corrective collection publication for harness only. Publication SHA is not stored here."
      };
      const before = gitText(["rev-parse", "HEAD"], cwd);
      const publication = commitPublicationTree(cwd, executable, auth);
      const after = gitText(["rev-parse", "HEAD"], cwd);
      if (before !== after) throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "HEAD moved");
      if (JSON.stringify(auth).includes(publication)) {
        throw blocked("COLLECTION_AUTHORIZATION_CIRCULAR_TIP", "publication embedded");
      }
      return {
        publicationCommit: publication,
        executableCommit: executable,
        authorization_publication_blob_oid: gitText(["rev-parse", `${publication}:${AUTH_REL}`], cwd),
        headUnchanged: true
      };
    }
    function expectedAuthorityFromMap(map) {
      if (!map || map.blocked || map.collection_authorized !== true) {
        throw blocked(BLOCKED_UNPUBLISHED, "expected authority unavailable");
      }
      return {
        authorized_executable_commit: map.authorized_executable_commit,
        authorization_publication_commit: map.publication_commit,
        authorization_publication_blob_oid: map.authorization_publication_blob_oid
      };
    }
    module2.exports = {
      ARTIFACT_MAP,
      AUTH_REL,
      BLOCKED_UNPUBLISHED,
      COLLECTOR_REL,
      PRECONDITION_CONTRACT_REL,
      PRE_APPLY_CONTRACT_REL,
      PROTOCOL,
      RECORD_KEY,
      RECORD_KEYS,
      REJECTED_STALE_COLLECTION_TIP_DBDCE968,
      SCHEMA_REL,
      assertCollectionAuthorityBeforeObservation,
      assertNotCircularPin,
      canonicalUnpublishedCollectionAuthorization,
      createDisposableCollectionPublicationCommit,
      describeCollectionArtifactMap,
      expectedAuthorityFromMap,
      loadAuthFromGit,
      preflightCollectionAuthorization,
      recheckCollectionAuthorizationPin
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-precondition-gates.js
var require_ra_pro_accounting_automation_corrective_precondition_gates = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-precondition-gates.js"(exports2, module2) {
    "use strict";
    var { loadAndVerifyGitBlob, assertUtf8LfNoBom } = require_git_blob_authority();
    var {
      validatePreCorrectionDatabaseReadonly,
      assertPreCorrectionPrivilegeSurfaces,
      assertAutomationGate,
      WEBHOOK_STATUSES: SCHEMA_WEBHOOK_STATUSES,
      BASE_TABLE_PRIVS
    } = require_ra_pro_accounting_automation_corrective_evidence_schema();
    var {
      MIGRATIONS,
      PRIOR_HISTORY_COUNT
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var {
      REJECTED_STALE_COLLECTION_TIP_DBDCE968
    } = require_ra_pro_accounting_automation_corrective_collection_authorization();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
    var CONTRACT_PATH = "docs/security/ra-pro-accounting-automation-corrective-apply/PRECONDITION_EVIDENCE_CONTRACT.json";
    var HISTORY_COUNT = PRIOR_HISTORY_COUNT;
    var CORRECTIVE_VERSION = MIGRATIONS[0].version;
    var WINDOW_MS = 24 * 60 * 60 * 1e3;
    var WEBHOOK_STATUSES = SCHEMA_WEBHOOK_STATUSES;
    var TABLE_PRIVILEGES = BASE_TABLE_PRIVS;
    var EXECUTE_ROLES = ["service_role", "authenticated", "anon", "PUBLIC"];
    var HEX40 = /^[0-9a-f]{40}$/;
    var SUBSTITUTES = /* @__PURE__ */ new Set([
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1"
    ]);
    var SOURCE_CHANNELS = /* @__PURE__ */ new Set([
      "fresh_read_only_supabase_select",
      "synthetic_disposable_fixture"
    ]);
    var DISPOSABLE_VALIDATOR = "PASS_CORRECTIVE_PRECONDITION_VALIDATION";
    var AUTH_KEYS = [
      "pr_number",
      "scope",
      "authorized_executable_commit",
      "authorization_publication_commit",
      "authorization_publication_blob_oid"
    ];
    var FORBIDDEN_AUTH_KEYS = ["pr_head", "tooling_reviewed_tip", "collection_pr_head"];
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "precondition_evidence";
      return error;
    }
    function assertExact(value, expected, code, label) {
      if (value !== expected) throw blocked(code, `${label} mismatch`);
    }
    function assertKeys(obj, keys, code) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
      const got = Object.keys(obj);
      if (got.length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
        throw blocked(code, "schema keys");
      }
    }
    function assertRequiredKeys(obj, keys, code) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
      if (keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
        throw blocked(code, "schema keys");
      }
    }
    function parseUtc(value, code) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
        throw blocked(code, "timestamp");
      }
      const ms = Date.parse(value);
      if (!Number.isFinite(ms)) throw blocked(code, "timestamp");
      return ms;
    }
    function resolveNow(options = {}) {
      if (options.now == null) return Date.now();
      if (options.now instanceof Date) return options.now.getTime();
      return parseUtc(String(options.now), "CORRECTIVE_PRECONDITION_TIMESTAMP");
    }
    function assertSanitized(text) {
      if (/postgres(?:ql)?:\/\//i.test(text) || /sk_[a-z]+_/i.test(text) || text.includes("BEGIN CERTIFICATE") || text.includes("BEGIN RSA") || /supabase\.co/i.test(text) || /https?:\/\//i.test(text) || text.includes("@") || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) {
        throw blocked("CORRECTIVE_PRECONDITION_SANITIZATION", "forbidden material");
      }
    }
    function assertNoOverride(inputs = {}) {
      const env = inputs.env || {};
      if (inputs.preconditionEvidencePath) {
        throw blocked("CORRECTIVE_PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
      }
      for (const key of [
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_PATH",
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_SHA256"
      ]) {
        if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
          throw blocked("CORRECTIVE_PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function assertTrailingLf(buffer) {
      try {
        assertUtf8LfNoBom(buffer, "corrective precondition evidence");
      } catch (err) {
        throw blocked("CORRECTIVE_PRECONDITION_NEWLINE", err.message);
      }
      if (buffer.length < 2 || buffer[buffer.length - 1] !== 10 || buffer[buffer.length - 2] === 10) {
        throw blocked("CORRECTIVE_PRECONDITION_NEWLINE", "exactly one trailing LF required");
      }
    }
    function expectedAuthorityFromPublication(pub = {}) {
      const e = {
        authorized_executable_commit: pub.authorized_executable_commit,
        authorization_publication_commit: pub.authorization_publication_commit,
        authorization_publication_blob_oid: pub.authorization_publication_blob_oid
      };
      if (!HEX40.test(String(e.authorized_executable_commit || "").toLowerCase()) || !HEX40.test(String(e.authorization_publication_commit || "").toLowerCase()) || !HEX40.test(String(e.authorization_publication_blob_oid || "").toLowerCase())) {
        return null;
      }
      return {
        authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
        authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
        authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase()
      };
    }
    function expectedAuthority(options = {}) {
      const e = options.expected || {};
      if (e.authorized_executable_commit && e.authorization_publication_commit && e.authorization_publication_blob_oid) {
        return {
          authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
          authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
          authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase()
        };
      }
      const fromPub = expectedAuthorityFromPublication(options.publication || {});
      if (fromPub) return fromPub;
      throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_EXPECTED", "expected authority pins required");
    }
    function validatePrivilegeMatrix(dbOrSurfaces, codePrefix = "CORRECTIVE_PRECONDITION") {
      return assertPreCorrectionPrivilegeSurfaces(
        dbOrSurfaces.privilege_surfaces || dbOrSurfaces,
        codePrefix
      );
    }
    function validateDatabaseReadonly(db) {
      return validatePreCorrectionDatabaseReadonly(db, {
        codePrefix: "CORRECTIVE_PRECONDITION"
      });
    }
    function validateSafety(safety) {
      assertKeys(
        safety,
        [
          "read_only",
          "select_only",
          "production_writes",
          "sql_application_attempts",
          "dry_run_attempts",
          "migration_apply_attempts",
          "provider_writes",
          "automation_enabled",
          "merge_or_deploy_performed",
          "credential_prompt_opened",
          "marker_created",
          "pins_published"
        ],
        "CORRECTIVE_PRECONDITION_SCHEMA"
      );
      if (safety.read_only !== true || safety.select_only !== true) {
        throw blocked("CORRECTIVE_PRECONDITION_SAFETY", "read_only");
      }
      for (const key of [
        "production_writes",
        "sql_application_attempts",
        "dry_run_attempts",
        "migration_apply_attempts",
        "provider_writes"
      ]) {
        if (safety[key] !== 0) throw blocked("CORRECTIVE_PRECONDITION_WRITE_COUNTER", key);
      }
      if (safety.automation_enabled !== false || safety.merge_or_deploy_performed !== false || safety.credential_prompt_opened !== false || safety.marker_created !== false || safety.pins_published !== false) {
        throw blocked("CORRECTIVE_PRECONDITION_SAFETY", "safety flag");
      }
    }
    function validateAuthorityBlock(authz, options, codePrefix) {
      if (!authz || typeof authz !== "object" || Array.isArray(authz)) {
        throw blocked(`${codePrefix}_SCHEMA`, "authorization object");
      }
      for (const key of FORBIDDEN_AUTH_KEYS) {
        if (Object.prototype.hasOwnProperty.call(authz, key)) {
          throw blocked(`${codePrefix}_AUTHORITY_FORBIDDEN`, key);
        }
      }
      void options;
      assertKeys(authz, AUTH_KEYS, `${codePrefix}_SCHEMA`);
      const expected = expectedAuthority(options);
      for (const key of [
        "authorized_executable_commit",
        "authorization_publication_commit",
        "authorization_publication_blob_oid"
      ]) {
        const value = String(authz[key] || "").toLowerCase();
        if (!HEX40.test(value)) throw blocked(`${codePrefix}_AUTHORITY_SHAPE`, key);
        if (value === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
          throw blocked(`${codePrefix}_REJECTED_STALE_TIP`, key);
        }
        assertExact(value, String(expected[key]).toLowerCase(), `${codePrefix}_AUTHORITY_MISMATCH`, key);
      }
    }
    function validateCorrectivePreconditionEvidence(evidence, options = {}) {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
        throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "evidence object");
      }
      if (SUBSTITUTES.has(evidence.protocol)) {
        throw blocked("CORRECTIVE_PRECONDITION_SUBSTITUTION_FORBIDDEN", evidence.protocol);
      }
      assertRequiredKeys(
        evidence,
        [
          "protocol",
          "schema_version",
          "source_channel_classification",
          "collected_at_utc",
          "valid_from_utc",
          "valid_until_utc",
          "authorization",
          "automation_gate",
          "database_readonly",
          "safety",
          "visibility_limitations",
          "validator_result"
        ],
        "CORRECTIVE_PRECONDITION_SCHEMA"
      );
      assertExact(evidence.protocol, PROTOCOL, "CORRECTIVE_PRECONDITION_PROTOCOL_MISMATCH", "protocol");
      assertExact(evidence.schema_version, 3, "CORRECTIVE_PRECONDITION_SCHEMA", "schema_version");
      if (!SOURCE_CHANNELS.has(evidence.source_channel_classification)) {
        throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "source channel");
      }
      assertExact(evidence.validator_result, DISPOSABLE_VALIDATOR, "CORRECTIVE_PRECONDITION_SCHEMA", "validator");
      const from = parseUtc(evidence.valid_from_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
      const until = parseUtc(evidence.valid_until_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
      const collected = parseUtc(evidence.collected_at_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
      if (until - from !== WINDOW_MS) throw blocked("CORRECTIVE_PRECONDITION_WINDOW", "window must be 24h");
      if (collected < from || collected >= until) {
        throw blocked("CORRECTIVE_PRECONDITION_WINDOW", "collection outside validity");
      }
      const now = resolveNow(options);
      if (now < from) throw blocked("CORRECTIVE_PRECONDITION_NOT_YET_VALID", "future start");
      if (now >= until) throw blocked("CORRECTIVE_PRECONDITION_EXPIRED", "expired");
      const authz = evidence.authorization;
      for (const key of FORBIDDEN_AUTH_KEYS) {
        if (authz && Object.prototype.hasOwnProperty.call(authz, key)) {
          throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_FORBIDDEN", key);
        }
      }
      assertKeys(authz, AUTH_KEYS, "CORRECTIVE_PRECONDITION_SCHEMA");
      assertExact(authz.pr_number, 324, "CORRECTIVE_PRECONDITION_SCHEMA", "pr");
      assertExact(
        authz.scope,
        "read_only_production_corrective_precondition_collection",
        "CORRECTIVE_PRECONDITION_SCHEMA",
        "scope"
      );
      validateAuthorityBlock(authz, options, "CORRECTIVE_PRECONDITION");
      const gate = evidence.automation_gate;
      assertAutomationGate(gate, "CORRECTIVE_PRECONDITION");
      const db = evidence.database_readonly;
      assertKeys(
        db,
        [
          "project_ref",
          "observed_at_utc",
          "history_count",
          "original_committed_migrations",
          "corrective_version",
          "corrective_version_count",
          "privilege_surfaces",
          "objects",
          "linked_firms_count",
          "authorizing_inventory",
          "webhook_non_terminal_count",
          "webhook_non_terminal_statuses",
          "consumed_dual_attempt_id"
        ],
        "CORRECTIVE_PRECONDITION_SCHEMA"
      );
      assertExact(parseUtc(db.observed_at_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP"), collected, "CORRECTIVE_PRECONDITION_WINDOW", "db observed");
      validateDatabaseReadonly(db);
      validateSafety(evidence.safety);
      if (!Array.isArray(evidence.visibility_limitations) || evidence.visibility_limitations.length < 1) {
        throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitations");
      }
      const limitationText = evidence.visibility_limitations.join("\n");
      if (!/pins.*unpublished/i.test(limitationText)) {
        throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitations must mention unpublished pins");
      }
      for (const line of evidence.visibility_limitations) {
        if (typeof line !== "string" || !line.trim()) throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitation");
      }
      assertSanitized(JSON.stringify(evidence));
      return { protocol: PROTOCOL, apply_authorized: false };
    }
    function resolveContractCommit(seal, options = {}) {
      if (seal.source_commit != null && String(seal.source_commit).length) {
        return String(seal.source_commit).toLowerCase();
      }
      const fromOptions = options.executableCommit || options.expected?.authorized_executable_commit || null;
      if (!fromOptions || !HEX40.test(String(fromOptions).toLowerCase())) {
        throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "source_commit unresolved");
      }
      return String(fromOptions).toLowerCase();
    }
    function verifyCorrectivePreconditionContractSeal(auth, cwd, options = {}) {
      const seal = auth && auth.precondition_evidence_contract;
      if (!seal || seal.path !== CONTRACT_PATH) {
        throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_UNSEALED", "contract seal missing");
      }
      const pub = auth.precondition_publication || {};
      if (pub.status !== "PUBLISHED") {
        return { path: CONTRACT_PATH, skipped_blob_load: true };
      }
      const commit = resolveContractCommit(seal, options);
      const loaded = loadAndVerifyGitBlob({
        commit,
        path: CONTRACT_PATH,
        expectedOid: seal.oid,
        expectedSha256: seal.sha256,
        expectedBytes: seal.bytes,
        cwd
      });
      assertTrailingLf(loaded.buffer);
      const contract = JSON.parse(loaded.buffer.toString("utf8"));
      assertExact(contract.protocol, PROTOCOL, "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "protocol");
      assertExact(contract.publication_status, "UNPUBLISHED", "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "status");
      assertExact(
        contract.bindings.authorized_executable_commit,
        "from_production_collection_authorization_record",
        "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH",
        "authorized_executable_commit"
      );
      assertExact(contract.bindings.history_count, HISTORY_COUNT, "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "history");
      return loaded;
    }
    function preconditionPinsUnpublished(auth) {
      const pub = auth && auth.precondition_publication ? auth.precondition_publication : {};
      return pub.status !== "PUBLISHED" || pub.evidence_sha256 == null || pub.evidence_blob_oid == null || pub.evidence_bytes == null || pub.evidence_source_commit == null || pub.evidence_path == null;
    }
    function assertCorrectivePreconditionEvidencePublished(inputs = {}) {
      assertNoOverride(inputs);
      const auth = inputs.auth;
      if (!auth || typeof auth !== "object") throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "auth");
      if (preconditionPinsUnpublished(auth)) {
        throw blocked(
          "CORRECTIVE_PRECONDITION_PINS_UNPUBLISHED",
          "precondition publication is not PUBLISHED; gate stops before DB"
        );
      }
      const pub = auth.precondition_publication;
      const expected = (inputs.expected && inputs.expected.authorized_executable_commit && inputs.expected.authorization_publication_commit && inputs.expected.authorization_publication_blob_oid ? {
        authorized_executable_commit: String(inputs.expected.authorized_executable_commit).toLowerCase(),
        authorization_publication_commit: String(
          inputs.expected.authorization_publication_commit
        ).toLowerCase(),
        authorization_publication_blob_oid: String(
          inputs.expected.authorization_publication_blob_oid
        ).toLowerCase()
      } : null) || expectedAuthorityFromPublication(pub);
      if (!expected) {
        throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_EXPECTED", "expected authority pins required");
      }
      verifyCorrectivePreconditionContractSeal(auth, inputs.cwd, {
        executableCommit: inputs.executableCommit || expected.authorized_executable_commit,
        expected
      });
      for (const [key, pattern] of Object.entries({
        evidence_source_commit: /^[0-9a-f]{40}$/,
        evidence_blob_oid: /^[0-9a-f]{40}$/,
        evidence_sha256: /^[0-9a-f]{64}$/
      })) {
        if (!pattern.test(String(pub[key] || ""))) {
          throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", `${key} is not published`);
        }
      }
      if (!Number.isInteger(pub.evidence_bytes) || pub.evidence_bytes <= 0) {
        throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", "evidence_bytes is invalid");
      }
      if (!HEX40.test(String(pub.authorized_executable_commit || "").toLowerCase()) || !HEX40.test(String(pub.authorization_publication_commit || "").toLowerCase()) || !HEX40.test(String(pub.authorization_publication_blob_oid || "").toLowerCase())) {
        throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", "collection-authority triad required");
      }
      let loaded;
      try {
        loaded = loadAndVerifyGitBlob({
          commit: pub.evidence_source_commit,
          path: pub.evidence_path,
          expectedOid: pub.evidence_blob_oid,
          expectedSha256: pub.evidence_sha256,
          expectedBytes: pub.evidence_bytes,
          cwd: inputs.cwd
        });
      } catch (err) {
        if (err.code === "GIT_BLOB_LOAD_FAILED" || err.code === "BLOCKED_PIN_MISMATCH") throw err;
        throw blocked(err.code || "GIT_BLOB_LOAD_FAILED", err.message);
      }
      assertTrailingLf(loaded.buffer);
      const evidence = JSON.parse(loaded.buffer.toString("utf8"));
      validateCorrectivePreconditionEvidence(evidence, { now: inputs.now, expected });
      return {
        protocol: PROTOCOL,
        sha256: loaded.sha256,
        oid: loaded.oid,
        bytes: loaded.bytes,
        apply_authorized: false,
        productionContact: false
      };
    }
    module2.exports = {
      PROTOCOL,
      CONTRACT_PATH,
      REJECTED_STALE_COLLECTION_TIP_DBDCE968,
      HISTORY_COUNT,
      CORRECTIVE_VERSION,
      WEBHOOK_STATUSES,
      TABLE_PRIVILEGES,
      EXECUTE_ROLES,
      DISPOSABLE_VALIDATOR,
      assertTrailingLf,
      expectedAuthority,
      expectedAuthorityFromPublication,
      validateCorrectivePreconditionEvidence,
      validateDatabaseReadonly,
      validatePrivilegeMatrix,
      validateSafety,
      assertCorrectivePreconditionEvidencePublished,
      verifyCorrectivePreconditionContractSeal
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-pre-apply-gates.js
var require_ra_pro_accounting_automation_corrective_pre_apply_gates = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-pre-apply-gates.js"(exports2, module2) {
    "use strict";
    var { loadAndVerifyGitBlob } = require_git_blob_authority();
    var { assertAutomationGate } = require_ra_pro_accounting_automation_corrective_evidence_schema();
    var {
      validateDatabaseReadonly,
      validateSafety,
      assertTrailingLf,
      HISTORY_COUNT,
      REJECTED_STALE_COLLECTION_TIP_DBDCE968
    } = require_ra_pro_accounting_automation_corrective_precondition_gates();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1";
    var CONTRACT_PATH = "docs/security/ra-pro-accounting-automation-corrective-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
    var WINDOW_MS = 24 * 60 * 60 * 1e3;
    var PRECONDITION_PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
    var SUBSTITUTES = /* @__PURE__ */ new Set([
      PRECONDITION_PROTOCOL,
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1"
    ]);
    var SOURCE_CHANNELS = /* @__PURE__ */ new Set([
      "fresh_read_only_supabase_select",
      "synthetic_disposable_fixture"
    ]);
    var DISPOSABLE_VALIDATOR_PRE_APPLY = "PASS_CORRECTIVE_PRE_APPLY_LIVE_VALIDATION";
    var AUTHORIZATION_KEYS = [
      "pr_number",
      "scope",
      "authorized_executable_commit",
      "authorization_publication_commit",
      "authorization_publication_blob_oid",
      "committed_pre_apply_pins",
      "disposable_pin_scope"
    ];
    var FORBIDDEN_AUTHORITY_KEYS = ["tooling_reviewed_tip", "pr_head", "collection_pr_head"];
    var HEX40 = /^[0-9a-f]{40}$/;
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "pre_apply_live_evidence";
      return error;
    }
    function assertExact(value, expected, code, label) {
      if (value !== expected) throw blocked(code, `${label} mismatch`);
    }
    function assertKeys(obj, keys, code) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
      const got = Object.keys(obj);
      if (got.length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
        throw blocked(code, "schema keys");
      }
    }
    function assertRequiredKeys(obj, keys, code) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
      if (keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
        throw blocked(code, "schema keys");
      }
    }
    function parseUtc(value, code) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
        throw blocked(code, "timestamp");
      }
      const ms = Date.parse(value);
      if (!Number.isFinite(ms)) throw blocked(code, "timestamp");
      return ms;
    }
    function resolveNow(options = {}) {
      if (options.now == null) return Date.now();
      if (options.now instanceof Date) return options.now.getTime();
      return parseUtc(String(options.now), "CORRECTIVE_PRE_APPLY_TIMESTAMP");
    }
    function assertSanitized(text) {
      if (/postgres(?:ql)?:\/\//i.test(text) || /sk_[a-z]+_/i.test(text) || text.includes("BEGIN CERTIFICATE") || text.includes("BEGIN RSA") || /supabase\.co/i.test(text) || /https?:\/\//i.test(text) || text.includes("@") || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) {
        throw blocked("CORRECTIVE_PRE_APPLY_SANITIZATION", "forbidden material");
      }
    }
    function assertNoOverride(inputs = {}) {
      const env = inputs.env || {};
      if (inputs.preApplyEvidencePath) {
        throw blocked("CORRECTIVE_PRE_APPLY_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
      }
      for (const key of [
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_PATH",
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_SHA256"
      ]) {
        if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
          throw blocked("CORRECTIVE_PRE_APPLY_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function expectedAuthorityFromPublication(pub = {}) {
      const e = {
        authorized_executable_commit: pub.authorized_executable_commit,
        authorization_publication_commit: pub.authorization_publication_commit,
        authorization_publication_blob_oid: pub.authorization_publication_blob_oid
      };
      if (!HEX40.test(String(e.authorized_executable_commit || "").toLowerCase()) || !HEX40.test(String(e.authorization_publication_commit || "").toLowerCase()) || !HEX40.test(String(e.authorization_publication_blob_oid || "").toLowerCase())) {
        return null;
      }
      return {
        authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
        authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
        authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase()
      };
    }
    function expectedAuthority(options = {}) {
      const e = options.expected || {};
      if (e.authorized_executable_commit && e.authorization_publication_commit && e.authorization_publication_blob_oid) {
        return {
          authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
          authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
          authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase()
        };
      }
      const fromPub = expectedAuthorityFromPublication(options.publication || {});
      if (fromPub) return fromPub;
      throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_EXPECTED", "expected authority pins required");
    }
    function assertAuthorityNotStale(authz) {
      for (const key of [
        "authorized_executable_commit",
        "authorization_publication_commit",
        "authorization_publication_blob_oid"
      ]) {
        if (String(authz[key] || "").toLowerCase() === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
          throw blocked("CORRECTIVE_PRE_APPLY_REJECTED_STALE_TIP", key);
        }
      }
    }
    function assertAuthorizationAuthority(authz, options = {}) {
      for (const key of FORBIDDEN_AUTHORITY_KEYS) {
        if (authz && Object.prototype.hasOwnProperty.call(authz, key)) {
          throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_FORBIDDEN", key);
        }
      }
      assertKeys(authz, AUTHORIZATION_KEYS, "CORRECTIVE_PRE_APPLY_SCHEMA");
      void options.evidence?.attestations?.collection_tooling_tip;
      void options.evidence?.attestations?.tooling_reviewed_tip;
      assertExact(authz.pr_number, 324, "CORRECTIVE_PRE_APPLY_SCHEMA", "pr");
      assertExact(
        authz.scope,
        "read_only_production_corrective_pre_apply_live_collection",
        "CORRECTIVE_PRE_APPLY_SCHEMA",
        "scope"
      );
      assertExact(authz.committed_pre_apply_pins, "UNPUBLISHED", "CORRECTIVE_PRE_APPLY_CONTRADICTION", "pins");
      assertExact(authz.disposable_pin_scope, "in_memory_file_sha_only", "CORRECTIVE_PRE_APPLY_SCHEMA", "pin scope");
      assertAuthorityNotStale(authz);
      const expected = expectedAuthority(options);
      for (const key of [
        "authorized_executable_commit",
        "authorization_publication_commit",
        "authorization_publication_blob_oid"
      ]) {
        const value = String(authz[key] || "").toLowerCase();
        if (!HEX40.test(value)) {
          throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_SHAPE", key);
        }
        assertExact(
          value,
          String(expected[key]).toLowerCase(),
          "CORRECTIVE_PRE_APPLY_AUTHORITY_MISMATCH",
          key
        );
      }
    }
    function resolveContractCommit(seal, options = {}) {
      if (seal.source_commit != null && String(seal.source_commit).trim() !== "") {
        return String(seal.source_commit).toLowerCase();
      }
      const fromOptions = options.executableCommit || options.expected?.authorized_executable_commit || null;
      if (!fromOptions || !HEX40.test(String(fromOptions).toLowerCase())) {
        throw blocked(
          "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH",
          "source_commit null requires executableCommit or expected.authorized_executable_commit"
        );
      }
      return String(fromOptions).toLowerCase();
    }
    function validateCorrectivePreApplyLiveEvidence(evidence, options = {}) {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
        throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "evidence object");
      }
      if (SUBSTITUTES.has(evidence.protocol)) {
        throw blocked("CORRECTIVE_PRE_APPLY_SUBSTITUTION_FORBIDDEN", evidence.protocol);
      }
      assertRequiredKeys(
        evidence,
        [
          "protocol",
          "schema_version",
          "source_channel_classification",
          "collection_started_at_utc",
          "collection_ended_at_utc",
          "valid_from_utc",
          "valid_until_utc",
          "authorization",
          "automation_gate",
          "database_readonly",
          "safety",
          "visibility_limitations",
          "validator_result"
        ],
        "CORRECTIVE_PRE_APPLY_SCHEMA"
      );
      assertExact(evidence.protocol, PROTOCOL, "CORRECTIVE_PRE_APPLY_PROTOCOL_MISMATCH", "protocol");
      assertExact(evidence.schema_version, 3, "CORRECTIVE_PRE_APPLY_SCHEMA", "schema_version");
      if (!SOURCE_CHANNELS.has(evidence.source_channel_classification)) {
        throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "source channel");
      }
      assertExact(evidence.validator_result, DISPOSABLE_VALIDATOR_PRE_APPLY, "CORRECTIVE_PRE_APPLY_SCHEMA", "validator");
      const from = parseUtc(evidence.valid_from_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
      const until = parseUtc(evidence.valid_until_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
      const started = parseUtc(evidence.collection_started_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
      const ended = parseUtc(evidence.collection_ended_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
      if (until - from !== WINDOW_MS) throw blocked("CORRECTIVE_PRE_APPLY_WINDOW", "window must be 24h");
      if (started !== from || ended < started || ended >= until) {
        throw blocked("CORRECTIVE_PRE_APPLY_WINDOW", "collection outside validity");
      }
      const now = resolveNow(options);
      if (now < from) throw blocked("CORRECTIVE_PRE_APPLY_NOT_YET_VALID", "future start");
      if (now >= until) throw blocked("CORRECTIVE_PRE_APPLY_EXPIRED", "expired");
      assertAuthorizationAuthority(evidence.authorization, { ...options, evidence });
      const gate = evidence.automation_gate;
      assertAutomationGate(gate, "CORRECTIVE_PRE_APPLY");
      const db = evidence.database_readonly;
      assertKeys(
        db,
        [
          "project_ref",
          "observed_at_utc",
          "history_count",
          "original_committed_migrations",
          "corrective_version",
          "corrective_version_count",
          "privilege_surfaces",
          "objects",
          "linked_firms_count",
          "authorizing_inventory",
          "webhook_non_terminal_count",
          "webhook_non_terminal_statuses",
          "consumed_dual_attempt_id"
        ],
        "CORRECTIVE_PRE_APPLY_SCHEMA"
      );
      assertExact(parseUtc(db.observed_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP"), started, "CORRECTIVE_PRE_APPLY_WINDOW", "db observed");
      validateDatabaseReadonly(db);
      validateSafety(evidence.safety);
      if (!Array.isArray(evidence.visibility_limitations) || evidence.visibility_limitations.length < 1) {
        throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitations");
      }
      const limitationText = evidence.visibility_limitations.join("\n");
      if (!/pins.*unpublished/i.test(limitationText)) {
        throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitations must mention unpublished pins");
      }
      for (const line of evidence.visibility_limitations) {
        if (typeof line !== "string" || !line.trim()) throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitation");
      }
      assertSanitized(JSON.stringify(evidence));
      return { protocol: PROTOCOL, apply_authorized: false };
    }
    function verifyCorrectivePreApplyContractSeal(auth, cwd, options = {}) {
      const seal = auth && auth.pre_apply_live_evidence_contract;
      if (!seal || seal.path !== CONTRACT_PATH) {
        throw blocked("CORRECTIVE_PRE_APPLY_CONTRACT_UNSEALED", "contract seal missing");
      }
      const pub = auth.pre_apply_live_publication || {};
      if (pub.status !== "PUBLISHED") {
        return { path: CONTRACT_PATH, skipped_blob_load: true };
      }
      const commit = resolveContractCommit(seal, options);
      const loaded = loadAndVerifyGitBlob({
        commit,
        path: CONTRACT_PATH,
        expectedOid: seal.oid,
        expectedSha256: seal.sha256,
        expectedBytes: seal.bytes,
        cwd
      });
      assertTrailingLf(loaded.buffer);
      const contract = JSON.parse(loaded.buffer.toString("utf8"));
      assertExact(contract.protocol, PROTOCOL, "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "protocol");
      assertExact(contract.publication_status, "UNPUBLISHED", "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "status");
      assertExact(
        contract.bindings.authorized_executable_commit,
        "from_production_collection_authorization_record",
        "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH",
        "authorized_executable_commit"
      );
      assertExact(contract.bindings.history_count, HISTORY_COUNT, "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "history");
      return loaded;
    }
    function preApplyPinsUnpublished(auth) {
      const pub = auth && auth.publication ? auth.publication : {};
      const pre = auth && auth.pre_apply_live_publication ? auth.pre_apply_live_publication : {};
      return pub.status === "UNPUBLISHED" || pub.required_pre_apply_live_evidence_sha256 == null || pub.required_pre_apply_live_evidence_oid == null || pub.required_pre_apply_live_evidence_bytes == null || pre.status !== "PUBLISHED" || pre.evidence_sha256 == null || pre.evidence_blob_oid == null || pre.evidence_bytes == null || pre.evidence_source_commit == null || pre.evidence_path == null;
    }
    function assertCorrectivePreApplyLiveEvidencePublished(inputs = {}) {
      assertNoOverride(inputs);
      const auth = inputs.auth;
      if (!auth || typeof auth !== "object") throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "auth");
      if (preApplyPinsUnpublished(auth)) {
        throw blocked(
          "CORRECTIVE_PRE_APPLY_PINS_UNPUBLISHED",
          "pre-apply pins are null/UNPUBLISHED; apply remains unreachable"
        );
      }
      const pub = auth.publication;
      const pre = auth.pre_apply_live_publication;
      const expected = (inputs.expected && inputs.expected.authorized_executable_commit && inputs.expected.authorization_publication_commit && inputs.expected.authorization_publication_blob_oid ? {
        authorized_executable_commit: String(inputs.expected.authorized_executable_commit).toLowerCase(),
        authorization_publication_commit: String(
          inputs.expected.authorization_publication_commit
        ).toLowerCase(),
        authorization_publication_blob_oid: String(
          inputs.expected.authorization_publication_blob_oid
        ).toLowerCase()
      } : null) || expectedAuthorityFromPublication(pre);
      if (!expected) {
        throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_EXPECTED", "expected authority pins required");
      }
      verifyCorrectivePreApplyContractSeal(auth, inputs.cwd, {
        executableCommit: inputs.executableCommit || expected.authorized_executable_commit,
        expected
      });
      if (pub.required_pre_apply_live_evidence_sha256 !== pre.evidence_sha256 || pub.required_pre_apply_live_evidence_oid !== pre.evidence_blob_oid || pub.required_pre_apply_live_evidence_bytes !== pre.evidence_bytes) {
        throw blocked("CORRECTIVE_PRE_APPLY_PIN_CONTRADICTION", "authorization pins disagree");
      }
      if (pre.apply_authorized === true) {
        throw blocked("AUTHORIZATION_PINS_UNPUBLISHED", "pre_apply apply_authorized must remain false");
      }
      if (!HEX40.test(String(pre.authorized_executable_commit || "").toLowerCase()) || !HEX40.test(String(pre.authorization_publication_commit || "").toLowerCase()) || !HEX40.test(String(pre.authorization_publication_blob_oid || "").toLowerCase())) {
        throw blocked("CORRECTIVE_PRE_APPLY_PINS_INVALID", "collection-authority triad required");
      }
      let loaded;
      try {
        loaded = loadAndVerifyGitBlob({
          commit: pre.evidence_source_commit,
          path: pre.evidence_path,
          expectedOid: pre.evidence_blob_oid,
          expectedSha256: pre.evidence_sha256,
          expectedBytes: pre.evidence_bytes,
          cwd: inputs.cwd
        });
      } catch (err) {
        if (err.code === "GIT_BLOB_LOAD_FAILED" || err.code === "BLOCKED_PIN_MISMATCH") throw err;
        throw blocked(err.code || "GIT_BLOB_LOAD_FAILED", err.message);
      }
      assertTrailingLf(loaded.buffer);
      const evidence = JSON.parse(loaded.buffer.toString("utf8"));
      validateCorrectivePreApplyLiveEvidence(evidence, { now: inputs.now, expected });
      return {
        sha256: loaded.sha256,
        oid: loaded.oid,
        bytes: loaded.bytes,
        apply_authorized: false,
        productionContact: false
      };
    }
    module2.exports = {
      PROTOCOL,
      CONTRACT_PATH,
      REJECTED_STALE_COLLECTION_TIP_DBDCE968,
      HISTORY_COUNT,
      DISPOSABLE_VALIDATOR: DISPOSABLE_VALIDATOR_PRE_APPLY,
      expectedAuthority,
      expectedAuthorityFromPublication,
      validateCorrectivePreApplyLiveEvidence,
      assertCorrectivePreApplyLiveEvidencePublished,
      verifyCorrectivePreApplyContractSeal
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-schema-probes.js
var require_ra_pro_accounting_automation_corrective_schema_probes = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-schema-probes.js"(exports2, module2) {
    "use strict";
    var {
      MIGRATIONS,
      ORIGINAL_COMMITTED_MIGRATIONS,
      POST_HISTORY_COUNT,
      PRIOR_HISTORY_COUNT,
      FEATURE_FLAG_ENV,
      CORRECTIVE_TABLES
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var { sha256Buffer } = require_git_blob_authority();
    var TARGET_FUNCTIONS = Object.freeze([
      "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)",
      "public.persist_ra_pro_month_end_review_package(jsonb)"
    ]);
    var TARGET_POLICIES = Object.freeze([
      "ra_pro_weekly_runs_service_role_insert",
      "ra_pro_weekly_runs_service_role_select",
      "ra_pro_weekly_runs_firm_member_select",
      "ra_pro_weekly_findings_service_role_insert",
      "ra_pro_weekly_findings_service_role_select",
      "ra_pro_weekly_findings_firm_member_select",
      "ra_pro_month_end_service_insert",
      "ra_pro_month_end_service_select",
      "ra_pro_month_end_member_select"
    ]);
    var POST_COMMIT_POLICIES = Object.freeze([
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_insert", "a", "service_role"],
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_select", "r", "service_role"],
      ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_firm_member_select", "r", "authenticated"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_insert", "a", "service_role"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_select", "r", "service_role"],
      ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_firm_member_select", "r", "authenticated"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_insert", "a", "service_role"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_select", "r", "service_role"],
      ["ra_pro_month_end_review_packages", "ra_pro_month_end_member_select", "r", "authenticated"]
    ]);
    var SENTINELS = Object.freeze([
      ["invoices", "public.invoices"],
      ["bills", "public.bills"],
      ["payments", "public.payments"],
      ["journal_entries", "public.journal_entries"],
      ["provider_writes", "public.provider_write_attempts"]
    ]);
    var VERIFICATION_STATEMENT_TIMEOUT = "30s";
    var SVC_EFFECTIVE_PRIVILEGES = Object.freeze([
      ["SELECT", true],
      ["INSERT", true],
      ["UPDATE", false],
      ["DELETE", false],
      ["TRUNCATE", false],
      ["REFERENCES", false],
      ["TRIGGER", false]
    ]);
    var AUTH_EFFECTIVE_PRIVILEGES = Object.freeze([
      ["SELECT", true],
      ["INSERT", false],
      ["UPDATE", false],
      ["DELETE", false],
      ["TRUNCATE", false],
      ["REFERENCES", false],
      ["TRIGGER", false]
    ]);
    var ANON_EFFECTIVE_PRIVILEGES = Object.freeze([
      ["SELECT", false],
      ["INSERT", false],
      ["UPDATE", false],
      ["DELETE", false],
      ["TRUNCATE", false],
      ["REFERENCES", false],
      ["TRIGGER", false]
    ]);
    var ALLOWED_DIRECT_ACL = Object.freeze({
      service_role: Object.freeze(/* @__PURE__ */ new Set(["SELECT", "INSERT"])),
      authenticated: Object.freeze(/* @__PURE__ */ new Set(["SELECT"])),
      anon: Object.freeze(/* @__PURE__ */ new Set())
    });
    function probeError(code) {
      const error = new Error(code);
      error.code = code;
      return error;
    }
    function sanitizeCheckToken(value) {
      const cleaned = String(value || "").replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 64);
      return cleaned || "unknown";
    }
    function pushDiffering(differing, entry) {
      differing.push({
        role: entry.role,
        object: entry.object,
        privilege: entry.privilege,
        expected: entry.expected,
        observed: entry.observed,
        source: entry.source || "effective",
        check_code: entry.check_code || null
      });
    }
    async function getServerVersionNum(client) {
      const { rows } = await client.query(
        `SELECT current_setting('server_version_num')::int AS n`
      );
      return rows[0].n;
    }
    async function tablePrivilegeMatrix(client) {
      const versionNum = await getServerVersionNum(client);
      const maintainSupported = versionNum >= 17e4;
      const rows = [];
      for (const table of CORRECTIVE_TABLES) {
        const fq = `public.${table}`;
        const { rows: r } = await client.query(
          `SELECT
         has_table_privilege('service_role', $1, 'SELECT') AS svc_select,
         has_table_privilege('service_role', $1, 'INSERT') AS svc_insert,
         has_table_privilege('service_role', $1, 'UPDATE') AS svc_update,
         has_table_privilege('service_role', $1, 'DELETE') AS svc_delete,
         has_table_privilege('service_role', $1, 'TRUNCATE') AS svc_truncate,
         has_table_privilege('service_role', $1, 'REFERENCES') AS svc_references,
         has_table_privilege('service_role', $1, 'TRIGGER') AS svc_trigger,
         has_table_privilege('authenticated', $1, 'SELECT') AS auth_select,
         has_table_privilege('authenticated', $1, 'INSERT') AS auth_insert,
         has_table_privilege('authenticated', $1, 'UPDATE') AS auth_update,
         has_table_privilege('authenticated', $1, 'DELETE') AS auth_delete,
         has_table_privilege('authenticated', $1, 'TRUNCATE') AS auth_truncate,
         has_table_privilege('authenticated', $1, 'REFERENCES') AS auth_references,
         has_table_privilege('authenticated', $1, 'TRIGGER') AS auth_trigger,
         has_table_privilege('anon', $1, 'SELECT') AS anon_select,
         has_table_privilege('anon', $1, 'INSERT') AS anon_insert,
         has_table_privilege('anon', $1, 'UPDATE') AS anon_update,
         has_table_privilege('anon', $1, 'DELETE') AS anon_delete,
         has_table_privilege('anon', $1, 'TRUNCATE') AS anon_truncate,
         has_table_privilege('anon', $1, 'REFERENCES') AS anon_references,
         has_table_privilege('anon', $1, 'TRIGGER') AS anon_trigger`,
          [fq]
        );
        let svcMaintain = null;
        let authMaintain = null;
        let anonMaintain = null;
        let maintainStatus = "not_supported";
        if (maintainSupported) {
          const m = await client.query(
            `SELECT
           has_table_privilege('service_role', $1, 'MAINTAIN') AS svc_maintain,
           has_table_privilege('authenticated', $1, 'MAINTAIN') AS auth_maintain,
           has_table_privilege('anon', $1, 'MAINTAIN') AS anon_maintain`,
            [fq]
          );
          svcMaintain = m.rows[0].svc_maintain === true;
          authMaintain = m.rows[0].auth_maintain === true;
          anonMaintain = m.rows[0].anon_maintain === true;
          maintainStatus = "checked";
        }
        rows.push({
          table,
          maintain_status: maintainStatus,
          server_version_num: versionNum,
          ...r[0],
          svc_maintain: svcMaintain,
          auth_maintain: authMaintain,
          anon_maintain: anonMaintain
        });
      }
      return { rows, maintainSupported, versionNum };
    }
    async function catalogAclRows(client) {
      const { rows } = await client.query(
        `SELECT
       c.relname AS table_name,
       n.nspname AS schema_name,
       pg_get_userbyid(c.relowner) AS owner_name,
       CASE
         WHEN a.grantee = 0 THEN 'PUBLIC'
         ELSE COALESCE(r.rolname, a.grantee::text)
       END AS grantee,
       a.privilege_type,
       a.grantee AS grantee_oid
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a ON true
     LEFT JOIN pg_roles r ON r.oid = a.grantee
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname, grantee, a.privilege_type`,
        [CORRECTIVE_TABLES]
      );
      return rows;
    }
    async function recursiveGrantedRoles(client, roleName) {
      const { rows } = await client.query(
        `WITH RECURSIVE granted AS (
       SELECT r.oid AS member_oid, g.oid AS role_oid, g.rolname
       FROM pg_roles r
       JOIN pg_auth_members m ON m.member = r.oid
       JOIN pg_roles g ON g.oid = m.roleid
       WHERE r.rolname = $1
       UNION
       SELECT granted.member_oid, g.oid, g.rolname
       FROM granted
       JOIN pg_auth_members m ON m.member = granted.role_oid
       JOIN pg_roles g ON g.oid = m.roleid
     )
     SELECT DISTINCT rolname FROM granted ORDER BY rolname`,
        [roleName]
      );
      return rows.map((row) => row.rolname);
    }
    async function verifyServiceRoleCatalogGrants(client) {
      const differing = [];
      const checkCodes = [];
      const { rows: matrix, maintainSupported, versionNum } = await tablePrivilegeMatrix(client);
      for (const row of matrix) {
        const object = `public.${row.table}`;
        const roleSpecs = [
          ["service_role", SVC_EFFECTIVE_PRIVILEGES, {
            SELECT: row.svc_select,
            INSERT: row.svc_insert,
            UPDATE: row.svc_update,
            DELETE: row.svc_delete,
            TRUNCATE: row.svc_truncate,
            REFERENCES: row.svc_references,
            TRIGGER: row.svc_trigger,
            MAINTAIN: row.svc_maintain
          }],
          ["authenticated", AUTH_EFFECTIVE_PRIVILEGES, {
            SELECT: row.auth_select,
            INSERT: row.auth_insert,
            UPDATE: row.auth_update,
            DELETE: row.auth_delete,
            TRUNCATE: row.auth_truncate,
            REFERENCES: row.auth_references,
            TRIGGER: row.auth_trigger,
            MAINTAIN: row.auth_maintain
          }],
          ["anon", ANON_EFFECTIVE_PRIVILEGES, {
            SELECT: row.anon_select,
            INSERT: row.anon_insert,
            UPDATE: row.anon_update,
            DELETE: row.anon_delete,
            TRUNCATE: row.anon_truncate,
            REFERENCES: row.anon_references,
            TRIGGER: row.anon_trigger,
            MAINTAIN: row.anon_maintain
          }]
        ];
        for (const [role, specs, observedMap] of roleSpecs) {
          for (const [privilege, expected] of specs) {
            const observed = Boolean(observedMap[privilege]);
            if (observed !== expected) {
              const code = `effective:${sanitizeCheckToken(role)}:${sanitizeCheckToken(privilege)}`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role,
                object,
                privilege,
                expected,
                observed,
                source: "effective",
                check_code: code
              });
            }
          }
          if (maintainSupported) {
            const expectedMaintain = false;
            const observedMaintain = Boolean(observedMap.MAINTAIN);
            if (observedMaintain !== expectedMaintain) {
              const code = `effective:${sanitizeCheckToken(role)}:MAINTAIN`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role,
                object,
                privilege: "MAINTAIN",
                expected: expectedMaintain,
                observed: observedMaintain,
                source: "effective",
                check_code: code
              });
            }
          }
        }
      }
      if (!maintainSupported) {
        checkCodes.push("maintain:not_supported");
      }
      const aclRows = await catalogAclRows(client);
      const byTable = /* @__PURE__ */ new Map();
      for (const table of CORRECTIVE_TABLES) byTable.set(table, []);
      for (const row of aclRows) {
        if (!byTable.has(row.table_name)) continue;
        byTable.get(row.table_name).push(row);
      }
      for (const table of CORRECTIVE_TABLES) {
        const object = `public.${table}`;
        const entries = byTable.get(table) || [];
        const owners = new Set(entries.map((e) => e.owner_name).filter(Boolean));
        const ownerName = owners.values().next().value || "postgres";
        const privByGrantee = /* @__PURE__ */ new Map();
        for (const entry of entries) {
          if (!entry.grantee || !entry.privilege_type) continue;
          if (!privByGrantee.has(entry.grantee)) privByGrantee.set(entry.grantee, /* @__PURE__ */ new Set());
          privByGrantee.get(entry.grantee).add(entry.privilege_type);
        }
        for (const [grantee, privs] of privByGrantee.entries()) {
          if (grantee === ownerName) continue;
          if (grantee === "PUBLIC") {
            for (const privilege of privs) {
              const code = `catalog:PUBLIC:${sanitizeCheckToken(privilege)}`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role: "PUBLIC",
                object,
                privilege,
                expected: false,
                observed: true,
                source: "catalog",
                check_code: code
              });
            }
            continue;
          }
          const allowed = ALLOWED_DIRECT_ACL[grantee];
          if (!allowed) {
            for (const privilege of privs) {
              const code = `catalog:unexpected_grantee:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role: grantee,
                object,
                privilege,
                expected: false,
                observed: true,
                source: "catalog",
                check_code: code
              });
            }
            continue;
          }
          for (const privilege of privs) {
            if (!allowed.has(privilege)) {
              const code = `catalog:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role: grantee,
                object,
                privilege,
                expected: false,
                observed: true,
                source: "catalog",
                check_code: code
              });
            }
          }
          for (const privilege of allowed) {
            if (!privs.has(privilege)) {
              const code = `catalog_missing:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
              checkCodes.push(code);
              pushDiffering(differing, {
                role: grantee,
                object,
                privilege,
                expected: true,
                observed: false,
                source: "catalog",
                check_code: code
              });
            }
          }
        }
        for (const [role, allowed] of Object.entries(ALLOWED_DIRECT_ACL)) {
          const privs = privByGrantee.get(role) || /* @__PURE__ */ new Set();
          for (const privilege of allowed) {
            if (!privs.has(privilege)) {
              if (!privByGrantee.has(role)) {
                const code = `catalog_missing:${sanitizeCheckToken(role)}:${sanitizeCheckToken(privilege)}`;
                checkCodes.push(code);
                pushDiffering(differing, {
                  role,
                  object,
                  privilege,
                  expected: true,
                  observed: false,
                  source: "catalog",
                  check_code: code
                });
              }
            }
          }
        }
      }
      const subjectRoles = ["service_role", "authenticated", "anon"];
      const excessPrivs = ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
      if (maintainSupported) excessPrivs.push("MAINTAIN");
      for (const subject of subjectRoles) {
        const granted = await recursiveGrantedRoles(client, subject);
        for (const ancestor of granted) {
          if (subjectRoles.includes(ancestor) || ancestor === "postgres") continue;
          for (const table of CORRECTIVE_TABLES) {
            const fq = `public.${table}`;
            for (const privilege of excessPrivs) {
              const { rows } = await client.query(
                `SELECT has_table_privilege($1, $2, $3) AS ok`,
                [ancestor, fq, privilege]
              );
              if (rows[0].ok === true) {
                const { rows: sub } = await client.query(
                  `SELECT has_table_privilege($1, $2, $3) AS ok`,
                  [subject, fq, privilege]
                );
                if (sub[0].ok === true) {
                  const allowed = subject === "service_role" && (privilege === "SELECT" || privilege === "INSERT") || subject === "authenticated" && privilege === "SELECT";
                  if (!allowed) {
                    const code = `inherited:${sanitizeCheckToken(subject)}<=${sanitizeCheckToken(ancestor)}:${sanitizeCheckToken(privilege)}`;
                    checkCodes.push(code);
                    pushDiffering(differing, {
                      role: subject,
                      object: fq,
                      privilege,
                      expected: false,
                      observed: true,
                      source: "inherited",
                      check_code: code
                    });
                  }
                }
              }
            }
          }
        }
      }
      const execDiffering = [];
      const execExpect = [
        ["service_role", TARGET_FUNCTIONS[0], true],
        ["authenticated", TARGET_FUNCTIONS[0], false],
        ["anon", TARGET_FUNCTIONS[0], false],
        ["PUBLIC", TARGET_FUNCTIONS[0], false],
        ["service_role", TARGET_FUNCTIONS[1], true],
        ["authenticated", TARGET_FUNCTIONS[1], false],
        ["anon", TARGET_FUNCTIONS[1], false],
        ["PUBLIC", TARGET_FUNCTIONS[1], false]
      ];
      for (const [role, object, expected] of execExpect) {
        const { rows } = await client.query(
          role === "PUBLIC" ? `SELECT has_function_privilege(0, $1::regprocedure, 'EXECUTE') AS ok` : `SELECT has_function_privilege($1, $2::regprocedure, 'EXECUTE') AS ok`,
          role === "PUBLIC" ? [object] : [role, object]
        );
        const observed = rows[0].ok === true;
        if (observed !== expected) {
          execDiffering.push({
            role,
            object,
            privilege: "EXECUTE",
            expected,
            observed,
            source: "execute",
            check_code: `execute:${role}`
          });
        }
      }
      const tableDiffering = differing.filter((d) => d.privilege !== "EXECUTE");
      return {
        ok: tableDiffering.length === 0 && execDiffering.length === 0,
        differing_privileges: [...tableDiffering, ...execDiffering],
        grants_match: tableDiffering.length === 0,
        catalog_execute_ok: execDiffering.length === 0,
        check_codes: [...new Set(checkCodes)],
        maintain_supported: maintainSupported,
        server_version_num: versionNum,
        matrix
      };
    }
    async function verifyCatalogExecutePrivileges(client) {
      const grants = await verifyServiceRoleCatalogGrants(client);
      return {
        ok: grants.catalog_execute_ok,
        differing_privileges: grants.differing_privileges.filter((d) => d.privilege === "EXECUTE")
      };
    }
    async function collectCorrectiveDryRunProbes(client, options = {}) {
      const env = options.env || process.env;
      const history = await client.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`
      );
      const historyCount = history.rows[0].c;
      const originalVersions = ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.version);
      const versionRows = await client.query(
        `SELECT version, count(*)::int AS c, statements
     FROM supabase_migrations.schema_migrations
     WHERE version = ANY($1::text[])
     GROUP BY version, statements`,
        [[...originalVersions, MIGRATIONS[0].version]]
      );
      const versionCounts = {};
      const digestMatch = {};
      for (const migration of ORIGINAL_COMMITTED_MIGRATIONS) {
        versionCounts[migration.version] = 0;
        digestMatch[migration.version] = false;
      }
      versionCounts[MIGRATIONS[0].version] = 0;
      for (const row of versionRows.rows) {
        versionCounts[row.version] = (versionCounts[row.version] || 0) + row.c;
        const original = ORIGINAL_COMMITTED_MIGRATIONS.find((m) => m.version === row.version);
        if (original) {
          const statements = row.statements || [];
          digestMatch[row.version] = statements.length === 1 && sha256Buffer(Buffer.from(statements[0], "utf8")) === original.sha256 && Buffer.byteLength(statements[0], "utf8") === original.bytes;
        }
      }
      const tables = await client.query(
        `SELECT c.relname, c.relrowsecurity, pg_get_userbyid(c.relowner) AS owner_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])`,
        [CORRECTIVE_TABLES]
      );
      const tableOk = tables.rows.length === CORRECTIVE_TABLES.length && tables.rows.every((r) => r.relrowsecurity === true && r.owner_name === "postgres");
      const policies = await client.query(
        `SELECT count(*)::int AS c FROM pg_policy pol WHERE pol.polname = ANY($1::text[])`,
        [TARGET_POLICIES]
      );
      const weeklyFn = await client.query(`SELECT to_regprocedure($1) IS NOT NULL AS ok`, [
        TARGET_FUNCTIONS[0]
      ]);
      const monthFn = await client.query(`SELECT to_regprocedure($1) IS NOT NULL AS ok`, [
        TARGET_FUNCTIONS[1]
      ]);
      let excessServiceRoleDml = false;
      if (tableOk) {
        const grantMatrix = await tablePrivilegeMatrix(client);
        excessServiceRoleDml = grantMatrix.rows.some(
          (row) => row.svc_update === true || row.svc_delete === true || row.svc_truncate === true || row.svc_references === true || row.svc_trigger === true || row.svc_maintain === true
        );
      }
      const originalsOnce = ORIGINAL_COMMITTED_MIGRATIONS.every((m) => versionCounts[m.version] === 1) && ORIGINAL_COMMITTED_MIGRATIONS.every((m) => digestMatch[m.version] === true);
      const correctiveAbsent = versionCounts[MIGRATIONS[0].version] === 0;
      const checks = {
        history_count: historyCount === PRIOR_HISTORY_COUNT,
        originals_present_once: originalsOnce,
        corrective_absent: correctiveAbsent,
        tables_rls_postgres: tableOk,
        policies_present: policies.rows[0].c === TARGET_POLICIES.length,
        functions_present: weeklyFn.rows[0].ok === true && monthFn.rows[0].ok === true
      };
      const failed = Object.entries(checks).filter(([, ok]) => ok !== true).map(([name]) => name);
      return {
        ok: failed.length === 0,
        failed,
        view: {
          read_only: true,
          history_count: historyCount,
          history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
          originals_present_once: originalsOnce,
          corrective_absent: correctiveAbsent,
          tables_rls_postgres: tableOk,
          policies_present: checks.policies_present,
          functions_present: checks.functions_present,
          excess_service_role_dml: excessServiceRoleDml,
          automation_enabled: env[FEATURE_FLAG_ENV] === "true",
          checks,
          failed_checks: failed
        }
      };
    }
    async function captureSentinelCounts(client) {
      const counts = {};
      for (const [name, relation] of SENTINELS) {
        const present = await client.query(`SELECT to_regclass($1) AS reg`, [relation]);
        if (!present.rows[0].reg) {
          counts[name] = null;
          continue;
        }
        const counted = await client.query(`SELECT count(*)::int AS c FROM ${relation}`);
        counts[name] = counted.rows[0].c;
      }
      return counts;
    }
    function sentinelStatus(before, after) {
      const status = {};
      let unchanged = true;
      for (const [name] of SENTINELS) {
        if (before[name] == null && after[name] == null) {
          status[name] = "absent";
          continue;
        }
        if (before[name] == null || after[name] == null || before[name] !== after[name]) {
          status[name] = "changed";
          unchanged = false;
          continue;
        }
        status[name] = "unchanged";
      }
      return { status, unchanged };
    }
    async function captureCorrectiveRowCounts(client) {
      const counts = {};
      for (const table of CORRECTIVE_TABLES) {
        const { rows } = await client.query(`SELECT count(*)::int AS c FROM public.${table}`);
        counts[table] = rows[0].c;
      }
      return counts;
    }
    async function probeIdempotentPersistenceWithFixtures(client) {
      const result = {
        ok: false,
        session_role_model: "set_role_not_jwt",
        service_role_rpc_sqlstate: null,
        idempotent_reuse_sqlstate: null,
        check_code: null,
        weekly_run_count: null,
        month_package_count: null
      };
      await client.query("SAVEPOINT probe_rpc");
      try {
        const firmId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
        const companyId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
        const clientId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
        const connectionId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
        const syncId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
        await client.query("INSERT INTO public.firms(id) VALUES ($1)", [firmId]);
        await client.query("INSERT INTO public.companies(id) VALUES ($1)", [companyId]);
        await client.query(
          "INSERT INTO public.firm_clients(id, firm_id, company_id) VALUES ($1, $2, $3)",
          [clientId, firmId, companyId]
        );
        await client.query("INSERT INTO public.accounting_connections(id) VALUES ($1)", [connectionId]);
        await client.query(
          "INSERT INTO public.accounting_syncs(id, connection_id) VALUES ($1, $2)",
          [syncId, connectionId]
        );
        const weekly = {
          firm_id: firmId,
          firm_client_id: clientId,
          company_id: companyId,
          accounting_sync_id: syncId,
          provider: "quickbooks",
          week_ending: "2026-09-20",
          status: "clear",
          finding_count: 0,
          summary: { review_only: true, provider_writes: false },
          idempotency_key: "c".repeat(64),
          completed_at: "2026-09-17T18:00:00Z"
        };
        const month = {
          firm_id: firmId,
          firm_client_id: clientId,
          company_id: companyId,
          accounting_sync_id: syncId,
          provider: "xero",
          period_end: "2026-08-31",
          status: "ready",
          review_package: { review_only: true, provider_writes: false },
          idempotency_key: "d".repeat(64),
          completed_at: "2026-09-17T18:00:00Z"
        };
        await client.query("SET LOCAL ROLE service_role");
        const weeklyFirst = await client.query(
          "SELECT run_id, reused FROM public.persist_ra_pro_weekly_completeness($1::jsonb, '[]'::jsonb)",
          [JSON.stringify(weekly)]
        );
        const weeklySecond = await client.query(
          "SELECT run_id, reused FROM public.persist_ra_pro_weekly_completeness($1::jsonb, '[]'::jsonb)",
          [JSON.stringify(weekly)]
        );
        const monthFirst = await client.query(
          "SELECT package_id, reused FROM public.persist_ra_pro_month_end_review_package($1::jsonb)",
          [JSON.stringify(month)]
        );
        const monthSecond = await client.query(
          "SELECT package_id, reused FROM public.persist_ra_pro_month_end_review_package($1::jsonb)",
          [JSON.stringify(month)]
        );
        const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM public.ra_pro_weekly_completeness_runs) AS runs,
        (SELECT count(*)::int FROM public.ra_pro_month_end_review_packages) AS packages
    `);
        await client.query("RESET ROLE");
        result.weekly_run_count = counts.rows[0].runs;
        result.month_package_count = counts.rows[0].packages;
        result.ok = weeklyFirst.rows[0].reused === false && weeklySecond.rows[0].reused === true && weeklyFirst.rows[0].run_id === weeklySecond.rows[0].run_id && monthFirst.rows[0].reused === false && monthSecond.rows[0].reused === true && monthFirst.rows[0].package_id === monthSecond.rows[0].package_id && counts.rows[0].runs === 1 && counts.rows[0].packages === 1;
        if (!result.ok) result.check_code = "IDEMPOTENT_REUSE_MISMATCH";
        await client.query("ROLLBACK TO SAVEPOINT probe_rpc");
        return result;
      } catch (err) {
        await client.query("ROLLBACK TO SAVEPOINT probe_rpc").catch(() => {
        });
        const sqlstate = err && err.code ? String(err.code) : "UNKNOWN";
        result.service_role_rpc_sqlstate = sqlstate;
        result.idempotent_reuse_sqlstate = sqlstate;
        result.check_code = sqlstate === "42501" ? "SERVICE_ROLE_RPC_PRIVILEGE_DENIED" : "SERVICE_ROLE_RPC_FAILED";
        result.ok = false;
        return result;
      }
    }
    async function verifyPostCorrective(client, options = {}) {
      const env = options.env || process.env;
      const packed = options.packed || [];
      const rowCountsBefore = options.rowCountsBefore || {};
      const failed = [];
      const view = {
        ok: false,
        history_count: null,
        version_counts: {},
        tables_present: false,
        functions_present: false,
        rls_enabled: false,
        policies_present: false,
        grants_match: false,
        service_role_execute_ok: false,
        service_role_rpc_ok: false,
        idempotent_reuse: false,
        service_role_rpc_sqlstate: null,
        idempotent_reuse_sqlstate: null,
        session_role_model: "set_role_not_jwt",
        differing_privileges: [],
        sentinel_unchanged: false,
        sentinels: {},
        row_counts_unchanged: false,
        automation_enabled: env[FEATURE_FLAG_ENV] === "true",
        verification_rows_rolled_back: false,
        failed_checks: failed
      };
      if (view.automation_enabled) failed.push("automation_enabled");
      await client.query("BEGIN");
      try {
        await client.query(`SET LOCAL statement_timeout = '${VERIFICATION_STATEMENT_TIMEOUT}'`);
        if (options.injectFailure === "verification_timeout") {
          await client.query("SET LOCAL statement_timeout = '1ms'");
          await client.query("SELECT pg_sleep(0.2)");
        }
        const history = await client.query(
          `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`
        );
        view.history_count = history.rows[0].c;
        if (view.history_count !== POST_HISTORY_COUNT) failed.push("history_count");
        for (const item of packed) {
          const stored = await client.query(
            `SELECT statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
            [item.migration.version]
          );
          view.version_counts[item.migration.version] = stored.rows.length;
          if (stored.rows.length !== 1) {
            failed.push(`version_once:${item.migration.version}`);
            continue;
          }
          const statements = stored.rows[0].statements || [];
          const digestOk = statements.length === 1 && sha256Buffer(Buffer.from(statements[0], "utf8")) === item.loaded.sha256 && Buffer.byteLength(statements[0], "utf8") === item.loaded.bytes;
          if (!digestOk) failed.push(`version_seal:${item.migration.version}`);
        }
        const tables = await client.query(
          `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])`,
          [CORRECTIVE_TABLES]
        );
        view.tables_present = tables.rows.length === CORRECTIVE_TABLES.length;
        view.rls_enabled = view.tables_present && tables.rows.every((row) => row.relrowsecurity === true);
        if (!view.tables_present) failed.push("tables_present");
        if (!view.rls_enabled) failed.push("rls_enabled");
        const functions = await client.query(`
      SELECT
        to_regprocedure('public.persist_ra_pro_weekly_completeness(jsonb,jsonb)') IS NOT NULL AS weekly_sig,
        to_regprocedure('public.persist_ra_pro_month_end_review_package(jsonb)') IS NOT NULL AS month_sig
    `);
        view.functions_present = functions.rows[0].weekly_sig === true && functions.rows[0].month_sig === true;
        if (!view.functions_present) failed.push("functions_present");
        const policies = await client.query(
          `SELECT c.relname, pol.polname, pol.polcmd, r.rolname
       FROM pg_policy pol
       JOIN pg_class c ON c.oid = pol.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_roles r ON r.oid = ANY (pol.polroles)
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
          [CORRECTIVE_TABLES]
        );
        const found = new Set(
          policies.rows.map((row) => `${row.relname}|${row.polname}|${row.polcmd}|${row.rolname}`)
        );
        view.policies_present = policies.rows.length >= POST_COMMIT_POLICIES.length && POST_COMMIT_POLICIES.every(
          ([table, name, cmd, role]) => found.has(`${table}|${name}|${cmd}|${role}`)
        );
        if (!view.policies_present) failed.push("policies_present");
        const grants = await verifyServiceRoleCatalogGrants(client);
        view.differing_privileges = grants.differing_privileges;
        view.grants_match = grants.grants_match;
        view.service_role_execute_ok = grants.catalog_execute_ok;
        view.grant_check_codes = grants.check_codes || [];
        view.maintain_supported = grants.maintain_supported === true;
        view.server_version_num = grants.server_version_num || null;
        if (!view.grants_match) failed.push("grants_match");
        if (!view.service_role_execute_ok) failed.push("service_role_execute");
        const rpcProbe = await probeIdempotentPersistenceWithFixtures(client);
        view.session_role_model = rpcProbe.session_role_model;
        view.service_role_rpc_sqlstate = rpcProbe.service_role_rpc_sqlstate;
        view.idempotent_reuse_sqlstate = rpcProbe.idempotent_reuse_sqlstate;
        view.idempotent_reuse = rpcProbe.ok === true;
        view.service_role_rpc_ok = rpcProbe.ok === true;
        if (!view.service_role_rpc_ok) failed.push("service_role_rpc");
        if (!view.idempotent_reuse) failed.push("idempotent_reuse");
        await client.query("ROLLBACK");
        view.verification_rows_rolled_back = true;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {
        });
        if (options.injectFailure === "verification_timeout" || err.code === "57014") {
          const timeout = probeError("VERIFICATION_TIMEOUT");
          timeout.verificationFailed = true;
          throw timeout;
        }
        const wrapped = probeError(err.code || "POST_COMMIT_VERIFICATION_FAILED");
        wrapped.verificationFailed = true;
        throw wrapped;
      }
      const after = await captureSentinelCounts(client);
      const sentinels = sentinelStatus(options.sentinelBefore || {}, after);
      view.sentinels = sentinels.status;
      view.sentinel_unchanged = sentinels.unchanged;
      if (!view.sentinel_unchanged) failed.push("sentinel_unchanged");
      const rowCountsAfter = await captureCorrectiveRowCounts(client);
      view.row_counts_unchanged = CORRECTIVE_TABLES.every(
        (table) => (rowCountsBefore[table] ?? 0) === (rowCountsAfter[table] ?? 0)
      );
      if (!view.row_counts_unchanged) failed.push("row_counts_unchanged");
      view.ok = failed.length === 0;
      view.failed_checks = failed;
      return { ok: view.ok, failed, view };
    }
    module2.exports = {
      CORRECTIVE_TABLES,
      TARGET_POLICIES,
      captureCorrectiveRowCounts,
      captureSentinelCounts,
      collectCorrectiveDryRunProbes,
      probeIdempotentPersistenceWithFixtures,
      tablePrivilegeMatrix,
      verifyCatalogExecutePrivileges,
      verifyPostCorrective,
      verifyServiceRoleCatalogGrants
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-apply-core.js
var require_ra_pro_accounting_automation_corrective_apply_core = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js"(exports2, module2) {
    "use strict";
    var fs = require("node:fs");
    var path = require("node:path");
    var { Client } = require_lib2();
    var { execFileSync } = require("node:child_process");
    var {
      ADVISORY_LOCK,
      APPLY_AUTHORIZATION_TOKEN: APPLY_AUTHORIZATION_TOKEN2,
      ARTIFACT_COMMIT,
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      EVIDENCE_PIN_AUTHORITY_COMMIT: EVIDENCE_PIN_AUTHORITY_COMMIT2,
      EXPECTED_PROJECT_REF,
      EXPECTED_STANDALONE_BUNDLE_SHA256,
      FEATURE_FLAG_ENV,
      FORBIDDEN_DATABASE_URL_ENVS,
      MIGRATIONS,
      ORIGINAL_COMMITTED_MIGRATIONS,
      POST_HISTORY_COUNT,
      PRIOR_HISTORY_COUNT,
      STANDALONE_BUNDLE_BYTES,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_SHA256,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var {
      loadAndVerifyGitBlob,
      stripOuterBeginCommit,
      assertNoDropCascade,
      sha256Buffer,
      ROOT
    } = require_git_blob_authority();
    var {
      assertNoTlsBypass,
      buildProductionSsl,
      tlsPolicyError
    } = require_ra_pro_accounting_automation_tls_ca();
    var {
      assertCorrectiveApplyAuthorized,
      assertCorrectiveMigrationsAllowlist,
      assertEvidenceAuthorityAncestry,
      loadEvidencePinAuthority: loadEvidencePinAuthority2,
      loadToolingAuthorization,
      recheckEvidencePinAuthority,
      resolveEvidenceAuthorityCommit,
      resolveExecutableCommit
    } = require_ra_pro_accounting_automation_corrective_apply_authorization();
    var {
      assertDryRunAuthorizedBeforeCredentials: assertDryRunAuthorizedBeforeCredentials2,
      recheckDryRunAuthorizationPin: recheckDryRunAuthorizationPin2
    } = require_ra_pro_accounting_automation_corrective_dry_run_authorization();
    var {
      assertCorrectivePreconditionEvidencePublished
    } = require_ra_pro_accounting_automation_corrective_precondition_gates();
    var {
      assertCorrectivePreApplyLiveEvidencePublished
    } = require_ra_pro_accounting_automation_corrective_pre_apply_gates();
    var {
      captureCorrectiveRowCounts,
      captureSentinelCounts,
      collectCorrectiveDryRunProbes,
      verifyPostCorrective
    } = require_ra_pro_accounting_automation_corrective_schema_probes();
    var IndeterminateCommitError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.name = "IndeterminateCommitError";
        this.code = "INDETERMINATE_OUTCOME";
        this.cause = cause;
      }
    };
    function redactString(input) {
      let s = String(input ?? "");
      s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
      s = s.replace(/([?&](?:password|pass|pwd|token|secret|api[_-]?key)=)[^&\s)'"`]+/gi, "$1***");
      s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
      s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
      for (const envName of [DATABASE_URL_ENV2, ...FORBIDDEN_DATABASE_URL_ENVS]) {
        const re = new RegExp(`${envName}\\s*[:=]\\s*[^\\s)'"\`]+`, "gi");
        s = s.replace(re, `${envName}=***`);
      }
      s = s.replace(/\/\/([^:@\s/'"]+):([^@\s/'"]+)@/g, "//***:***@");
      return s;
    }
    function sanitizeValue(value, depth = 0, seen = /* @__PURE__ */ new WeakSet()) {
      if (depth > 8) return "[depth-limited]";
      if (value == null) return value;
      if (typeof value === "string") return redactString(value);
      if (typeof value === "number" || typeof value === "boolean") return value;
      if (typeof value === "bigint") return String(value);
      if (typeof value === "function") return "[function]";
      if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
      if (typeof value === "object") {
        if (seen.has(value)) return "[circular]";
        seen.add(value);
        if (value instanceof Error) {
          return {
            name: value.name,
            message: redactString(value.message),
            code: value.code || void 0,
            stack: value.stack ? redactString(value.stack) : void 0,
            cause: value.cause ? sanitizeValue(value.cause, depth + 1, seen) : void 0
          };
        }
        if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, depth + 1, seen));
        const out = {};
        for (const [k, v] of Object.entries(value)) {
          const key = String(k).toLowerCase();
          if (key === "database_url_env" || key === "feature_flag_env" || key === "authorization_scope") {
            out[k] = sanitizeValue(v, depth + 1, seen);
            continue;
          }
          if (key.includes("password") || key.includes("connectionstring") || key === "database_url" || key === "databaseurl" || key === "argv" || key === "config") {
            out[k] = "[redacted]";
            continue;
          }
          out[k] = sanitizeValue(v, depth + 1, seen);
        }
        return out;
      }
      return redactString(value);
    }
    function sanitizeError(err) {
      const sanitized = sanitizeValue(err);
      if (sanitized && typeof sanitized === "object" && sanitized.message) return sanitized.message;
      return redactString(err && err.message ? err.message : err);
    }
    function decodeOnce(value) {
      const text = String(value || "");
      if (!text.includes("%")) return text;
      if (/%(?![0-9A-Fa-f]{2})/.test(text)) return null;
      try {
        return decodeURIComponent(text);
      } catch {
        return null;
      }
    }
    function canonicalPort(token) {
      if (!/^[1-9][0-9]{0,4}$/.test(token)) return null;
      const port = Number(token);
      if (!Number.isInteger(port) || port < 1 || port > 65535 || String(port) !== token) return null;
      return port;
    }
    function parseQueryAllowlist(query) {
      if (query == null) return { ok: false, sslmode: null };
      if (query === "" || query.includes("#") || query.includes("+")) return { ok: false, sslmode: null };
      const segments = query.split("&");
      if (segments.length !== 1 || segments[0] === "") return { ok: false, sslmode: null };
      const eq = segments[0].indexOf("=");
      if (eq <= 0) return { ok: false, sslmode: null };
      const rawKey = segments[0].slice(0, eq);
      const rawValue = segments[0].slice(eq + 1);
      if (rawKey !== "sslmode") return { ok: false, sslmode: null };
      if (rawValue !== "require" && rawValue !== "verify-full" && rawValue !== "verify-ca") {
        return { ok: false, sslmode: null };
      }
      return { ok: true, sslmode: rawValue };
    }
    function splitHostPort(authority) {
      if (!authority) return null;
      if (authority.startsWith("[")) {
        const end = authority.indexOf("]");
        if (end < 2) return null;
        const host = authority.slice(1, end);
        const rest = authority.slice(end + 1);
        if (rest === "") return { host, explicitPort: null };
        if (!rest.startsWith(":") || rest.length < 2) return null;
        return { host, explicitPort: rest.slice(1) };
      }
      const colon = authority.lastIndexOf(":");
      if (colon === -1) return { host: authority, explicitPort: null };
      const token = authority.slice(colon + 1);
      if (!/^[0-9]+$/.test(token)) return { host: authority, explicitPort: null };
      return { host: authority.slice(0, colon), explicitPort: token };
    }
    function parsePostgresUrl(raw) {
      const text = String(raw || "").trim();
      if (/[\u0000-\u0020\u007f]/.test(text) || text.includes("\\") || text.includes("#")) return null;
      const scheme = text.match(/^(postgres(?:ql)?):\/\/([\s\S]*)$/i);
      if (!scheme) return null;
      const rest = scheme[2];
      const qPos = rest.indexOf("?");
      const beforeQuery = qPos === -1 ? rest : rest.slice(0, qPos);
      const query = qPos === -1 ? null : rest.slice(qPos + 1);
      const slash = beforeQuery.indexOf("/");
      if (slash <= 0) return null;
      const authority = beforeQuery.slice(0, slash);
      const databaseRaw = beforeQuery.slice(slash + 1);
      if (databaseRaw.includes("/")) return null;
      const at = authority.lastIndexOf("@");
      const userinfo = at === -1 ? "" : authority.slice(0, at);
      const hostport = at === -1 ? authority : authority.slice(at + 1);
      const split = splitHostPort(hostport);
      if (!split || !split.host) return null;
      const hostDecoded = decodeOnce(split.host);
      const database = decodeOnce(databaseRaw);
      if (hostDecoded == null || database == null) return null;
      const host = hostDecoded.toLowerCase();
      if (!host || host.includes("%")) return null;
      let username = "";
      let password = "";
      if (userinfo) {
        const colon = userinfo.indexOf(":");
        const rawUser = colon === -1 ? userinfo : userinfo.slice(0, colon);
        const rawPass = colon === -1 ? "" : userinfo.slice(colon + 1);
        username = decodeOnce(rawUser);
        password = decodeOnce(rawPass);
        if (username == null || password == null) return null;
      }
      let explicitPort = null;
      let effectivePort = 5432;
      if (split.explicitPort != null) {
        explicitPort = canonicalPort(split.explicitPort);
        if (explicitPort == null) return null;
        effectivePort = explicitPort;
      }
      const queryParsed = parseQueryAllowlist(query);
      return {
        host,
        explicitPort,
        effectivePort,
        database,
        username,
        password,
        sslmode: queryParsed.sslmode,
        sslOk: queryParsed.ok
      };
    }
    function isLoopbackHost(host) {
      return host === "127.0.0.1" || host === "localhost" || host === "::1";
    }
    function isExactDirectHost(host, ref) {
      return host === `db.${ref}.supabase.co`;
    }
    function isApprovedPoolerHost(host) {
      return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.pooler\.supabase\.com$/.test(
        host
      );
    }
    function classifyDatabaseUrl(raw, expectedProjectRef = EXPECTED_PROJECT_REF) {
      const ref = String(expectedProjectRef || "").toLowerCase();
      const empty = {
        ok: false,
        reason: "MALFORMED_DATABASE_URL",
        host_class: "malformed",
        username_class: "absent",
        is_local: false,
        matches_expected_project_ref: false,
        database_name_match: false,
        ssl_requirement_match: false,
        port_class_match: false,
        expected_project_ref: expectedProjectRef
      };
      const parts = parsePostgresUrl(raw);
      if (!parts || !ref) return empty;
      const databaseNameMatch = parts.database === "postgres";
      const sslRequirementMatch = parts.sslOk === true;
      if (isLoopbackHost(parts.host)) {
        return {
          ok: true,
          host_class: "loopback",
          username_class: "not_applicable",
          is_local: true,
          matches_expected_project_ref: false,
          database_name_match: databaseNameMatch,
          ssl_requirement_match: sslRequirementMatch,
          port_class_match: parts.effectivePort === 5432,
          expected_project_ref: expectedProjectRef
        };
      }
      if (isExactDirectHost(parts.host, ref)) {
        const portClassMatch = parts.effectivePort === 5432;
        return {
          ok: true,
          host_class: "direct",
          username_class: "not_applicable",
          is_local: false,
          matches_expected_project_ref: portClassMatch && databaseNameMatch && sslRequirementMatch,
          database_name_match: databaseNameMatch,
          ssl_requirement_match: sslRequirementMatch,
          port_class_match: portClassMatch,
          expected_project_ref: expectedProjectRef
        };
      }
      if (isApprovedPoolerHost(parts.host)) {
        const session = parts.effectivePort === 5432;
        const transaction = parts.explicitPort === 6543;
        const portClassMatch = session || transaction;
        const usernameClass = parts.username === `postgres.${ref}` ? "project_bound" : parts.username ? "mismatched" : "absent";
        return {
          ok: true,
          host_class: transaction ? "transaction_pooler" : session ? "session_pooler" : "mismatched",
          username_class: usernameClass,
          is_local: false,
          matches_expected_project_ref: portClassMatch && databaseNameMatch && sslRequirementMatch && usernameClass === "project_bound",
          database_name_match: databaseNameMatch,
          ssl_requirement_match: sslRequirementMatch,
          port_class_match: portClassMatch,
          expected_project_ref: expectedProjectRef
        };
      }
      return {
        ok: true,
        host_class: "mismatched",
        username_class: parts.username ? "mismatched" : "absent",
        is_local: false,
        matches_expected_project_ref: false,
        database_name_match: databaseNameMatch,
        ssl_requirement_match: sslRequirementMatch,
        port_class_match: false,
        expected_project_ref: expectedProjectRef
      };
    }
    function sanitizeUriDiagnostics(diagnostics) {
      if (!diagnostics || typeof diagnostics !== "object") return diagnostics;
      return {
        ok: Boolean(diagnostics.ok),
        host_class: diagnostics.host_class || "malformed",
        username_class: diagnostics.username_class || "absent",
        is_local: Boolean(diagnostics.is_local),
        matches_expected_project_ref: Boolean(diagnostics.matches_expected_project_ref),
        database_name_match: Boolean(diagnostics.database_name_match),
        ssl_requirement_match: Boolean(diagnostics.ssl_requirement_match),
        port_class_match: Boolean(diagnostics.port_class_match),
        expected_project_ref: diagnostics.expected_project_ref || EXPECTED_PROJECT_REF,
        reason: diagnostics.reason || void 0
      };
    }
    function buildPgClientConfig(raw, env = process.env) {
      const parts = parsePostgresUrl(raw);
      if (!parts) {
        const e = new Error("MALFORMED_DATABASE_URL");
        e.code = "MALFORMED_DATABASE_URL";
        throw e;
      }
      const config = {
        host: parts.host,
        port: parts.effectivePort,
        user: parts.username,
        password: parts.password,
        database: parts.database
      };
      if (!isLoopbackHost(parts.host)) {
        config.ssl = buildProductionSsl(parts.host, env);
      }
      return config;
    }
    function assertFeatureFlagUntouched(env = process.env) {
      if (Object.prototype.hasOwnProperty.call(env, FEATURE_FLAG_ENV) && env[FEATURE_FLAG_ENV] === "true") {
        const e = new Error(
          `${FEATURE_FLAG_ENV}=true is forbidden during applicator execution; leave absent/false`
        );
        e.code = "FEATURE_FLAG_MUST_REMAIN_CLOSED";
        throw e;
      }
    }
    function resolveDatabaseUrlFromEnv(env = process.env, options = {}) {
      assertNoTlsBypass(env);
      assertFeatureFlagUntouched(env);
      for (const forbidden of FORBIDDEN_DATABASE_URL_ENVS) {
        if (Object.prototype.hasOwnProperty.call(env, forbidden) && env[forbidden]) {
          const e = new Error(`PROHIBITED_CREDENTIAL_CHANNEL: ${forbidden} is forbidden`);
          e.code = "PROHIBITED_CREDENTIAL_CHANNEL";
          e.uri_diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(env[forbidden]));
          e.phase = "uri_validate";
          throw e;
        }
      }
      const raw = env[DATABASE_URL_ENV2];
      if (!raw) {
        const e = new Error(`MISSING_INPUT: ${DATABASE_URL_ENV2} required`);
        e.code = "MISSING_INPUT";
        e.phase = "uri_validate";
        throw e;
      }
      const diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(raw));
      if (!diagnostics.ok) {
        const e = new Error("MALFORMED_DATABASE_URL");
        e.code = "MALFORMED_DATABASE_URL";
        e.uri_diagnostics = diagnostics;
        e.phase = "uri_validate";
        throw e;
      }
      const allowLocalhostForHarness = options.allowLocalhostForHarness === true;
      if (diagnostics.is_local) {
        if (!allowLocalhostForHarness) {
          const e = new Error(
            "DATABASE_PROJECT_REF_MISMATCH: loopback hosts are forbidden outside in-process harness"
          );
          e.code = "DATABASE_PROJECT_REF_MISMATCH";
          e.uri_diagnostics = diagnostics;
          e.phase = "uri_validate";
          throw e;
        }
      } else if (!diagnostics.matches_expected_project_ref) {
        const e = new Error(
          `DATABASE_PROJECT_REF_MISMATCH: connection is not bound to Supabase project ${EXPECTED_PROJECT_REF}`
        );
        e.code = "DATABASE_PROJECT_REF_MISMATCH";
        e.uri_diagnostics = diagnostics;
        e.phase = "uri_validate";
        throw e;
      }
      return { clientConfig: buildPgClientConfig(raw, env), uri_diagnostics: diagnostics };
    }
    function scopedClientOptions(clientConfig, env = process.env) {
      assertNoTlsBypass(env);
      if (!clientConfig || typeof clientConfig !== "object" || clientConfig.connectionString) {
        const e = new Error("MALFORMED_DATABASE_URL");
        e.code = "MALFORMED_DATABASE_URL";
        throw e;
      }
      if (clientConfig.sslmode || clientConfig.sslrootcert) {
        throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: sslmode/sslrootcert on the client is forbidden");
      }
      const options = {
        host: clientConfig.host,
        port: clientConfig.port,
        user: clientConfig.user,
        password: clientConfig.password,
        database: clientConfig.database
      };
      if (isLoopbackHost(clientConfig.host)) {
        if (clientConfig.ssl && clientConfig.ssl.rejectUnauthorized === false) {
          throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: rejectUnauthorized false is forbidden");
        }
        if (clientConfig.ssl) options.ssl = clientConfig.ssl;
        return options;
      }
      const ssl = buildProductionSsl(clientConfig.host, env);
      options.ssl = ssl;
      return options;
    }
    function resolveRepoRoot(inputs = {}) {
      if (inputs.cwd) return inputs.cwd;
      const candidates = [
        process.cwd(),
        ROOT,
        path.resolve(__dirname, "../.."),
        path.resolve(__dirname, "../../..")
      ];
      for (const candidate of candidates) {
        try {
          if (fs.existsSync(path.join(candidate, TOOLING_AUTHORIZATION_PATH))) {
            return candidate;
          }
        } catch {
        }
      }
      return process.cwd();
    }
    function assertNoHarnessEnvOrArgv(inputs = {}) {
      const env = inputs.env || process.env;
      const forbiddenEnv = [
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ALLOW_HARNESS",
        "ALLOW_UNPUBLISHED_FOR_HARNESS",
        "ALLOW_LOCALHOST_FOR_HARNESS",
        "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ALLOW_LOCALHOST"
      ];
      for (const name of forbiddenEnv) {
        if (Object.prototype.hasOwnProperty.call(env, name) && env[name]) {
          const e = new Error(`HARNESS_VIA_ENV_FORBIDDEN: ${name}`);
          e.code = "HARNESS_VIA_ENV_FORBIDDEN";
          e.phase = "bundle_authority";
          throw e;
        }
      }
      const argv = inputs.argv || process.argv || [];
      if (argv.some((a) => /harness|allow-unpublished|allow-localhost/i.test(String(a)))) {
        const e = new Error("HARNESS_VIA_ARGV_FORBIDDEN");
        e.code = "HARNESS_VIA_ARGV_FORBIDDEN";
        e.phase = "bundle_authority";
        throw e;
      }
    }
    function assertTestOnlyHarnessContext(inputs = {}) {
      const harness = inputs.allowLocalhostForHarness === true || inputs.allowDisposablePublicationCommit === true || inputs.allowDisposableDryRunPublicationCommit === true;
      if (!harness) return;
      if (inputs.testOnlyHarnessContext !== true) {
        const e = new Error("HARNESS_CONTEXT_REQUIRED: testOnlyHarnessContext required for harness flags");
        e.code = "HARNESS_CONTEXT_REQUIRED";
        e.phase = "harness_isolation";
        throw e;
      }
      const env = inputs.env || process.env || {};
      const dbUrl = env.RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL || "";
      if (dbUrl && !/localhost|127\.0\.0\.1/i.test(String(dbUrl))) {
        const e = new Error("HARNESS_PRODUCTION_CREDENTIAL_FORBIDDEN");
        e.code = "HARNESS_PRODUCTION_CREDENTIAL_FORBIDDEN";
        e.phase = "harness_isolation";
        throw e;
      }
      if (inputs.publicationCommit && inputs.allowDisposablePublicationCommit !== true) {
        const e = new Error("HARNESS_PRODUCTION_PUBLICATION_FORBIDDEN");
        e.code = "HARNESS_PRODUCTION_PUBLICATION_FORBIDDEN";
        e.phase = "harness_isolation";
        throw e;
      }
      if (inputs.markerDir) {
        const marker = String(inputs.markerDir).replace(/\\/g, "/").toLowerCase();
        const tmp = require("node:os").tmpdir().replace(/\\/g, "/").toLowerCase();
        if (!marker.includes("/tmp") && !marker.startsWith(tmp) && !marker.includes("\\temp") && !marker.includes("/temp")) {
          const e = new Error("HARNESS_REAL_MARKER_DIR_FORBIDDEN");
          e.code = "HARNESS_REAL_MARKER_DIR_FORBIDDEN";
          e.phase = "harness_isolation";
          throw e;
        }
      }
    }
    function isPublishedHexOid(value) {
      return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
    }
    var HEX40_LOCAL = /^[0-9a-f]{40}$/;
    function isPublishedHexSha256(value) {
      return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value) && !value.startsWith("PENDING_");
    }
    function resolveBundleSeals(inputs = {}) {
      if (inputs.bundleSealsOverride) {
        if (inputs.testOnlyHarnessContext !== true) {
          const e = new Error("HARNESS_CONTEXT_REQUIRED: bundleSealsOverride");
          e.code = "HARNESS_CONTEXT_REQUIRED";
          e.phase = "bundle_authority";
          throw e;
        }
        return inputs.bundleSealsOverride;
      }
      const cwd = resolveRepoRoot(inputs);
      const executableCommit = resolveExecutableCommit({ ...inputs, cwd });
      const { auth } = loadToolingAuthorization({
        cwd,
        commit: executableCommit,
        env: inputs.env
      });
      const fromAuth = auth.standalone_bundle || {};
      return {
        path: fromAuth.path || STANDALONE_BUNDLE_PATH,
        oid: fromAuth.oid || STANDALONE_BUNDLE_OID,
        sha256: fromAuth.sha256 || STANDALONE_BUNDLE_SHA256,
        bytes: fromAuth.bytes != null ? fromAuth.bytes : STANDALONE_BUNDLE_BYTES,
        source: "executable_git_auth",
        executableCommit
      };
    }
    function assertBundleAuthority(inputs = {}) {
      assertNoHarnessEnvOrArgv(inputs);
      if (inputs.allowDisposablePublicationCommit === true) {
        assertTestOnlyHarnessContext(inputs);
        return {
          path: STANDALONE_BUNDLE_PATH,
          oid: STANDALONE_BUNDLE_OID,
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES,
          skipped_for_harness: true,
          phase: "bundle_authority"
        };
      }
      if (EXPECTED_STANDALONE_BUNDLE_SHA256 && !String(EXPECTED_STANDALONE_BUNDLE_SHA256).startsWith("PENDING_") && !isPublishedHexSha256(EXPECTED_STANDALONE_BUNDLE_SHA256)) {
        const e = new Error("BUNDLE_SELF_HASH_INVALID");
        e.code = "BUNDLE_AUTHORITY_UNPUBLISHED";
        e.phase = "bundle_authority";
        throw e;
      }
      const seals = resolveBundleSeals(inputs);
      if (!seals || !isPublishedHexOid(seals.oid) || !isPublishedHexSha256(seals.sha256) || !Number.isInteger(seals.bytes) || seals.bytes <= 0 || String(seals.oid).startsWith("PENDING_") || String(seals.sha256).startsWith("PENDING_")) {
        const e = new Error(
          "BUNDLE_AUTHORITY_UNPUBLISHED: standalone_bundle OID/SHA/bytes pins missing or PENDING"
        );
        e.code = "BUNDLE_AUTHORITY_UNPUBLISHED";
        e.phase = "bundle_authority";
        throw e;
      }
      const cwd = resolveRepoRoot(inputs);
      const commit = inputs.bundleAuthorityCommit || seals.executableCommit || resolveExecutableCommit({ ...inputs, cwd });
      const loaded = loadAndVerifyGitBlob({
        commit,
        path: seals.path,
        expectedOid: seals.oid,
        expectedSha256: seals.sha256,
        expectedBytes: seals.bytes,
        cwd
      });
      return {
        path: seals.path,
        oid: loaded.oid,
        sha256: loaded.sha256,
        bytes: loaded.bytes,
        commit,
        phase: "bundle_authority"
      };
    }
    function assertMigrationOrder(migrations = MIGRATIONS) {
      if (migrations.length !== 1) {
        const e = new Error("CORRECTIVE_MIGRATIONS_ALLOWLIST: expected exactly one migration");
        e.code = "CORRECTIVE_MIGRATIONS_ALLOWLIST";
        throw e;
      }
      if (PRIOR_HISTORY_COUNT + migrations.length !== POST_HISTORY_COUNT) {
        const e = new Error("HISTORY_CONTRACT_INVALID");
        e.code = "HISTORY_CONTRACT_INVALID";
        throw e;
      }
    }
    function forbidOriginalMigrationSelection(migration) {
      for (const original of ORIGINAL_COMMITTED_MIGRATIONS) {
        if (migration.version === original.version || migration.path === original.path || migration.name === original.name) {
          const e = new Error(
            `CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN: ${migration.version || migration.path}`
          );
          e.code = "CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN";
          throw e;
        }
      }
    }
    function assertOriginalMigrationStatementsNotSelectable() {
      for (const migration of MIGRATIONS) {
        forbidOriginalMigrationSelection(migration);
      }
      assertCorrectiveMigrationsAllowlist(MIGRATIONS.map((m) => ({ migration: m })));
      const forbiddenPaths = new Set(ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.path));
      for (const migration of MIGRATIONS) {
        if (forbiddenPaths.has(migration.path)) {
          const e = new Error("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN");
          e.code = "CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN";
          throw e;
        }
      }
      return true;
    }
    function loadSealedMigrations(inputs = {}) {
      assertMigrationOrder();
      assertOriginalMigrationStatementsNotSelectable();
      const cwd = resolveRepoRoot(inputs);
      const allowWorktree = inputs.allowDisposablePublicationCommit === true || inputs.allowWorktreeMigrationLoad === true;
      return MIGRATIONS.map((migration) => {
        forbidOriginalMigrationSelection(migration);
        let loaded;
        if (allowWorktree) {
          const abs = path.join(cwd, migration.path);
          const buffer = fs.readFileSync(abs);
          if (buffer.includes(13)) {
            const e = new Error("BUNDLE_NOT_LF_ONLY: migration contains CR");
            e.code = "BUNDLE_CRLF_FORBIDDEN";
            throw e;
          }
          const digest = sha256Buffer(buffer);
          const oid = execFileSync("git", ["hash-object", "--stdin"], {
            cwd,
            input: buffer,
            encoding: "utf8",
            env: (() => {
              const env = { ...process.env };
              const n = Number(env.GIT_CONFIG_COUNT || 0);
              env.GIT_CONFIG_COUNT = String(n + 1);
              env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
              env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
              return env;
            })()
          }).trim();
          if (oid !== migration.oid || digest !== migration.sha256 || buffer.length !== migration.bytes) {
            const e = new Error(`BLOCKED_PIN_MISMATCH: worktree seal for ${migration.path}`);
            e.code = "BLOCKED_PIN_MISMATCH";
            throw e;
          }
          loaded = { buffer, oid, sha256: digest, bytes: buffer.length, source: "worktree_harness" };
        } else {
          const commit = inputs.artifactCommit || ARTIFACT_COMMIT;
          if (!isPublishedHexOid(commit) || String(commit).startsWith("PENDING_")) {
            const e = new Error("ARTIFACT_COMMIT_UNPUBLISHED");
            e.code = "ARTIFACT_COMMIT_UNPUBLISHED";
            throw e;
          }
          loaded = loadAndVerifyGitBlob({
            commit,
            path: migration.path,
            expectedOid: migration.oid,
            expectedSha256: migration.sha256,
            expectedBytes: migration.bytes,
            cwd
          });
        }
        const fullSql = loaded.buffer.toString("utf8");
        assertNoDropCascade(fullSql);
        const innerSql = stripOuterBeginCommit(fullSql);
        return { migration, loaded, fullSql, innerSql };
      });
    }
    async function withClient(clientConfig, fn) {
      const options = scopedClientOptions(clientConfig);
      const client = new Client({
        host: options.host,
        port: options.port,
        user: options.user,
        password: options.password,
        database: options.database,
        ssl: options.ssl
      });
      await client.connect();
      try {
        return await fn(client);
      } finally {
        await client.end().catch(() => {
        });
      }
    }
    async function assertHistoryCount(client, expected) {
      const { rows } = await client.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`
      );
      if (rows[0].c !== expected) {
        const e = new Error(`HISTORY_COUNT_MISMATCH: got ${rows[0].c}, expected ${expected}`);
        e.code = "HISTORY_COUNT_MISMATCH";
        throw e;
      }
    }
    async function assertVersionAbsent(client, version) {
      const { rows } = await client.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [version]
      );
      if (rows[0].c !== 0) {
        const e = new Error(`VERSION_ALREADY_PRESENT: ${version}`);
        e.code = "VERSION_ALREADY_PRESENT";
        throw e;
      }
    }
    async function assertOriginalsPresentOnce(client) {
      for (const original of ORIGINAL_COMMITTED_MIGRATIONS) {
        const { rows } = await client.query(
          `SELECT statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
          [original.version]
        );
        if (rows.length !== 1) {
          const e = new Error(`ORIGINAL_VERSION_MISSING_OR_DUPLICATED: ${original.version}`);
          e.code = "ORIGINAL_VERSION_MISSING_OR_DUPLICATED";
          throw e;
        }
        const statements = rows[0].statements || [];
        const digestOk = statements.length === 1 && sha256Buffer(Buffer.from(statements[0], "utf8")) === original.sha256 && Buffer.byteLength(statements[0], "utf8") === original.bytes;
        if (!digestOk) {
          const e = new Error(`ORIGINAL_VERSION_DIGEST_MISMATCH: ${original.version}`);
          e.code = "ORIGINAL_VERSION_DIGEST_MISMATCH";
          throw e;
        }
      }
    }
    async function tryAdvisoryLock(client, inputs = {}) {
      if (inputs.lockTimeoutMs === 0) {
        const { rows } = await client.query(
          `SELECT pg_try_advisory_xact_lock($1::int, $2::int) AS got`,
          [ADVISORY_LOCK.key1, ADVISORY_LOCK.key2]
        );
        if (!rows[0].got) {
          const e = new Error("ADVISORY_LOCK_CONTENTION");
          e.code = "ADVISORY_LOCK_CONTENTION";
          throw e;
        }
        return;
      }
      await client.query("SET LOCAL lock_timeout = '5s'");
      try {
        await client.query("SELECT pg_advisory_xact_lock($1::int, $2::int)", [
          ADVISORY_LOCK.key1,
          ADVISORY_LOCK.key2
        ]);
      } catch (err) {
        const e = new Error("ADVISORY_LOCK_CONTENTION");
        e.code = "ADVISORY_LOCK_CONTENTION";
        e.cause = err;
        throw e;
      }
    }
    async function insertMigrationHistory(client, packed) {
      await client.query(packed.innerSql);
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
     VALUES ($1, $2, ARRAY[$3]::text[])`,
        [packed.migration.version, packed.migration.name, packed.fullSql]
      );
      const { rows: stored } = await client.query(
        `SELECT version, name, statements
     FROM supabase_migrations.schema_migrations
     WHERE version = $1`,
        [packed.migration.version]
      );
      if (stored.length !== 1) {
        throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} row count != 1`);
      }
      const stmts = stored[0].statements || [];
      if (stmts.length !== 1 || stmts[0] !== packed.fullSql) {
        throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} statements mismatch`);
      }
      if (sha256Buffer(Buffer.from(stmts[0], "utf8")) !== packed.loaded.sha256) {
        throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} digest mismatch`);
      }
    }
    function buildEvidenceBase(inputs) {
      return {
        package: "ra-pro-accounting-automation-corrective-apply",
        mode: inputs.mode || "dry-run",
        artifact_commit: ARTIFACT_COMMIT,
        database_url_env: DATABASE_URL_ENV2,
        advisory_lock: ADVISORY_LOCK,
        history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
        migrations: MIGRATIONS.map((m) => ({ version: m.version, name: m.name, oid: m.oid })),
        feature_flag_env: FEATURE_FLAG_ENV,
        feature_flag_touched: false,
        session_role_model: "set_role_not_jwt",
        jwt_service_role_claimed: false,
        sqlApplicationAttempts: 0,
        databaseConnectionAttempts: 0,
        productionContact: false
      };
    }
    function finalizeEvidence(evidence) {
      return sanitizeValue(evidence);
    }
    function enforceCorrectiveEvidenceGates(inputs = {}, mode = "dry-run") {
      assertNoHarnessEnvOrArgv(inputs);
      if (inputs.allowLocalhostForHarness === true || inputs.allowDisposablePublicationCommit === true) {
        assertTestOnlyHarnessContext(inputs);
        return { skipped_for_harness: true, phase: "evidence_gates" };
      }
      const cwd = resolveRepoRoot(inputs);
      const executableCommit = resolveExecutableCommit({ ...inputs, cwd });
      const evidenceAuthorityCommit = resolveEvidenceAuthorityCommit(inputs);
      const evidenceAuthority = loadEvidencePinAuthority2({ ...inputs, cwd });
      assertEvidenceAuthorityAncestry(evidenceAuthorityCommit, executableCommit, cwd);
      if (evidenceAuthorityCommit === EVIDENCE_PIN_AUTHORITY_COMMIT2 && evidenceAuthority.source !== "git_blob") {
        const e = new Error("EVIDENCE_AUTHORITY_SOURCE_FORBIDDEN: worktree AUTH rejected");
        e.code = "EVIDENCE_AUTHORITY_SOURCE_FORBIDDEN";
        e.phase = "evidence_gates";
        throw e;
      }
      const gateInputs = {
        auth: evidenceAuthority.auth,
        cwd,
        now: inputs.now,
        env: inputs.env || process.env,
        expected: inputs.expectedEvidencePins
      };
      if (mode === "dry-run" || mode === "apply") {
        assertCorrectivePreconditionEvidencePublished(gateInputs);
      }
      if (mode === "apply") {
        assertCorrectivePreApplyLiveEvidencePublished(gateInputs);
      }
      return {
        phase: "evidence_gates",
        mode,
        evidence_authority_commit: evidenceAuthorityCommit,
        evidence_authority_auth_oid: evidenceAuthority.loaded.oid,
        evidence_authority_source: evidenceAuthority.source,
        executable_commit: executableCommit
      };
    }
    function refuseAuthIfOriginalsTargeted(inputs = {}) {
      try {
        const cwd = resolveRepoRoot(inputs);
        let auth;
        if (inputs.allowDisposablePublicationCommit === true && inputs.publicationCommit) {
          assertTestOnlyHarnessContext(inputs);
          auth = loadToolingAuthorization({
            cwd,
            commit: inputs.publicationCommit,
            env: inputs.env
          }).auth;
        } else if (inputs.executableCommit || inputs.applyAuthorizationCommit) {
          auth = loadToolingAuthorization({
            cwd,
            commit: inputs.applyAuthorizationCommit || inputs.executableCommit,
            env: inputs.env
          }).auth;
        } else if (inputs.testOnlyHarnessContext === true && inputs.allowWorktreeAuthLoad === true) {
          auth = loadToolingAuthorization({
            cwd,
            testOnlyHarnessContext: true,
            allowWorktreeAuthLoad: true,
            env: inputs.env
          }).auth;
        } else {
          return;
        }
        const record = auth.production_apply_authorization || {};
        const migrations = record.migrations || auth.migrations || [];
        if (Array.isArray(migrations)) {
          for (const row of migrations) {
            if (ORIGINAL_COMMITTED_MIGRATIONS.some((o) => o.version === row.version || o.path === row.path)) {
              const e = new Error("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN");
              e.code = "CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN";
              e.phase = "authorization";
              throw e;
            }
          }
        }
      } catch (err) {
        if (err.code === "CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN") throw err;
      }
    }
    async function runDryRun(inputs = {}) {
      const evidence = buildEvidenceBase({ ...inputs, mode: "dry-run" });
      evidence.authorization_scope = "corrective_dry_run";
      evidence.migration_sql_attempts = 0;
      try {
        refuseAuthIfOriginalsTargeted(inputs);
        let dryRunMap = inputs.dryRunAuthorizationMap || null;
        if (!dryRunMap && inputs.publicationCommit && HEX40_LOCAL.test(String(inputs.publicationCommit))) {
          dryRunMap = assertDryRunAuthorizedBeforeCredentials2({
            cwd: resolveRepoRoot(inputs),
            publicationCommit: inputs.publicationCommit,
            env: inputs.env || {}
          });
        }
        if (dryRunMap) {
          if (inputs.expectAuthorizationBlobOid || inputs.expectBundleOid || inputs.expectAttemptId || inputs.expectExecutable) {
            recheckDryRunAuthorizationPin2({
              cwd: resolveRepoRoot(inputs),
              expectExecutable: inputs.expectExecutable || dryRunMap.authorized_executable_commit,
              expectCommit: dryRunMap.publication_commit,
              expectBlobOid: inputs.expectAuthorizationBlobOid || dryRunMap.authorization_publication_blob_oid,
              expectBundleOid: inputs.expectBundleOid || dryRunMap.bundle_oid,
              expectAttemptId: inputs.expectAttemptId || dryRunMap.attempt_id,
              expectLiveRef: inputs.expectLiveRef
            });
          }
          inputs = {
            ...inputs,
            dryRunAuthorizationMap: dryRunMap,
            executableCommit: dryRunMap.authorized_executable_commit
          };
          evidence.dry_run_authorization = {
            publication_commit: dryRunMap.publication_commit,
            authorization_publication_blob_oid: dryRunMap.authorization_publication_blob_oid,
            authorized_executable_commit: dryRunMap.authorized_executable_commit,
            attempt_id: dryRunMap.attempt_id,
            bundle_oid: dryRunMap.bundle_oid
          };
        }
        evidence.evidence_gates = enforceCorrectiveEvidenceGates(inputs, "dry-run");
        evidence.bundle_authority = assertBundleAuthority(inputs);
        evidence.evidence_authority_recheck_pre_credentials = recheckEvidencePinAuthority({
          ...inputs,
          cwd: resolveRepoRoot(inputs)
        });
        assertFeatureFlagUntouched(inputs.env || process.env);
        const packed = loadSealedMigrations(inputs);
        assertCorrectiveMigrationsAllowlist(packed);
        evidence.source_authority = packed.map((p) => ({
          version: p.migration.version,
          oid: p.loaded.oid,
          sha256: p.loaded.sha256,
          bytes: p.loaded.bytes
        }));
        const resolved = resolveDatabaseUrlFromEnv(inputs.env || process.env, {
          allowLocalhostForHarness: inputs.allowLocalhostForHarness === true
        });
        evidence.uri_diagnostics = resolved.uri_diagnostics;
        evidence.evidence_authority_recheck_pre_db = recheckEvidencePinAuthority({
          ...inputs,
          cwd: resolveRepoRoot(inputs)
        });
        if (dryRunMap) {
          recheckDryRunAuthorizationPin2({
            cwd: resolveRepoRoot(inputs),
            expectExecutable: dryRunMap.authorized_executable_commit,
            expectCommit: dryRunMap.publication_commit,
            expectBlobOid: dryRunMap.authorization_publication_blob_oid,
            expectBundleOid: dryRunMap.bundle_oid,
            expectAttemptId: dryRunMap.attempt_id,
            expectLiveRef: inputs.expectLiveRef
          });
        }
        evidence.databaseConnectionAttempts = 1;
        evidence.productionContact = inputs.allowLocalhostForHarness === true ? false : true;
        evidence.read_only = true;
        evidence.transaction_mutation = false;
        await withClient(resolved.clientConfig, async (client) => {
          await client.query("BEGIN");
          try {
            await tryAdvisoryLock(client, inputs);
            evidence.advisory_lock_acquired = true;
            const probes = await collectCorrectiveDryRunProbes(client, { env: inputs.env || process.env });
            evidence.schema_probes = probes.view;
            evidence.prior_history_count = probes.view.history_count;
            if (probes.failed.includes("history_count")) {
              throw Object.assign(new Error("HISTORY_COUNT_MISMATCH"), { code: "HISTORY_COUNT_MISMATCH" });
            }
            if (probes.failed.includes("corrective_absent")) {
              throw Object.assign(new Error("VERSION_ALREADY_PRESENT"), { code: "VERSION_ALREADY_PRESENT" });
            }
            if (!probes.ok) {
              throw Object.assign(new Error("SCHEMA_PROBE_FAILED"), { code: "SCHEMA_PROBE_FAILED" });
            }
            await client.query("ROLLBACK");
          } catch (err) {
            await client.query("ROLLBACK").catch(() => {
            });
            throw err;
          }
        });
        evidence.verdict = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
        evidence.result_code = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
        evidence.sqlApplicationAttempts = 0;
        evidence.migration_sql_attempts = 0;
        return finalizeEvidence(evidence);
      } catch (err) {
        evidence.verdict = "DRY_RUN_BLOCKED";
        evidence.result_code = err.code || "DRY_RUN_FAIL";
        evidence.error = sanitizeError(err);
        evidence.error_code = err.code || "DRY_RUN_FAIL";
        evidence.phase = err.phase || "dry_run";
        if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
        return finalizeEvidence(evidence);
      }
    }
    async function runApply(inputs = {}) {
      const evidence = buildEvidenceBase({ ...inputs, mode: "apply" });
      const applyInputs = { ...inputs, applyMode: true };
      let clientConfig;
      let packed;
      let commitPhase = "pre_commit";
      try {
        refuseAuthIfOriginalsTargeted(applyInputs);
        evidence.evidence_gates = enforceCorrectiveEvidenceGates(applyInputs, "apply");
        evidence.bundle_authority = assertBundleAuthority(applyInputs);
        evidence.evidence_authority_recheck_pre_credentials = recheckEvidencePinAuthority({
          ...applyInputs,
          cwd: resolveRepoRoot(applyInputs)
        });
        evidence.apply_authorization = assertCorrectiveApplyAuthorized({
          ...applyInputs,
          cwd: resolveRepoRoot(applyInputs),
          executableCommit: applyInputs.executableCommit || resolveExecutableCommit(applyInputs)
        });
        packed = loadSealedMigrations(applyInputs);
        assertCorrectiveMigrationsAllowlist(packed);
        evidence.source_authority = packed.map((p) => ({
          version: p.migration.version,
          oid: p.loaded.oid,
          sha256: p.loaded.sha256,
          bytes: p.loaded.bytes
        }));
        assertFeatureFlagUntouched(inputs.env || process.env);
        if (inputs.authorizationToken !== APPLY_AUTHORIZATION_TOKEN2) {
          const e = new Error("APPLY_AUTHORIZATION_TOKEN_MISMATCH");
          e.code = "APPLY_AUTHORIZATION_TOKEN_MISMATCH";
          throw e;
        }
        const resolved = resolveDatabaseUrlFromEnv(inputs.env || process.env, {
          allowLocalhostForHarness: inputs.allowLocalhostForHarness === true
        });
        clientConfig = resolved.clientConfig;
        evidence.uri_diagnostics = resolved.uri_diagnostics;
      } catch (err) {
        evidence.verdict = "APPLY_BLOCKED";
        evidence.result_code = err.code || "APPLY_BLOCKED";
        evidence.error = sanitizeError(err);
        evidence.error_code = err.code || "APPLY_BLOCKED";
        evidence.phase = err.phase || "pre_connect";
        if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
        evidence.sqlApplicationAttempts = 0;
        return finalizeEvidence(evidence);
      }
      try {
        evidence.databaseConnectionAttempts = 1;
        await withClient(clientConfig, async (client) => {
          await client.query("BEGIN");
          await client.query("SET LOCAL statement_timeout = '30s'");
          await tryAdvisoryLock(client, inputs);
          evidence.advisory_lock_acquired = true;
          await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
          await assertOriginalsPresentOnce(client);
          for (const p of packed) await assertVersionAbsent(client, p.migration.version);
          const dryProbes = await collectCorrectiveDryRunProbes(client, { env: inputs.env || process.env });
          if (!dryProbes.view.tables_rls_postgres || !dryProbes.view.functions_present) {
            throw Object.assign(new Error("SCHEMA_PROBE_FAILED"), { code: "SCHEMA_PROBE_FAILED" });
          }
          const sentinelBefore = await captureSentinelCounts(client);
          const rowCountsBefore = await captureCorrectiveRowCounts(client);
          if (inputs.injectFailure === "before_sql") {
            throw new Error("INJECTED_FAILURE_BEFORE_SQL");
          }
          evidence.sqlApplicationAttempts = packed.length;
          for (const p of packed) {
            await insertMigrationHistory(client, p);
          }
          const postCount = (await client.query(`SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`)).rows[0].c;
          if (postCount !== POST_HISTORY_COUNT) {
            throw new Error(`HISTORY_COUNT_AFTER_MISMATCH: got ${postCount}, expected ${POST_HISTORY_COUNT}`);
          }
          if (inputs.injectFailure === "before_commit") {
            throw new Error("INJECTED_FAILURE_BEFORE_COMMIT");
          }
          commitPhase = "committing";
          if (inputs.injectFailure === "during_commit") {
            throw new IndeterminateCommitError("INJECTED_CONNECTION_LOSS_DURING_COMMIT");
          }
          await client.query("COMMIT");
          commitPhase = "committed";
          commitPhase = "verifying";
          const verification = await verifyPostCorrective(client, {
            packed,
            sentinelBefore,
            rowCountsBefore,
            env: inputs.env || process.env,
            injectFailure: inputs.injectFailure
          });
          evidence.post_commit_verification = verification.view;
          if (!verification.ok) {
            const failed = Object.assign(new Error("POST_COMMIT_VERIFICATION_FAILED"), {
              code: verification.failed[0] || "POST_COMMIT_VERIFICATION_FAILED",
              verificationFailed: true
            });
            throw failed;
          }
          assertFeatureFlagUntouched(inputs.env || process.env);
          evidence.feature_flag_touched = false;
          evidence.retry_attempted = false;
          evidence.verdict = "APPLY_COMMITTED";
          evidence.result_code = "APPLY_COMMITTED";
          evidence.phase = "apply_committed";
          evidence.stored = packed.map((p) => ({
            version: p.migration.version,
            sha256: p.loaded.sha256,
            bytes: p.loaded.bytes
          }));
        });
      } catch (err) {
        if (err.verificationFailed || commitPhase === "verifying") {
          evidence.verdict = "POST_COMMIT_VERIFICATION_FAILED";
          evidence.result_code = err.code || "POST_COMMIT_VERIFICATION_FAILED";
          evidence.error = sanitizeError(err);
          evidence.error_code = err.code || "POST_COMMIT_VERIFICATION_FAILED";
          evidence.phase = "post_commit_verification";
          evidence.retry_attempted = false;
          return finalizeEvidence(evidence);
        }
        const uncertain = commitPhase === "committing" || commitPhase === "committed" || err instanceof IndeterminateCommitError;
        if (uncertain) {
          evidence.verdict = "INDETERMINATE_OUTCOME";
          evidence.result_code = "INDETERMINATE_OUTCOME";
          evidence.error = sanitizeError(err);
          evidence.error_code = "INDETERMINATE_OUTCOME";
          evidence.commit_phase = commitPhase;
          return finalizeEvidence(evidence);
        }
        evidence.verdict = "APPLY_ROLLED_BACK";
        evidence.result_code = err.code || "APPLY_FAIL";
        evidence.error = sanitizeError(err);
        evidence.error_code = err.code || "APPLY_FAIL";
        evidence.phase = "apply_rollback";
        return finalizeEvidence(evidence);
      }
      return finalizeEvidence(evidence);
    }
    async function runApplicator2(inputs = {}) {
      const mode = inputs.mode || "dry-run";
      if (mode === "apply") return runApply(inputs);
      return runDryRun(inputs);
    }
    module2.exports = {
      ADVISORY_LOCK,
      APPLY_AUTHORIZATION_TOKEN: APPLY_AUTHORIZATION_TOKEN2,
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      FEATURE_FLAG_ENV,
      IndeterminateCommitError,
      assertBundleAuthority,
      enforceCorrectiveEvidenceGates,
      assertTestOnlyHarnessContext,
      assertFeatureFlagUntouched,
      assertMigrationOrder,
      assertNoHarnessEnvOrArgv,
      assertOriginalMigrationStatementsNotSelectable,
      classifyDatabaseUrl,
      buildPgClientConfig,
      loadSealedMigrations,
      resolveBundleSeals,
      resolveDatabaseUrlFromEnv,
      runApplicator: runApplicator2,
      runApply,
      runDryRun,
      sanitizeError,
      sanitizeUriDiagnostics,
      sanitizeValue
    };
  }
});

// scripts/security/ra-pro-accounting-automation-corrective-evidence.js
var require_ra_pro_accounting_automation_corrective_evidence = __commonJS({
  "scripts/security/ra-pro-accounting-automation-corrective-evidence.js"(exports2, module2) {
    "use strict";
    var crypto = require("node:crypto");
    var fs = require("node:fs");
    var {
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      EXPECTED_PROJECT_REF,
      FEATURE_FLAG_ENV,
      MIGRATIONS,
      ORIGINAL_COMMITTED_MIGRATIONS,
      POST_HISTORY_COUNT,
      PRIOR_HISTORY_COUNT,
      STANDALONE_BUNDLE_BYTES,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_SHA256,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_corrective_apply_constants();
    var {
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
      loadOfficialEmbeddedCa
    } = require_ra_pro_accounting_automation_tls_ca();
    var PROTOCOL_ID = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1";
    var PROTOCOL_PREFIX = `${PROTOCOL_ID}:`;
    var SCHEMA_VERSION = 1;
    var MAX_PAYLOAD_BYTES = 512 * 1024;
    var SAFE_METADATA_KEYS = /* @__PURE__ */ new Set(["database_url_env", "feature_flag_env", "authorization_scope"]);
    function sha256Buffer(buf) {
      return crypto.createHash("sha256").update(buf).digest("hex");
    }
    function base64UrlEncode(buf) {
      return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
    function base64UrlDecode(s) {
      if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) {
        const e = new Error("CORRECTIVE_EVIDENCE_BASE64URL_INVALID");
        e.code = "CORRECTIVE_EVIDENCE_BASE64URL_INVALID";
        throw e;
      }
      const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - s.length % 4);
      return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
    }
    function redactString(input) {
      let s = String(input ?? "");
      s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
      s = s.replace(/([?&](?:password|pass|pwd|token|secret|api[_-]?key)=)[^&\s)'"`]+/gi, "$1***");
      s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
      s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
      s = s.replace(
        new RegExp(`${DATABASE_URL_ENV2}\\s*[:=]\\s*[^\\s)'"\`]+`, "gi"),
        `${DATABASE_URL_ENV2}=***`
      );
      s = s.replace(/\/\/([^:@\s/'"]+):([^@\s/'"]+)@/g, "//***:***@");
      return s;
    }
    function sanitizeEvidenceValue(value, depth = 0, seen = /* @__PURE__ */ new WeakSet(), parentKey = "") {
      if (depth > 10) return "[depth-limited]";
      if (value == null) return value;
      if (typeof value === "string") {
        const pk = String(parentKey).toLowerCase();
        if (SAFE_METADATA_KEYS.has(pk) && value === DATABASE_URL_ENV2) return DATABASE_URL_ENV2;
        if (SAFE_METADATA_KEYS.has(pk) && value === FEATURE_FLAG_ENV) return FEATURE_FLAG_ENV;
        return redactString(value);
      }
      if (typeof value === "number" || typeof value === "boolean") return value;
      if (typeof value === "bigint") return String(value);
      if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
      if (typeof value !== "object") return redactString(value);
      if (seen.has(value)) return "[circular]";
      seen.add(value);
      if (Array.isArray(value)) {
        return value.map((v) => sanitizeEvidenceValue(v, depth + 1, seen, parentKey));
      }
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        const key = String(k).toLowerCase();
        if (SAFE_METADATA_KEYS.has(key)) {
          out[k] = sanitizeEvidenceValue(v, depth + 1, seen, key);
          continue;
        }
        if (key.includes("password") || key.includes("connectionstring") || key === "database_url" || key === "databaseurl" || key === "argv" || key === "config") {
          out[k] = "[redacted]";
          continue;
        }
        out[k] = sanitizeEvidenceValue(v, depth + 1, seen, key);
      }
      return out;
    }
    function assertHex40(value, code) {
      if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
        const e = new Error(code);
        e.code = code;
        throw e;
      }
    }
    function assertHex64(value, code) {
      if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
        const e = new Error(code);
        e.code = code;
        throw e;
      }
    }
    function assertSeal(obj, code) {
      if (!obj || typeof obj !== "object") {
        const e = new Error(code);
        e.code = code;
        throw e;
      }
      assertHex40(String(obj.oid || "").toLowerCase(), code);
      assertHex64(String(obj.sha256 || "").toLowerCase(), code);
      if (!Number.isInteger(obj.bytes) || obj.bytes <= 0) {
        const e = new Error(code);
        e.code = code;
        throw e;
      }
    }
    function validateCorrectiveDryRunEvidenceSchema(evidence) {
      try {
        if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_SCHEMA", phase: "schema" };
        }
        if (evidence.protocol !== PROTOCOL_ID) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_PROTOCOL", phase: "schema" };
        }
        if (evidence.schema_version !== SCHEMA_VERSION) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_SCHEMA_VERSION", phase: "schema" };
        }
        if (evidence.mode !== "dry-run") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_MODE", phase: "schema" };
        }
        if (evidence.database_url_env !== DATABASE_URL_ENV2) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_CHANNEL", phase: "schema" };
        }
        if (evidence.project_ref !== EXPECTED_PROJECT_REF) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_PROJECT", phase: "schema" };
        }
        assertHex40(String(evidence.execution_tip || "").toLowerCase(), "CORRECTIVE_EVIDENCE_EXECUTION_TIP");
        const dryAuth = evidence.dry_run_authorization;
        if (!dryAuth || typeof dryAuth !== "object") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_DRY_RUN_AUTHORIZATION", phase: "schema" };
        }
        assertHex40(
          String(dryAuth.publication_commit || "").toLowerCase(),
          "CORRECTIVE_EVIDENCE_DRY_RUN_PUBLICATION"
        );
        assertHex40(
          String(dryAuth.authorization_publication_blob_oid || "").toLowerCase(),
          "CORRECTIVE_EVIDENCE_DRY_RUN_BLOB"
        );
        assertHex40(
          String(dryAuth.authorized_executable_commit || "").toLowerCase(),
          "CORRECTIVE_EVIDENCE_DRY_RUN_EXECUTABLE"
        );
        if (String(dryAuth.authorized_executable_commit || "").toLowerCase() !== String(evidence.execution_tip || "").toLowerCase()) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_DRY_RUN_EXECUTABLE", phase: "schema" };
        }
        if (!/^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$/.test(String(dryAuth.attempt_id || ""))) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_DRY_RUN_ATTEMPT", phase: "schema" };
        }
        assertSeal(evidence.bundle, "CORRECTIVE_EVIDENCE_BUNDLE");
        if (evidence.bundle.path !== STANDALONE_BUNDLE_PATH || String(evidence.bundle.oid).toLowerCase() !== String(STANDALONE_BUNDLE_OID).toLowerCase() || String(evidence.bundle.sha256).toLowerCase() !== String(STANDALONE_BUNDLE_SHA256).toLowerCase() || evidence.bundle.bytes !== STANDALONE_BUNDLE_BYTES) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_BUNDLE_PATH", phase: "schema" };
        }
        if (!Array.isArray(evidence.corrective_migrations) || evidence.corrective_migrations.length !== 1) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION", phase: "schema" };
        }
        const mig = evidence.corrective_migrations[0];
        const expMig = MIGRATIONS[0];
        if (mig.version !== expMig.version || mig.path !== expMig.path || String(mig.oid).toLowerCase() !== expMig.oid || String(mig.sha256).toLowerCase() !== expMig.sha256 || mig.bytes !== expMig.bytes) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION", phase: "schema" };
        }
        assertSeal(mig, "CORRECTIVE_EVIDENCE_MIGRATION");
        if (!Array.isArray(evidence.original_migrations_verify_only) || evidence.original_migrations_verify_only.length !== 2) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_ORIGINALS", phase: "schema" };
        }
        for (let i = 0; i < 2; i += 1) {
          const expected = ORIGINAL_COMMITTED_MIGRATIONS[i];
          const got = evidence.original_migrations_verify_only[i];
          if (got.version !== expected.version || got.path !== expected.path || String(got.oid).toLowerCase() !== expected.oid || String(got.sha256).toLowerCase() !== expected.sha256 || got.bytes !== expected.bytes) {
            return { ok: false, code: "CORRECTIVE_EVIDENCE_ORIGINALS", phase: "schema" };
          }
          assertSeal(got, "CORRECTIVE_EVIDENCE_ORIGINALS");
        }
        const pre = evidence.published_precondition_evidence;
        const live = evidence.published_pre_apply_evidence;
        if (!pre || !live) return { ok: false, code: "CORRECTIVE_EVIDENCE_PINS", phase: "schema" };
        assertHex40(String(pre.evidence_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
        assertHex64(String(pre.evidence_sha256 || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
        assertHex40(String(live.evidence_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
        assertHex64(String(live.evidence_sha256 || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
        const triad = evidence.collection_authority_triad;
        if (!triad) return { ok: false, code: "CORRECTIVE_EVIDENCE_TRIAD", phase: "schema" };
        assertHex40(String(triad.authorized_executable_commit || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
        assertHex40(String(triad.authorization_publication_commit || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
        assertHex40(String(triad.authorization_publication_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
        const ca = evidence.embedded_ca;
        if (!ca || ca.der_sha256 !== OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_CA", phase: "schema" };
        }
        if (typeof evidence.databaseConnectionAttempts !== "number") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_COUNTERS", phase: "schema" };
        }
        if (typeof evidence.sqlApplicationAttempts !== "number") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_SQL_ATTEMPTS", phase: "schema" };
        }
        if (typeof evidence.migration_sql_attempts !== "number") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION_SQL", phase: "schema" };
        }
        if (evidence.retry_attempted !== false) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_RETRY", phase: "schema" };
        }
        if (evidence.automation_enabled !== false || evidence.provider_writes !== false) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_SAFETY", phase: "schema" };
        }
        const tx = evidence.transaction;
        if (!tx || typeof tx.began !== "boolean" || typeof tx.rolled_back !== "boolean") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_TRANSACTION", phase: "schema" };
        }
        const hc = evidence.history_contract;
        if (!hc || hc.prior !== PRIOR_HISTORY_COUNT || hc.post !== POST_HISTORY_COUNT) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_HISTORY", phase: "schema" };
        }
        if (typeof evidence.verdict !== "string" || typeof evidence.result_code !== "string") {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_VERDICT", phase: "schema" };
        }
        if (Object.prototype.hasOwnProperty.call(evidence, "cleanup")) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_CLEANUP_FORBIDDEN", phase: "schema" };
        }
        const predictiveCleanupNote = "ceremony fills cleanup";
        const scanForPredictiveNote = (value, depth = 0) => {
          if (depth > 12 || value == null) return false;
          if (typeof value === "string") return value.includes(predictiveCleanupNote);
          if (typeof value !== "object") return false;
          if (Array.isArray(value)) return value.some((v) => scanForPredictiveNote(v, depth + 1));
          return Object.values(value).some((v) => scanForPredictiveNote(v, depth + 1));
        };
        if (scanForPredictiveNote(evidence)) {
          return { ok: false, code: "CORRECTIVE_EVIDENCE_PREDICTIVE_CLEANUP", phase: "schema" };
        }
        if (Object.prototype.hasOwnProperty.call(evidence, "producer_cleanup")) {
          const pc = evidence.producer_cleanup;
          if (!pc || typeof pc !== "object" || Array.isArray(pc)) {
            return { ok: false, code: "CORRECTIVE_EVIDENCE_PRODUCER_CLEANUP", phase: "schema" };
          }
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, code: err.code || "CORRECTIVE_EVIDENCE_SCHEMA", phase: "schema" };
      }
    }
    function assertCanonicalJsonBytes(buf) {
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        const e = new Error("CORRECTIVE_EVIDENCE_BYTES");
        e.code = "CORRECTIVE_EVIDENCE_BYTES";
        throw e;
      }
      if (buf.length >= 3 && buf[0] === 239 && buf[1] === 187 && buf[2] === 191) {
        const e = new Error("CORRECTIVE_EVIDENCE_BOM");
        e.code = "CORRECTIVE_EVIDENCE_BOM";
        throw e;
      }
      if (buf.includes(13)) {
        const e = new Error("CORRECTIVE_EVIDENCE_CRLF");
        e.code = "CORRECTIVE_EVIDENCE_CRLF";
        throw e;
      }
      if (buf[buf.length - 1] !== 10) {
        const e = new Error("CORRECTIVE_EVIDENCE_TRAILING_LF");
        e.code = "CORRECTIVE_EVIDENCE_TRAILING_LF";
        throw e;
      }
      if (buf.length >= 2 && buf[buf.length - 2] === 10) {
        const e = new Error("CORRECTIVE_EVIDENCE_DOUBLE_TRAILING_LF");
        e.code = "CORRECTIVE_EVIDENCE_DOUBLE_TRAILING_LF";
        throw e;
      }
    }
    function assertNoSecretsInText(text) {
      const checks = [
        [/postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/i, "CORRECTIVE_EVIDENCE_SECRET_URL"],
        [/sk_live_[A-Za-z0-9]+/, "CORRECTIVE_EVIDENCE_SECRET_SK"],
        [/whsec_[A-Za-z0-9]+/, "CORRECTIVE_EVIDENCE_SECRET_WHSEC"],
        [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "CORRECTIVE_EVIDENCE_SECRET_JWT"],
        [/BEGIN CERTIFICATE/, "CORRECTIVE_EVIDENCE_SECRET_CERT"],
        [/SecureString/i, "CORRECTIVE_EVIDENCE_SECRET_SECURESTRING"]
      ];
      for (const [re, code] of checks) {
        if (re.test(text)) {
          const e = new Error(code);
          e.code = code;
          throw e;
        }
      }
    }
    function materializeCanonicalEvidenceBytes(evidence) {
      const sanitized = sanitizeEvidenceValue(evidence);
      const schema = validateCorrectiveDryRunEvidenceSchema(sanitized);
      if (!schema.ok) {
        const e = new Error(schema.code);
        e.code = schema.code;
        e.phase = schema.phase;
        throw e;
      }
      const buf = Buffer.from(`${JSON.stringify(sanitized)}
`, "utf8");
      assertCanonicalJsonBytes(buf);
      assertNoSecretsInText(buf.toString("utf8"));
      if (buf.length > MAX_PAYLOAD_BYTES) {
        const e = new Error("CORRECTIVE_EVIDENCE_PAYLOAD_TOO_LARGE");
        e.code = "CORRECTIVE_EVIDENCE_PAYLOAD_TOO_LARGE";
        throw e;
      }
      return { bytes: buf, sha256: sha256Buffer(buf), evidence: sanitized };
    }
    function encodeEvidenceFrame(evidence) {
      const { bytes, sha256, evidence: sanitized } = materializeCanonicalEvidenceBytes(evidence);
      const frame = `${PROTOCOL_PREFIX}${base64UrlEncode(bytes)}
`;
      const frameBytes = Buffer.from(frame, "utf8");
      if (frameBytes.includes(13)) {
        const e = new Error("CORRECTIVE_EVIDENCE_FRAME_CRLF");
        e.code = "CORRECTIVE_EVIDENCE_FRAME_CRLF";
        throw e;
      }
      return { frameText: frame, frameBytes, payloadBytes: bytes, sha256, evidence: sanitized };
    }
    function extractEvidenceFrame(stdoutBufOrText) {
      const text = Buffer.isBuffer(stdoutBufOrText) ? stdoutBufOrText.toString("utf8") : String(stdoutBufOrText || "");
      const cleaned = text.replace(/^\uFEFF/, "");
      if (cleaned.includes("\r")) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_CRLF", phase: "evidence_extract" };
      }
      const lines = cleaned.split("\n");
      while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      const frames = lines.filter((l) => l.startsWith(PROTOCOL_PREFIX));
      const nonFrames = lines.filter((l) => !l.startsWith(PROTOCOL_PREFIX) && l.length > 0);
      if (frames.length === 0) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_MISSING", phase: "evidence_extract" };
      }
      if (frames.length > 1) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_MULTIPLE", phase: "evidence_extract" };
      }
      if (nonFrames.length > 0) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_STDOUT_POLLUTED", phase: "evidence_extract" };
      }
      const payload = frames[0].slice(PROTOCOL_PREFIX.length);
      if (!payload) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_INCOMPLETE_FRAME", phase: "evidence_extract" };
      }
      let buf;
      try {
        buf = base64UrlDecode(payload);
      } catch (err) {
        return {
          ok: false,
          code: err.code || "CORRECTIVE_EVIDENCE_BASE64URL_INVALID",
          phase: "evidence_extract"
        };
      }
      try {
        assertCanonicalJsonBytes(buf);
        assertNoSecretsInText(buf.toString("utf8"));
      } catch (err) {
        return { ok: false, code: err.code || "CORRECTIVE_EVIDENCE_BYTES", phase: "evidence_extract" };
      }
      let obj;
      try {
        obj = JSON.parse(buf.toString("utf8"));
      } catch {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_JSON_INVALID", phase: "evidence_extract" };
      }
      const schema = validateCorrectiveDryRunEvidenceSchema(obj);
      if (!schema.ok) {
        return { ok: false, code: schema.code, phase: schema.phase || "schema" };
      }
      return {
        ok: true,
        evidence: obj,
        payloadBytes: buf,
        sha256: sha256Buffer(buf),
        bytes: buf.length
      };
    }
    function writeEvidenceFrameToStdout2(evidence) {
      const encoded = encodeEvidenceFrame(evidence);
      process.stdout.write(encoded.frameBytes);
      return encoded;
    }
    function retainCanonicalEvidenceFile(stdoutBufOrText, destPath) {
      const extracted = extractEvidenceFrame(stdoutBufOrText);
      if (!extracted.ok) {
        return {
          ok: false,
          code: extracted.code,
          phase: extracted.phase,
          verdict: "CORRECTIVE_EVIDENCE_FRAME_INVALID"
        };
      }
      const beforeSha = extracted.sha256;
      const beforeBytes = extracted.bytes;
      fs.writeFileSync(destPath, extracted.payloadBytes);
      const after = fs.readFileSync(destPath);
      const afterSha = sha256Buffer(after);
      if (afterSha !== beforeSha || after.length !== beforeBytes) {
        try {
          fs.unlinkSync(destPath);
        } catch {
        }
        return {
          ok: false,
          code: "CORRECTIVE_EVIDENCE_BYTE_MISMATCH",
          phase: "evidence_retain",
          verdict: "CORRECTIVE_EVIDENCE_FRAME_INVALID"
        };
      }
      return {
        ok: true,
        path: destPath,
        sha256: afterSha,
        bytes: after.length,
        evidence: extracted.evidence,
        before_sha256: beforeSha,
        after_sha256: afterSha
      };
    }
    function loadAuthorityPinsFromAuth(auth) {
      const pre = auth && auth.precondition_publication || {};
      const live = auth && auth.pre_apply_live_publication || {};
      return {
        published_precondition_evidence: {
          protocol: pre.protocol || null,
          status: pre.status || null,
          evidence_path: pre.evidence_path || null,
          evidence_source_commit: pre.evidence_source_commit || null,
          evidence_blob_oid: String(pre.evidence_blob_oid || "").toLowerCase() || null,
          evidence_sha256: String(pre.evidence_sha256 || "").toLowerCase() || null,
          evidence_bytes: pre.evidence_bytes != null ? pre.evidence_bytes : null,
          valid_from_utc: pre.valid_from_utc || null,
          valid_until_utc: pre.valid_until_utc || null
        },
        published_pre_apply_evidence: {
          protocol: live.protocol || null,
          status: live.status || null,
          evidence_path: live.evidence_path || null,
          evidence_source_commit: live.evidence_source_commit || null,
          evidence_blob_oid: String(live.evidence_blob_oid || "").toLowerCase() || null,
          evidence_sha256: String(live.evidence_sha256 || "").toLowerCase() || null,
          evidence_bytes: live.evidence_bytes != null ? live.evidence_bytes : null,
          valid_from_utc: live.valid_from_utc || null,
          valid_until_utc: live.valid_until_utc || null,
          apply_authorized: live.apply_authorized === true
        },
        collection_authority_triad: {
          authorized_executable_commit: String(
            pre.authorized_executable_commit || live.authorized_executable_commit || ""
          ).toLowerCase(),
          authorization_publication_commit: String(
            pre.authorization_publication_commit || live.authorization_publication_commit || ""
          ).toLowerCase(),
          authorization_publication_blob_oid: String(
            pre.authorization_publication_blob_oid || live.authorization_publication_blob_oid || ""
          ).toLowerCase()
        },
        evidence_source_commit: pre.evidence_source_commit || live.evidence_source_commit || null,
        pin_publication_identities: {
          precondition_blob_oid: String(pre.evidence_blob_oid || "").toLowerCase() || null,
          pre_apply_blob_oid: String(live.evidence_blob_oid || "").toLowerCase() || null
        }
      };
    }
    function embeddedCaIdentity() {
      const loaded = loadOfficialEmbeddedCa();
      return {
        module: "scripts/security/embedded-supabase-prod-ca-2021.js",
        subject: "Supabase Root 2021 CA",
        der_sha256: loaded.der_sha256,
        pem_sha256: loaded.pem_sha256,
        bytes: loaded.bytes,
        official_der_sha256_constant: OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256
      };
    }
    function sealCorrectiveDryRunEvidence2(partial, auth, options = {}) {
      const executionTip = String(
        partial.bundle_authority && partial.bundle_authority.commit || options.executionTip || ""
      ).toLowerCase();
      const pins = loadAuthorityPinsFromAuth(auth || {});
      const bundle = partial.bundle_authority || {};
      const contacted = partial.advisory_lock_acquired === true || partial.productionContact === true;
      const sealed = {
        protocol: PROTOCOL_ID,
        schema_version: SCHEMA_VERSION,
        package: "ra-pro-accounting-automation-corrective-apply",
        mode: "dry-run",
        evidence_source: partial.evidence_source || "sealed_applicator",
        authorization_scope: "corrective_dry_run",
        execution_tip: executionTip,
        dry_run_authorization: {
          publication_commit: String(
            options.dryRunAuthorizationPublication || partial.dry_run_authorization && partial.dry_run_authorization.publication_commit || ""
          ).toLowerCase(),
          authorization_publication_blob_oid: String(
            options.dryRunAuthorizationBlobOid || partial.dry_run_authorization && partial.dry_run_authorization.authorization_publication_blob_oid || ""
          ).toLowerCase(),
          authorized_executable_commit: executionTip,
          attempt_id: String(
            options.dryRunAttemptId || partial.dry_run_authorization && partial.dry_run_authorization.attempt_id || ""
          ),
          bundle_oid: String(
            partial.dry_run_authorization && partial.dry_run_authorization.bundle_oid || bundle.oid || ""
          ).toLowerCase()
        },
        project_ref: EXPECTED_PROJECT_REF,
        database_url_env: DATABASE_URL_ENV2,
        feature_flag_env: FEATURE_FLAG_ENV,
        feature_flag_touched: partial.feature_flag_touched === true,
        automation_enabled: false,
        provider_writes: false,
        apply_authorization_status: "UNPUBLISHED",
        apply_authorized: false,
        retry_attempted: false,
        artifact_commit: partial.artifact_commit || null,
        advisory_lock: partial.advisory_lock || null,
        history_contract: partial.history_contract || {
          prior: PRIOR_HISTORY_COUNT,
          post: POST_HISTORY_COUNT
        },
        bundle: {
          path: bundle.path || STANDALONE_BUNDLE_PATH,
          oid: String(bundle.oid || "").toLowerCase(),
          sha256: String(bundle.sha256 || "").toLowerCase(),
          bytes: bundle.bytes
        },
        corrective_migrations: (partial.source_authority && partial.source_authority.length ? partial.source_authority : MIGRATIONS).map((m) => ({
          version: m.version,
          name: m.name || MIGRATIONS[0].name,
          path: m.path || MIGRATIONS[0].path,
          oid: String(m.oid || "").toLowerCase(),
          sha256: String(m.sha256 || "").toLowerCase(),
          bytes: m.bytes
        })),
        original_migrations_verify_only: ORIGINAL_COMMITTED_MIGRATIONS.map((m) => ({
          version: m.version,
          name: m.name,
          path: m.path,
          oid: m.oid,
          sha256: m.sha256,
          bytes: m.bytes
        })),
        ...pins,
        embedded_ca: embeddedCaIdentity(),
        databaseConnectionAttempts: Number(partial.databaseConnectionAttempts || 0),
        sqlApplicationAttempts: Number(partial.sqlApplicationAttempts || 0),
        migration_sql_attempts: Number(partial.migration_sql_attempts || 0),
        productionContact: partial.productionContact === true,
        read_only: true,
        transaction_mutation: false,
        transaction: {
          began: contacted,
          advisory_lock_acquired: partial.advisory_lock_acquired === true,
          rolled_back: contacted,
          advisory_lock_released_by_rollback: contacted
        },
        uri_diagnostics: partial.uri_diagnostics || null,
        schema_probes: partial.schema_probes || null,
        prior_history_count: partial.prior_history_count,
        evidence_gates: partial.evidence_gates || null,
        verdict: partial.verdict || "DRY_RUN_BLOCKED",
        result_code: partial.result_code || partial.verdict || "DRY_RUN_BLOCKED",
        error: partial.error,
        error_code: partial.error_code,
        phase: partial.phase,
        tooling_authorization_path: TOOLING_AUTHORIZATION_PATH
      };
      if (partial.producer_cleanup && typeof partial.producer_cleanup === "object" && !Array.isArray(partial.producer_cleanup)) {
        sealed.producer_cleanup = partial.producer_cleanup;
      }
      return sanitizeEvidenceValue(sealed);
    }
    module2.exports = {
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      MAX_PAYLOAD_BYTES,
      PROTOCOL_ID,
      PROTOCOL_PREFIX,
      SAFE_METADATA_KEYS,
      SCHEMA_VERSION,
      assertCanonicalJsonBytes,
      assertNoSecretsInText,
      encodeEvidenceFrame,
      extractEvidenceFrame,
      materializeCanonicalEvidenceBytes,
      retainCanonicalEvidenceFile,
      sanitizeEvidenceValue,
      sealCorrectiveDryRunEvidence: sealCorrectiveDryRunEvidence2,
      sha256Buffer,
      validateCorrectiveDryRunEvidenceSchema,
      writeEvidenceFrameToStdout: writeEvidenceFrameToStdout2
    };
  }
});

// scripts/security/apply-ra-pro-accounting-automation-corrective.js
var {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  EVIDENCE_PIN_AUTHORITY_COMMIT
} = require_ra_pro_accounting_automation_corrective_apply_constants();
var { runApplicator } = require_ra_pro_accounting_automation_corrective_apply_core();
var {
  sealCorrectiveDryRunEvidence,
  writeEvidenceFrameToStdout
} = require_ra_pro_accounting_automation_corrective_evidence();
var {
  loadEvidencePinAuthority
} = require_ra_pro_accounting_automation_corrective_apply_authorization();
var {
  assertDryRunAuthorizedBeforeCredentials,
  recheckDryRunAuthorizationPin
} = require_ra_pro_accounting_automation_corrective_dry_run_authorization();
function readFlags(raw) {
  const flags = {
    apply: false,
    dryRun: false,
    unknown: false,
    executableCommit: null,
    evidenceAuthorityCommit: null,
    dryRunAuthorizationPublication: null,
    expectAuthorizationBlobOid: null,
    expectExecutable: null,
    expectBundleOid: null,
    expectAttemptId: null
  };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--executable-commit") {
      flags.expectExecutable = raw[i + 1] || null;
      flags.executableCommit = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--evidence-authority-commit") {
      flags.evidenceAuthorityCommit = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--dry-run-authorization-publication") {
      flags.dryRunAuthorizationPublication = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-authorization-blob-oid") {
      flags.expectAuthorizationBlobOid = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-executable") {
      flags.expectExecutable = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-bundle-oid") {
      flags.expectBundleOid = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-attempt-id") {
      flags.expectAttemptId = raw[i + 1] || null;
      i += 1;
    } else flags.unknown = true;
  }
  return flags;
}
async function main() {
  const flags = readFlags(process.argv.slice(2));
  if (flags.unknown) {
    process.stderr.write(`${JSON.stringify({ blocked: "UNKNOWN_ARGV", apply_authorized: false })}
`);
    process.exitCode = 1;
    return;
  }
  const apply = flags.apply;
  const dryRun = flags.dryRun || !apply;
  const mode = apply && !dryRun ? "apply" : "dry-run";
  let dryRunMap = null;
  if (mode === "dry-run") {
    const hasFullPin = flags.dryRunAuthorizationPublication && flags.expectAuthorizationBlobOid && flags.expectExecutable && flags.expectBundleOid && flags.expectAttemptId;
    if (!hasFullPin) {
      process.stdout.write(
        `${JSON.stringify({
          verdict: "DRY_RUN_BLOCKED",
          error_code: "DRY_RUN_AUTHORIZATION_REQUIRED",
          error: "DRY_RUN_AUTHORIZATION_REQUIRED: validated dry-run authorization publication pin required; --executable-commit alone is not authority",
          apply_authorized: false,
          productionContact: false,
          databaseConnectionAttempts: 0
        })}
`
      );
      process.exit(1);
    }
    dryRunMap = assertDryRunAuthorizedBeforeCredentials({
      cwd: process.cwd(),
      publicationCommit: flags.dryRunAuthorizationPublication,
      env: process.env
    });
    recheckDryRunAuthorizationPin({
      cwd: process.cwd(),
      expectExecutable: flags.expectExecutable,
      expectCommit: flags.dryRunAuthorizationPublication,
      expectBlobOid: flags.expectAuthorizationBlobOid,
      expectBundleOid: flags.expectBundleOid,
      expectAttemptId: flags.expectAttemptId
    });
    if (dryRunMap.authorized_executable_commit !== String(flags.expectExecutable).toLowerCase()) {
      process.stdout.write(
        `${JSON.stringify({
          verdict: "DRY_RUN_BLOCKED",
          error_code: "DRY_RUN_AUTHORIZATION_PIN_MISMATCH",
          error: "expect-executable does not match authorization map",
          productionContact: false
        })}
`
      );
      process.exitCode = 1;
      return;
    }
  }
  const result = await runApplicator({
    mode,
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_TOKEN,
    env: process.env,
    argv: process.argv,
    executableCommit: dryRunMap && dryRunMap.authorized_executable_commit || flags.expectExecutable || void 0,
    evidenceAuthorityCommit: flags.evidenceAuthorityCommit || void 0,
    dryRunAuthorizationMap: dryRunMap || void 0,
    publicationCommit: flags.dryRunAuthorizationPublication || void 0
  });
  if (mode === "dry-run") {
    if (result.verdict === "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") {
      let auth = {};
      try {
        const loaded = loadEvidencePinAuthority({
          cwd: process.cwd(),
          evidenceAuthorityCommit: flags.evidenceAuthorityCommit || EVIDENCE_PIN_AUTHORITY_COMMIT,
          env: process.env
        });
        auth = loaded.auth;
      } catch (err) {
        process.stderr.write(
          `${JSON.stringify({
            phase: "auth_load",
            error: String(err && err.message ? err.message : err),
            code: err && err.code ? err.code : void 0
          })}
`
        );
        process.exitCode = 1;
        return;
      }
      const sealed = sealCorrectiveDryRunEvidence(result, auth, {
        executionTip: result.bundle_authority && result.bundle_authority.commit,
        evidenceAuthorityCommit: EVIDENCE_PIN_AUTHORITY_COMMIT,
        dryRunAuthorizationPublication: flags.dryRunAuthorizationPublication,
        dryRunAuthorizationBlobOid: flags.expectAuthorizationBlobOid,
        dryRunAttemptId: flags.expectAttemptId
      });
      writeEvidenceFrameToStdout(sealed);
    } else {
      process.stdout.write(`${JSON.stringify(result)}
`);
    }
  } else {
    process.stdout.write(`${JSON.stringify(result)}
`);
  }
  if (result.verdict !== "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" && result.verdict !== "APPLY_COMMITTED") {
    process.exitCode = 1;
  }
}
main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({
      verdict: "BLOCKED",
      reason: err.code || "CLI_FAILURE",
      error: String(err && err.message ? err.message : err),
      database_url_env: DATABASE_URL_ENV,
      token_required_for_apply: APPLY_AUTHORIZATION_TOKEN ? true : false
    })}
`
  );
  process.exitCode = 1;
});
