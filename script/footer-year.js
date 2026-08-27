/**
 * Site branding and footer year.
 *
 * Update company name and tagline in SITE_BRAND below and on each page's
 * <html data-site-company data-site-tagline> attributes.
 *
 * TAGLINE is a temporary placeholder until the client approves a final version.
 */
(function () {
  var SITE_BRAND = {
    companyName: 'RYB Construction Company',
    tagline: 'Building With Care. Built to Last.'
  };

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.documentElement;
    var companyName = root.getAttribute('data-site-company') || SITE_BRAND.companyName;
    var tagline = root.getAttribute('data-site-tagline') || SITE_BRAND.tagline;

    document.querySelectorAll('.js-site-tagline').forEach(function (node) {
      node.textContent = tagline;
    });
    document.querySelectorAll('.js-company-name').forEach(function (node) {
      node.textContent = companyName;
    });

    var yearNodes = document.querySelectorAll('.js-site-year, .js-consar-year');
    var currentYear = String(new Date().getFullYear());
    yearNodes.forEach(function (node) {
      node.textContent = currentYear;
    });
  });
})();
