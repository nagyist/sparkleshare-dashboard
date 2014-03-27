  $(function() {
    function updateQr() {
      var lqr = $('#linkqr');
      if (lqr.data('state') != 'updating') {
        lqr.data('state', 'updating');
        lqr.html('<img src="#{basepath}/images/throbber.gif" alt="loading"/>');
        $('#linkcode').html('-----');
        $('#timeleft').html('?');

        $.ajax({
          url: "#{basepath}/getLinkCode",
          dataType: 'json',
          success: function(data) {
            $('#linkqr').html('');
            $('#linkcode').html(data.code);
            $('#timeleft').html(data.validFor);
            append_qrcode(4, 'linkqr', 'SSHARE:' + data.url + '#' + data.code);
            $('#linkqr').data('validLeft', data.validFor);
            lqr.data('state', 'updated');
          }
        });
      }
    }

    function checkForUpdateQr() {
      var vl = $('#linkqr').data('validLeft');
      if (!vl || vl <= 1) {
        updateQr();
      } else {
        $('#linkqr').data('validLeft', vl - 1);
        $('#timeleft').html(vl - 1);
      }
    }

    checkForUpdateQr();
    setInterval(function() {
      checkForUpdateQr();
    }, 1000);
  });
