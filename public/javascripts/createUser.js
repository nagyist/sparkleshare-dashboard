
    $("#login").focus(function() {
      $("#loginlabel").fadeOut();
    });
    $("#login").blur(function() {
      if ($("#login").val().length == 0) {
        $("#loginlabel").fadeIn();
      }
    });
    $("#passwd1").focus(function() {
      $("#passwd1label").fadeOut();
    });
    $("#passwd1").blur(function() {
      if ($("#passwd1").val().length == 0) {
        $("#passwd1label").fadeIn();
      }
    });
    $("#passwd2").focus(function() {
      $("#passwd2label").fadeOut();
    });
    $("#passwd2").blur(function() {
      if ($("#passwd2").val().length == 0) {
        $("#passwd2label").fadeIn();
      }
    });
    $("#realname").focus(function() {
      $("#realnamelabel").fadeOut();
    });
    $("#realname").blur(function() {
      if ($("#realname").val().length == 0) {
        $("#realnamelabel").fadeIn();
      }
    });

    $(function() {
      if ($("#login").val().length != 0) {
        $("#loginlabel").hide();
      }
      if ($("#passwd1").val().length != 0) {
        $("#passwd1label").hide();
      }
      if ($("#passwd2").val().length != 0) {
        $("#passwd2label").hide();
      }
      if ($("#realname").val().length != 0) {
        $("#realnamelabel").hide();
      }
    });
