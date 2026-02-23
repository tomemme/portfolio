(function () {
  var measurementId = "G-YHZQJ4Y6Y1";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    dataLayer.push(arguments);
  };

  var pageNameMeta = document.querySelector('meta[name="ga-page-name"]');
  var pageGroupMeta = document.querySelector('meta[name="ga-page-group"]');

  var pageName = pageNameMeta && pageNameMeta.content
    ? pageNameMeta.content.trim()
    : document.title;

  var pageGroup = pageGroupMeta && pageGroupMeta.content
    ? pageGroupMeta.content.trim()
    : "Website";

  gtag("js", new Date());

  // Disable the default page_view so we can control naming consistently.
  gtag("config", measurementId, { send_page_view: false });

  gtag("event", "page_view", {
    page_title: pageName,
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_group: pageGroup
  });
})();
