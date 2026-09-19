#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// scripts/security/ra-pro-accounting-automation-apply-constants.js
var require_ra_pro_accounting_automation_apply_constants = __commonJS({
  "scripts/security/ra-pro-accounting-automation-apply-constants.js"(exports2, module2) {
    "use strict";
    var ARTIFACT_COMMIT = "85ae600be8ef8ef3498703bf480f8148d6fe0971";
    var EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
    var DATABASE_URL_ENV2 = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL";
    var APPLY_AUTHORIZATION_TOKEN2 = "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_APPLY_20260917";
    var FORBIDDEN_DATABASE_URL_ENVS = Object.freeze([
      "DATABASE_URL",
      "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
      "CONTAINMENT_APPLY_DATABASE_URL",
      "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
    ]);
    var FEATURE_FLAG_ENV = "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION";
    var ADVISORY_LOCK = Object.freeze({
      name: "RA_PRO_ACCOUNTING_AUTOMATION_APPLY",
      key1: 1380008257,
      // RAAA
      key2: 539363607
    });
    var PRIOR_HISTORY_COUNT = 188;
    var POST_HISTORY_COUNT = 190;
    var MIGRATIONS = Object.freeze([
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
    var TOOLING_AUTHORIZATION_PATH = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
    var STANDALONE_BUNDLE_PATH = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";
    var EXPECTED_STANDALONE_BUNDLE_SHA256 = "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";
    var STANDALONE_BUNDLE_OID = "PENDING_BUNDLE_OID_PLACEHOLDER_000000000000";
    var STANDALONE_BUNDLE_SHA256 = "PENDING_BUNDLE_SHA256_PLACEHOLDER_00000000000000000000000000000000";
    var STANDALONE_BUNDLE_BYTES = 0;
    var SELF_AUTHORITY_MODULES = Object.freeze([
      "scripts/security/apply-ra-pro-accounting-automation.js",
      "scripts/security/ra-pro-accounting-automation-apply-core.js",
      "scripts/security/ra-pro-accounting-automation-apply-constants.js",
      "scripts/security/git-blob-authority.js",
      "scripts/security/verify-ra-pro-accounting-automation-apply-authority.js"
    ]);
    module2.exports = {
      ADVISORY_LOCK,
      APPLY_AUTHORIZATION_TOKEN: APPLY_AUTHORIZATION_TOKEN2,
      ARTIFACT_COMMIT,
      DATABASE_URL_ENV: DATABASE_URL_ENV2,
      EXPECTED_PROJECT_REF,
      EXPECTED_STANDALONE_BUNDLE_SHA256,
      FEATURE_FLAG_ENV,
      FORBIDDEN_DATABASE_URL_ENVS,
      MIGRATIONS,
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
    var { X509Certificate } = require("node:crypto");
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

// scripts/security/ra-pro-accounting-automation-precondition-gates.js
var require_ra_pro_accounting_automation_precondition_gates = __commonJS({
  "scripts/security/ra-pro-accounting-automation-precondition-gates.js"(exports2, module2) {
    "use strict";
    var { loadAndVerifyGitBlob } = require_git_blob_authority();
    var PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1";
    var EXPECTED_HEAD = "21c48f1a8643ddf7b4f1e2c9b1942a41d92403b5";
    var EXPECTED_PRODUCTION_COMMIT = "854fd2920cd1c77a411918a617d10a8fb3ce591d";
    var EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
    function blocked(code, message) {
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      error.phase = "precondition_evidence";
      return error;
    }
    function assertExact(value, expected, code, label) {
      if (value !== expected) throw blocked(code, `${label} mismatch`);
    }
    function assertNoOverride(inputs = {}) {
      const env = inputs.env || process.env;
      if (inputs.preconditionEvidencePath) {
        throw blocked("PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
      }
      for (const key of [
        "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
        "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256"
      ]) {
        if (Object.prototype.hasOwnProperty.call(env, key)) {
          throw blocked("PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
        }
      }
    }
    function validateEvidence(evidence, now = /* @__PURE__ */ new Date()) {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
        throw blocked("PRECONDITION_EVIDENCE_SCHEMA_INVALID", "root must be an object");
      }
      assertExact(evidence.protocol, PROTOCOL, "PRECONDITION_EVIDENCE_PROTOCOL_MISMATCH", "protocol");
      assertExact(evidence.schema_version, 1, "PRECONDITION_EVIDENCE_SCHEMA_INVALID", "schema_version");
      const validFrom = Date.parse(evidence.valid_from_utc);
      const validUntil = Date.parse(evidence.valid_until_utc);
      const collectedAt = Date.parse(evidence.collected_at_utc);
      const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
      if (![validFrom, validUntil, collectedAt, nowMs].every(Number.isFinite)) {
        throw blocked("PRECONDITION_EVIDENCE_TIME_INVALID", "timestamps must be valid UTC instants");
      }
      if (validFrom > nowMs) {
        throw blocked("PRECONDITION_EVIDENCE_START_NOT_UNEXPIRED", "valid_from is in the future");
      }
      if (nowMs >= validUntil) {
        throw blocked("PRECONDITION_EVIDENCE_EXPIRED", "valid_until is not after gate time");
      }
      if (collectedAt < validFrom || collectedAt >= validUntil) {
        throw blocked("PRECONDITION_EVIDENCE_TIME_INVALID", "collection is outside validity window");
      }
      assertExact(evidence.authorization?.pr_number, 324, "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "PR");
      assertExact(evidence.authorization?.pr_head, EXPECTED_HEAD, "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "PR head");
      assertExact(evidence.authorization?.scope, "read_only_production_precondition_collection", "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "scope");
      assertExact(evidence.deployment?.production_state, "READY", "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "production state");
      assertExact(evidence.deployment?.production_commit, EXPECTED_PRODUCTION_COMMIT, "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "production commit");
      assertExact(evidence.deployment?.preview_state, "READY", "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "preview state");
      assertExact(evidence.deployment?.preview_commit, EXPECTED_HEAD, "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "preview commit");
      assertExact(evidence.automation_gate?.key, "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate key");
      assertExact(evidence.automation_gate?.production_presence, "absent", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate presence");
      assertExact(evidence.automation_gate?.effective_state, "closed", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate state");
      const db = evidence.database || {};
      assertExact(db.project_ref, EXPECTED_PROJECT_REF, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", "project_ref");
      assertExact(db.migration_history_count, 188, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", "history");
      for (const [key, expected] of Object.entries({
        weekly_version_count: 0,
        month_end_version_count: 0,
        linked_firms_count: 0,
        webhook_non_terminal_count: 0
      })) assertExact(db[key], expected, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", key);
      for (const key of [
        "weekly_runs_absent",
        "weekly_findings_absent",
        "weekly_persist_rpc_absent",
        "month_end_packages_absent",
        "month_end_persist_rpc_absent"
      ]) assertExact(db[key], true, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", key);
      assertExact(db.authorizing_inventory?.predicate, "review_assist_pro_active_and_complimentary", "PRECONDITION_EVIDENCE_INVENTORY_MISMATCH", "inventory predicate");
      for (const [key, expected] of Object.entries({ total: 4, company_owned: 3, firm_owned: 1, dual_owner: 0 })) {
        assertExact(db.authorizing_inventory?.[key], expected, "PRECONDITION_EVIDENCE_INVENTORY_MISMATCH", key);
      }
      const safety = evidence.safety || {};
      assertExact(safety.read_only, true, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "read_only");
      for (const key of ["production_writes", "sql_application_attempts", "dry_run_attempts", "migration_apply_attempts", "provider_writes"]) {
        assertExact(safety[key], 0, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", key);
      }
      assertExact(safety.automation_enabled, false, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "automation_enabled");
      assertExact(safety.merge_or_deploy_performed, false, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "merge_or_deploy_performed");
      return evidence;
    }
    function assertPreconditionEvidencePublished({ auth, cwd, now, env, preconditionEvidencePath } = {}) {
      assertNoOverride({ env, preconditionEvidencePath });
      const publication = auth?.precondition_publication;
      if (!publication || publication.status !== "PUBLISHED") {
        throw blocked("PRECONDITION_PINS_UNPUBLISHED", "precondition publication is not PUBLISHED");
      }
      for (const [key, pattern] of Object.entries({
        evidence_source_commit: /^[0-9a-f]{40}$/,
        evidence_blob_oid: /^[0-9a-f]{40}$/,
        evidence_sha256: /^[0-9a-f]{64}$/
      })) {
        if (!pattern.test(String(publication[key] || ""))) {
          throw blocked("PRECONDITION_PINS_INVALID", `${key} is not published`);
        }
      }
      if (!Number.isInteger(publication.evidence_bytes) || publication.evidence_bytes <= 0) {
        throw blocked("PRECONDITION_PINS_INVALID", "evidence_bytes is invalid");
      }
      const loaded = loadAndVerifyGitBlob({
        commit: publication.evidence_source_commit,
        path: publication.evidence_path,
        expectedOid: publication.evidence_blob_oid,
        expectedSha256: publication.evidence_sha256,
        expectedBytes: publication.evidence_bytes,
        cwd
      });
      if (loaded.buffer[loaded.buffer.length - 1] !== 10) {
        throw blocked("PRECONDITION_EVIDENCE_NEWLINE_INVALID", "single trailing LF required");
      }
      if (loaded.buffer.length > 1 && loaded.buffer[loaded.buffer.length - 2] === 10) {
        throw blocked("PRECONDITION_EVIDENCE_NEWLINE_INVALID", "multiple trailing newlines forbidden");
      }
      let evidence;
      try {
        evidence = JSON.parse(loaded.buffer.toString("utf8"));
      } catch {
        throw blocked("PRECONDITION_EVIDENCE_JSON_INVALID", "JSON parse failed");
      }
      validateEvidence(evidence, now || /* @__PURE__ */ new Date());
      return { protocol: PROTOCOL, oid: loaded.oid, sha256: loaded.sha256, bytes: loaded.bytes };
    }
    module2.exports = { PROTOCOL, assertPreconditionEvidencePublished, validateEvidence };
  }
});

// scripts/security/ra-pro-accounting-automation-apply-core.js
var require_ra_pro_accounting_automation_apply_core = __commonJS({
  "scripts/security/ra-pro-accounting-automation-apply-core.js"(exports2, module2) {
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
      EXPECTED_PROJECT_REF,
      EXPECTED_STANDALONE_BUNDLE_SHA256,
      FEATURE_FLAG_ENV,
      FORBIDDEN_DATABASE_URL_ENVS,
      MIGRATIONS,
      POST_HISTORY_COUNT,
      PRIOR_HISTORY_COUNT,
      STANDALONE_BUNDLE_BYTES,
      STANDALONE_BUNDLE_OID,
      STANDALONE_BUNDLE_PATH,
      STANDALONE_BUNDLE_SHA256,
      TOOLING_AUTHORIZATION_PATH
    } = require_ra_pro_accounting_automation_apply_constants();
    var {
      loadAndVerifyGitBlob,
      stripOuterBeginCommit,
      assertNoDropCascade,
      sha256Buffer,
      ROOT
    } = require_git_blob_authority();
    var {
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
      assertNoTlsBypass,
      buildProductionSsl,
      tlsPolicyError
    } = require_ra_pro_accounting_automation_tls_ca();
    var {
      assertPreconditionEvidencePublished
    } = require_ra_pro_accounting_automation_precondition_gates();
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
          if (key.includes("password") || key.includes("connectionstring") || key.includes("database_url") || key.includes("databaseurl") || key === "argv" || key === "config") {
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
    var HOST_CLASSES = /* @__PURE__ */ new Set([
      "direct",
      "session_pooler",
      "transaction_pooler",
      "loopback",
      "mismatched",
      "malformed"
    ]);
    var USERNAME_CLASSES = /* @__PURE__ */ new Set(["project_bound", "not_applicable", "mismatched", "absent"]);
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
      const hostClass = HOST_CLASSES.has(diagnostics.host_class) ? diagnostics.host_class : diagnostics.ok ? "mismatched" : "malformed";
      const usernameClass = USERNAME_CLASSES.has(diagnostics.username_class) ? diagnostics.username_class : "absent";
      return {
        ok: Boolean(diagnostics.ok),
        host_class: hostClass,
        username_class: usernameClass,
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
    function classificationParity(raw) {
      const diagnostics = classifyDatabaseUrl(raw);
      const parts = parsePostgresUrl(raw);
      return {
        ok: Boolean(diagnostics.ok),
        host_class: diagnostics.host_class || "malformed",
        username_class: diagnostics.username_class || "absent",
        is_local: Boolean(diagnostics.is_local),
        matches_expected_project_ref: Boolean(diagnostics.matches_expected_project_ref),
        database_name_match: Boolean(diagnostics.database_name_match),
        ssl_requirement_match: Boolean(diagnostics.ssl_requirement_match),
        port_class_match: Boolean(diagnostics.port_class_match),
        effective_port: parts && parts.effectivePort ? parts.effectivePort : 0
      };
    }
    function inspectNormalizedClient(raw) {
      const diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(raw));
      const accepted = Boolean(
        diagnostics && diagnostics.ok && (diagnostics.matches_expected_project_ref || diagnostics.is_local)
      );
      if (!accepted) return { accepted: false, uri_diagnostics: diagnostics };
      const config = buildPgClientConfig(raw);
      return {
        accepted: true,
        uri_diagnostics: diagnostics,
        client: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          ssl: config.ssl ? {
            rejectUnauthorized: config.ssl.rejectUnauthorized === true,
            servername: config.host,
            ca_der_sha256: OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
            hostname_verification: "enabled",
            min_version: "TLSv1.2"
          } : null
        }
      };
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
      if (clientConfig.ssl) {
        if (clientConfig.ssl.rejectUnauthorized === false) {
          throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: rejectUnauthorized false is forbidden");
        }
        if (Array.isArray(clientConfig.ssl.ca)) {
          throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden");
        }
        if (clientConfig.ssl.ca && clientConfig.ssl.ca !== ssl.ca) {
          throw tlsPolicyError(
            "BLOCKED_TLS_CA_PIN_MISMATCH",
            "BLOCKED_TLS_CA_PIN_MISMATCH: client CA does not match the sealed Supabase root"
          );
        }
        if (clientConfig.ssl.servername && clientConfig.ssl.servername !== clientConfig.host) {
          throw tlsPolicyError("HOSTNAME_MISMATCH", "HOSTNAME_MISMATCH: servername must equal the validated host");
        }
      }
      options.ssl = ssl;
      return options;
    }
    function resolveRepoRoot(inputs = {}) {
      if (inputs.cwd) return inputs.cwd;
      const candidates = [
        process.cwd(),
        ROOT,
        // Modular scripts live in scripts/security → ../..
        path.resolve(__dirname, "../.."),
        // Standalone bundle lives in scripts/security/bundles → ../../..
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
    function loadAuthorizationPackage(cwd = ROOT) {
      const abs = path.join(cwd, TOOLING_AUTHORIZATION_PATH);
      try {
        return JSON.parse(fs.readFileSync(abs, "utf8"));
      } catch (err) {
        const e = new Error("AUTHORIZATION_PACKAGE_UNREADABLE");
        e.code = "AUTHORIZATION_PINS_UNPUBLISHED";
        e.cause = err;
        throw e;
      }
    }
    function assertNoHarnessEnvOrArgv(inputs = {}) {
      const env = inputs.env || process.env;
      const forbiddenEnv = [
        "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_HARNESS",
        "ALLOW_UNPUBLISHED_FOR_HARNESS",
        "ALLOW_UNPUBLISHED_RA_PRO_ACCOUNTING_AUTOMATION",
        "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST",
        "ALLOW_LOCALHOST_FOR_HARNESS",
        "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST_FOR_HARNESS"
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
    function isPublishedHexOid(value) {
      return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
    }
    function isPublishedHexSha256(value) {
      return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value) && !value.startsWith("PENDING_");
    }
    function resolveBundleSeals(inputs = {}) {
      if (inputs.bundleSealsOverride) return inputs.bundleSealsOverride;
      const auth = loadAuthorizationPackage(resolveRepoRoot(inputs));
      const fromAuth = auth.standalone_bundle || {};
      const oid = fromAuth.oid || STANDALONE_BUNDLE_OID;
      const sha256 = fromAuth.sha256 || STANDALONE_BUNDLE_SHA256;
      const bytes = fromAuth.bytes != null ? fromAuth.bytes : STANDALONE_BUNDLE_BYTES;
      const bundlePath = fromAuth.path || STANDALONE_BUNDLE_PATH;
      return { path: bundlePath, oid, sha256, bytes, source: "tooling_authorization+constants" };
    }
    function assertBundleAuthority(inputs = {}) {
      assertNoHarnessEnvOrArgv(inputs);
      if (EXPECTED_STANDALONE_BUNDLE_SHA256 && !String(EXPECTED_STANDALONE_BUNDLE_SHA256).startsWith("PENDING_") && isPublishedHexSha256(EXPECTED_STANDALONE_BUNDLE_SHA256)) {
      } else if (EXPECTED_STANDALONE_BUNDLE_SHA256 && !String(EXPECTED_STANDALONE_BUNDLE_SHA256).startsWith("PENDING_")) {
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
      if (isPublishedHexOid(STANDALONE_BUNDLE_OID) && STANDALONE_BUNDLE_OID !== seals.oid) {
        const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: OID mismatch vs TOOLING_AUTHORIZATION");
        e.code = "BUNDLE_AUTHORITY_MISMATCH";
        e.phase = "bundle_authority";
        throw e;
      }
      if (isPublishedHexSha256(STANDALONE_BUNDLE_SHA256) && STANDALONE_BUNDLE_SHA256 !== seals.sha256) {
        const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: SHA-256 mismatch vs TOOLING_AUTHORIZATION");
        e.code = "BUNDLE_AUTHORITY_MISMATCH";
        e.phase = "bundle_authority";
        throw e;
      }
      if (Number.isInteger(STANDALONE_BUNDLE_BYTES) && STANDALONE_BUNDLE_BYTES > 0 && STANDALONE_BUNDLE_BYTES !== seals.bytes) {
        const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: bytes mismatch vs TOOLING_AUTHORIZATION");
        e.code = "BUNDLE_AUTHORITY_MISMATCH";
        e.phase = "bundle_authority";
        throw e;
      }
      const cwd = resolveRepoRoot(inputs);
      let commit = inputs.bundleAuthorityCommit;
      if (!commit) {
        try {
          commit = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd,
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
        } catch (err) {
          const e = new Error(`BUNDLE_AUTHORITY_GIT_HEAD_UNRESOLVED: ${err.message}`);
          e.code = "BUNDLE_AUTHORITY_MISMATCH";
          e.phase = "bundle_authority";
          throw e;
        }
      }
      try {
        const loaded = loadAndVerifyGitBlob({
          commit,
          path: seals.path,
          expectedOid: seals.oid,
          expectedSha256: seals.sha256,
          expectedBytes: seals.bytes,
          cwd
        });
        if (loaded.buffer.includes(13)) {
          const e = new Error("BUNDLE_NOT_LF_ONLY: committed blob contains CR");
          e.code = "BUNDLE_CRLF_FORBIDDEN";
          e.phase = "bundle_authority";
          throw e;
        }
        return {
          path: seals.path,
          oid: loaded.oid,
          sha256: loaded.sha256,
          bytes: loaded.bytes,
          commit,
          phase: "bundle_authority"
        };
      } catch (err) {
        if (err.code && String(err.code).startsWith("BUNDLE_")) throw err;
        const e = new Error(err.message || "BUNDLE_AUTHORITY_MISMATCH");
        e.code = err.code || "BUNDLE_AUTHORITY_MISMATCH";
        e.phase = "bundle_authority";
        e.cause = err;
        throw e;
      }
    }
    function assertAuthorizationPublished(inputs = {}) {
      assertNoHarnessEnvOrArgv(inputs);
      if (inputs.allowUnpublishedForHarness === true) return { harness_bypass: true };
      const auth = loadAuthorizationPackage(resolveRepoRoot(inputs));
      const pub = auth.publication || {};
      const unpublished = auth.publication?.status === "UNPUBLISHED" || pub.required_prior_dry_run_evidence_sha256 == null || pub.required_pre_apply_live_evidence_sha256 == null;
      if (unpublished) {
        const e = new Error(
          "AUTHORIZATION_PINS_UNPUBLISHED: prior-dry-run and pre-apply pins are null/UNPUBLISHED; apply remains unreachable"
        );
        e.code = "AUTHORIZATION_PINS_UNPUBLISHED";
        e.phase = "authorization";
        throw e;
      }
      return { harness_bypass: false, publication: pub };
    }
    var assertApplyAuthorizationPublished = assertAuthorizationPublished;
    function assertPublishedPrecondition(inputs = {}) {
      const cwd = resolveRepoRoot(inputs);
      const auth = loadAuthorizationPackage(cwd);
      return assertPreconditionEvidencePublished({
        auth,
        cwd,
        now: inputs.now,
        env: inputs.env || process.env,
        preconditionEvidencePath: inputs.preconditionEvidencePath
      });
    }
    function assertMigrationOrder(migrations = MIGRATIONS) {
      for (let i = 1; i < migrations.length; i += 1) {
        if (migrations[i].version <= migrations[i - 1].version) {
          const e = new Error(
            `MIGRATION_ORDER_INVALID: ${migrations[i].version} must follow ${migrations[i - 1].version}`
          );
          e.code = "MIGRATION_ORDER_INVALID";
          throw e;
        }
      }
      if (PRIOR_HISTORY_COUNT + migrations.length !== POST_HISTORY_COUNT) {
        const e = new Error("HISTORY_CONTRACT_INVALID");
        e.code = "HISTORY_CONTRACT_INVALID";
        throw e;
      }
    }
    function loadSealedMigrations(inputs = {}) {
      assertMigrationOrder();
      const commit = inputs.artifactCommit || ARTIFACT_COMMIT;
      const cwd = resolveRepoRoot(inputs);
      return MIGRATIONS.map((migration) => {
        const loaded = loadAndVerifyGitBlob({
          commit,
          path: migration.path,
          expectedOid: migration.oid,
          expectedSha256: migration.sha256,
          expectedBytes: migration.bytes,
          cwd
        });
        const fullSql = loaded.buffer.toString("utf8");
        assertNoDropCascade(fullSql);
        const innerSql = stripOuterBeginCommit(fullSql);
        return { migration, loaded, fullSql, innerSql };
      });
    }
    async function withClient(clientConfig, fn) {
      const options = scopedClientOptions(clientConfig);
      if (options.connectionString) {
        const e = new Error("MALFORMED_DATABASE_URL");
        e.code = "MALFORMED_DATABASE_URL";
        throw e;
      }
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
    async function captureHistoryManifest(client) {
      const { rows } = await client.query(`
    SELECT version, name, statements
    FROM supabase_migrations.schema_migrations
    ORDER BY version ASC
  `);
      return rows.map((r) => {
        const statements = r.statements || [];
        return {
          version: r.version,
          name: r.name,
          statement_count: statements.length,
          statements_digest: sha256Buffer(Buffer.from(statements.join("\n"), "utf8"))
        };
      });
    }
    function manifestsEqual(a, b) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (a[i].version !== b[i].version || a[i].name !== b[i].name || a[i].statement_count !== b[i].statement_count || a[i].statements_digest !== b[i].statements_digest) {
          return false;
        }
      }
      return true;
    }
    function buildEvidenceBase(inputs) {
      return {
        package: "ra-pro-accounting-automation-apply",
        mode: inputs.mode || "dry-run",
        artifact_commit: ARTIFACT_COMMIT,
        database_url_env: DATABASE_URL_ENV2,
        advisory_lock: ADVISORY_LOCK,
        history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
        migrations: MIGRATIONS.map((m) => ({ version: m.version, name: m.name, oid: m.oid })),
        feature_flag_env: FEATURE_FLAG_ENV,
        feature_flag_touched: false,
        sqlApplicationAttempts: 0,
        databaseConnectionAttempts: 0,
        productionContact: false
      };
    }
    function finalizeEvidence(evidence) {
      return sanitizeValue(evidence);
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
      if (Buffer.byteLength(stmts[0], "utf8") !== packed.loaded.bytes) {
        throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} byte length mismatch`);
      }
    }
    async function runDryRun(inputs = {}) {
      const evidence = buildEvidenceBase({ ...inputs, mode: "dry-run" });
      evidence.authorization_scope = "dry_run_precondition_only";
      evidence.migration_sql_attempts = 0;
      try {
        evidence.bundle_authority = assertBundleAuthority(inputs);
        evidence.databaseConnectionAttempts = 0;
        evidence.sqlApplicationAttempts = 0;
        evidence.precondition_evidence = assertPublishedPrecondition(inputs);
        assertFeatureFlagUntouched(inputs.env || process.env);
        const packed = loadSealedMigrations(inputs);
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
        evidence.databaseConnectionAttempts = 1;
        evidence.productionContact = inputs.allowLocalhostForHarness === true ? false : true;
        const versionsAbsent = [];
        await withClient(resolved.clientConfig, async (client) => {
          await client.query("BEGIN");
          await tryAdvisoryLock(client, inputs);
          evidence.advisory_lock_acquired = true;
          await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
          for (const p of packed) {
            await assertVersionAbsent(client, p.migration.version);
            versionsAbsent.push(p.migration.version);
          }
          evidence.prior_history_count = PRIOR_HISTORY_COUNT;
          evidence.versions_absent = versionsAbsent;
          await client.query("ROLLBACK");
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
      let clientConfig;
      let packed;
      let priorManifest = null;
      let commitPhase = "pre_commit";
      try {
        evidence.bundle_authority = assertBundleAuthority(inputs);
        evidence.databaseConnectionAttempts = 0;
        evidence.sqlApplicationAttempts = 0;
        evidence.authorization_scope = "apply_requires_prior_and_pre_apply_pins";
        evidence.precondition_evidence = assertPublishedPrecondition(inputs);
        evidence.apply_authorization = assertApplyAuthorizationPublished(inputs);
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
        packed = loadSealedMigrations(inputs);
        evidence.source_authority = packed.map((p) => ({
          version: p.migration.version,
          oid: p.loaded.oid,
          sha256: p.loaded.sha256,
          bytes: p.loaded.bytes
        }));
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
          for (const p of packed) await assertVersionAbsent(client, p.migration.version);
          await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
          priorManifest = await captureHistoryManifest(client);
          evidence.prior_history_count = priorManifest.length;
          if (inputs.injectFailure === "before_sql") {
            throw new Error("INJECTED_FAILURE_BEFORE_SQL");
          }
          evidence.sqlApplicationAttempts = packed.length;
          for (const p of packed) {
            if (inputs.injectFailure === "before_history" && p === packed[0]) {
              await client.query(p.innerSql);
              throw new Error("INJECTED_FAILURE_BEFORE_HISTORY");
            }
            await insertMigrationHistory(client, p);
            if (inputs.injectFailure === "after_first_history" && p === packed[0]) {
              throw new Error("INJECTED_FAILURE_AFTER_FIRST_HISTORY");
            }
          }
          const postManifest = await captureHistoryManifest(client);
          const priorOnly = postManifest.filter(
            (row) => !packed.some((p) => p.migration.version === row.version)
          );
          if (!manifestsEqual(priorOnly, priorManifest)) {
            throw new Error("PRIOR_HISTORY_MUTATION_DETECTED");
          }
          if (postManifest.length !== POST_HISTORY_COUNT) {
            throw new Error(
              `HISTORY_COUNT_AFTER_MISMATCH: got ${postManifest.length}, expected ${POST_HISTORY_COUNT}`
            );
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
          if (inputs.injectFailure === "after_commit_ack") {
            throw new IndeterminateCommitError("INJECTED_CONNECTION_LOSS_AFTER_COMMIT_ACK");
          }
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
        const uncertain = commitPhase === "committing" || commitPhase === "committed" || err instanceof IndeterminateCommitError;
        if (uncertain) {
          evidence.verdict = "INDETERMINATE_OUTCOME";
          evidence.result_code = "INDETERMINATE_OUTCOME";
          evidence.error = sanitizeError(err);
          evidence.error_code = "INDETERMINATE_OUTCOME";
          evidence.commit_phase = commitPhase;
          evidence.reconciliation = await reconcileAfterIndeterminate(
            clientConfig,
            packed,
            priorManifest
          );
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
    async function reconcileAfterIndeterminate(clientConfig, packed, priorManifest) {
      try {
        return await withClient(clientConfig, async (client) => {
          const versions = packed.map((p) => p.migration.version);
          const { rows } = await client.query(
            `SELECT version, statements FROM supabase_migrations.schema_migrations
         WHERE version = ANY($1::text[]) ORDER BY version`,
            [versions]
          );
          const count = (await client.query(`SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`)).rows[0].c;
          if (rows.length === packed.length && count === POST_HISTORY_COUNT) {
            const digestsOk = rows.every((row, idx) => {
              const stmts = row.statements || [];
              return stmts.length === 1 && sha256Buffer(Buffer.from(stmts[0], "utf8")) === packed[idx].loaded.sha256;
            });
            if (digestsOk) {
              return { outcome: "APPLIED_CONFIRMED_AFTER_RECONCILIATION", history_count: count };
            }
          }
          if (rows.length === 0 && count === PRIOR_HISTORY_COUNT) {
            return { outcome: "NOT_APPLIED_CONFIRMED", history_count: count };
          }
          return {
            outcome: "INDETERMINATE_NEEDS_OPERATOR",
            history_count: count,
            present_versions: rows.map((r) => r.version),
            prior_manifest_length: priorManifest ? priorManifest.length : null
          };
        });
      } catch (err) {
        return { outcome: "RECONCILIATION_FAILED", error: sanitizeError(err) };
      }
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
      assertApplyAuthorizationPublished,
      assertAuthorizationPublished,
      assertBundleAuthority,
      assertFeatureFlagUntouched,
      assertMigrationOrder,
      assertNoHarnessEnvOrArgv,
      assertPublishedPrecondition,
      classifyDatabaseUrl,
      classificationParity,
      buildPgClientConfig,
      inspectNormalizedClient,
      scopedClientOptions,
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

// scripts/security/apply-ra-pro-accounting-automation.js
var {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV
} = require_ra_pro_accounting_automation_apply_constants();
var { runApplicator } = require_ra_pro_accounting_automation_apply_core();
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  if (args.some((a) => a !== "--apply" && a !== "--dry-run")) {
    process.stderr.write(
      `${JSON.stringify({ verdict: "BLOCKED", reason: "UNKNOWN_ARGV" })}
`
    );
    process.exitCode = 1;
    return;
  }
  const result = await runApplicator({
    mode: apply && !dryRun ? "apply" : "dry-run",
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN,
    env: process.env,
    argv: process.argv
  });
  process.stdout.write(`${JSON.stringify(result)}
`);
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
