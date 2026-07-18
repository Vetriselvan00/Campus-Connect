const COLLEGE_EMAIL_PATTERN = /^[0-9]{10}@student\.annauniv\.edu$/i;

function isCollegeEmail(email) {
  return COLLEGE_EMAIL_PATTERN.test(String(email || "").trim());
}

function pickDefined(source, keys) {
  return keys.reduce((accumulator, key) => {
    if (source[key] !== undefined) {
      accumulator[key] = source[key];
    }

    return accumulator;
  }, {});
}

module.exports = { COLLEGE_EMAIL_PATTERN, isCollegeEmail, pickDefined };
