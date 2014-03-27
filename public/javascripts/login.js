    function hideLabelForAutocomplete() {
      if ($("#login").val().length != 0) {
        $("#loginlabel").hide();
      }
      if ($("#password").val().length != 0) {
        $("#passwordlabel").hide();
      }

      setTimeout(function() {
        hideLabelForAutocomplete();
      }, 300);
    }

    $("#login").focus(function() {
      $("#loginlabel").fadeOut();
    });
    $("#login").blur(function() {
      if ($("#login").val().length == 0) {
        $("#loginlabel").fadeIn();
      }
    });
    $("#password").focus(function() {
      $("#passwordlabel").fadeOut();
    });
    $("#password").blur(function() {
      if ($("#password").val().length == 0) {
        $("#passwordlabel").fadeIn();
      }
    });

    $(function() {
      hideLabelForAutocomplete();
    });
