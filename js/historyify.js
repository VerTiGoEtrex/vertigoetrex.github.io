jQuery(document).ready(function() {
  var siteUrl = 'http://'+(document.location.hostname||document.location.host);

  //  Catch all internally-focused links and push a new state.
  //  Note: External links will not be affected by this behavior.
  $(document).delegate('a[href^="/"],a[href^="'+siteUrl+'"]', "click", function(e) {
    e.preventDefault();
    History.pushState({}, "", this.pathname);
  });

  History.Adapter.bind(window, 'statechange', function(){
    var State = History.getState();
    $.get(State.url, function(data){
      var title = data.match(/<title>(.*?)<\/title>/)[1];
      document.title = title;
      $('.page-content').html($(data).find('.page-content').children(":first"));
      ga('send', 'pageview', {
        page: State.url,
        title: title
      });
    });
  });
});
